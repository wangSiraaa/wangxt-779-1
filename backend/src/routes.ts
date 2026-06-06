import { Router, Request, Response } from 'express';
import Cooperative from './models/Cooperative';
import PlotBoundary from './models/PlotBoundary';
import InspectionReport from './models/InspectionReport';
import AuthorizationCertificate from './models/AuthorizationCertificate';
import LabelUsage from './models/LabelUsage';
import PatrolRecord from './models/PatrolRecord';
import ProtectionZone from './models/ProtectionZone';
import {
  isPlotWithinProtectionZone,
  isReportExpired,
  generateCertificateNumber,
  hasAbnormalPatrolRecently
} from './services/businessRules';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', message: '农产品地理标志授权服务运行中' });
});

router.get('/protection-zones', async (_req: Request, res: Response) => {
  try {
    const zones = await ProtectionZone.find({ isActive: true });
    res.json(zones);
  } catch (error) {
    res.status(500).json({ error: '获取保护范围失败' });
  }
});

router.post('/cooperatives', async (req: Request, res: Response) => {
  try {
    const cooperative = new Cooperative(req.body);
    await cooperative.save();
    res.status(201).json(cooperative);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/cooperatives', async (_req: Request, res: Response) => {
  try {
    const cooperatives = await Cooperative.find().sort({ createdAt: -1 });
    res.json(cooperatives);
  } catch (error) {
    res.status(500).json({ error: '获取合作社列表失败' });
  }
});

router.get('/cooperatives/:id', async (req: Request, res: Response) => {
  try {
    const cooperative = await Cooperative.findById(req.params.id);
    if (!cooperative) {
      return res.status(404).json({ error: '合作社不存在' });
    }
    res.json(cooperative);
  } catch (error) {
    res.status(500).json({ error: '获取合作社信息失败' });
  }
});

router.post('/plot-boundaries/validate', async (req: Request, res: Response) => {
  try {
    const { coordinates } = req.body;
    const result = await isPlotWithinProtectionZone(coordinates);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/plot-boundaries', async (req: Request, res: Response) => {
  try {
    const { coordinates, cooperativeId, ...rest } = req.body;
    const validation = await isPlotWithinProtectionZone(coordinates);
    
    const plotBoundary = new PlotBoundary({
      ...rest,
      cooperativeId,
      coordinates,
      isWithinProtectionZone: validation.isWithin,
      validationResult: validation.message
    });
    await plotBoundary.save();
    res.status(201).json({
      plotBoundary,
      validation
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/plot-boundaries', async (req: Request, res: Response) => {
  try {
    const { cooperativeId } = req.query;
    const query = cooperativeId ? { cooperativeId } : {};
    const boundaries = await PlotBoundary.find(query).sort({ createdAt: -1 });
    res.json(boundaries);
  } catch (error) {
    res.status(500).json({ error: '获取地块列表失败' });
  }
});

router.post('/inspection-reports', async (req: Request, res: Response) => {
  try {
    const report = new InspectionReport(req.body);
    if (isReportExpired(report.validUntil)) {
      report.status = 'expired';
    }
    await report.save();
    res.status(201).json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/inspection-reports', async (req: Request, res: Response) => {
  try {
    const { cooperativeId } = req.query;
    const query = cooperativeId ? { cooperativeId } : {};
    const reports = await InspectionReport.find(query).sort({ createdAt: -1 });
    const now = new Date();
    const updatedReports = await Promise.all(
      reports.map(async (report) => {
        if (report.status === 'valid' && report.validUntil < now) {
          report.status = 'expired';
          await report.save();
        }
        return report;
      })
    );
    res.json(updatedReports);
  } catch (error) {
    res.status(500).json({ error: '获取检测报告列表失败' });
  }
});

router.post('/authorization-certificates/apply', async (req: Request, res: Response) => {
  try {
    const { cooperativeId, plotBoundaryId, inspectionReportId, variety, batchNumber } = req.body;

    const existingCert = await AuthorizationCertificate.findOne({
      cooperativeId,
      batchNumber
    });
    if (existingCert) {
      return res.status(400).json({
        error: '该批次已申请过授权证书，不能重复申请',
        code: 'DUPLICATE_BATCH'
      });
    }

    const plotBoundary = await PlotBoundary.findById(plotBoundaryId);
    if (!plotBoundary) {
      return res.status(404).json({ error: '地块不存在' });
    }
    if (!plotBoundary.isWithinProtectionZone) {
      return res.status(400).json({
        error: '地块不在保护范围内，无法授权',
        code: 'OUTSIDE_PROTECTION_ZONE'
      });
    }

    const report = await InspectionReport.findById(inspectionReportId);
    if (!report) {
      return res.status(404).json({ error: '检测报告不存在' });
    }
    if (isReportExpired(report.validUntil)) {
      return res.status(400).json({
        error: '检测报告已过期，请重新上传',
        code: 'REPORT_EXPIRED'
      });
    }

    const hasAbnormal = await hasAbnormalPatrolRecently(cooperativeId, 30);
    if (hasAbnormal) {
      return res.status(400).json({
        error: '近30天内存在巡查异常记录，新增用标登记已暂停',
        code: 'PATROL_ABNORMAL_SUSPENDED'
      });
    }

    const cooperative = await Cooperative.findById(cooperativeId);
    if (!cooperative) {
      return res.status(404).json({ error: '合作社不存在' });
    }
    if (cooperative.isSuspended) {
      return res.status(400).json({
        error: `合作社已被暂停授权：${cooperative.suspendReason || '原因未知'}`,
        code: 'COOPERATIVE_SUSPENDED'
      });
    }

    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const certificate = new AuthorizationCertificate({
      cooperativeId,
      plotBoundaryId,
      inspectionReportId,
      certificateNumber: generateCertificateNumber(),
      variety,
      batchNumber,
      status: 'pending',
      validFrom,
      validUntil
    });
    await certificate.save();

    res.status(201).json({
      message: '授权申请已提交，等待审核',
      certificate
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/authorization-certificates/:id/approve', async (req: Request, res: Response) => {
  try {
    const { approvedBy } = req.body;
    const certificate = await AuthorizationCertificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: '证书不存在' });
    }
    if (certificate.status !== 'pending') {
      return res.status(400).json({ error: '只有待审核状态的证书可以批准' });
    }

    certificate.status = 'approved';
    certificate.approvedAt = new Date();
    certificate.approvedBy = approvedBy || '系统管理员';
    await certificate.save();

    res.json({ message: '证书已批准', certificate });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/authorization-certificates/:id/reject', async (req: Request, res: Response) => {
  try {
    const { rejectReason } = req.body;
    const certificate = await AuthorizationCertificate.findById(req.params.id);
    if (!certificate) {
      return res.status(404).json({ error: '证书不存在' });
    }
    if (certificate.status !== 'pending') {
      return res.status(400).json({ error: '只有待审核状态的证书可以拒绝' });
    }

    certificate.status = 'rejected';
    certificate.rejectReason = rejectReason;
    await certificate.save();

    res.json({ message: '证书已拒绝', certificate });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/authorization-certificates', async (req: Request, res: Response) => {
  try {
    const { cooperativeId, status } = req.query;
    const query: any = {};
    if (cooperativeId) query.cooperativeId = cooperativeId;
    if (status) query.status = status;
    
    const certificates = await AuthorizationCertificate.find(query)
      .populate('cooperativeId', 'name')
      .populate('plotBoundaryId', 'name')
      .sort({ createdAt: -1 });
    res.json(certificates);
  } catch (error) {
    res.status(500).json({ error: '获取授权证书列表失败' });
  }
});

router.get('/authorization-certificates/:id', async (req: Request, res: Response) => {
  try {
    const certificate = await AuthorizationCertificate.findById(req.params.id)
      .populate('cooperativeId')
      .populate('plotBoundaryId')
      .populate('inspectionReportId');
    if (!certificate) {
      return res.status(404).json({ error: '证书不存在' });
    }
    res.json(certificate);
  } catch (error) {
    res.status(500).json({ error: '获取证书详情失败' });
  }
});

router.post('/label-usages', async (req: Request, res: Response) => {
  try {
    const { cooperativeId, certificateId, ...rest } = req.body;

    const hasAbnormal = await hasAbnormalPatrolRecently(cooperativeId, 30);
    if (hasAbnormal) {
      return res.status(400).json({
        error: '近30天内存在巡查异常记录，新增用标登记已暂停',
        code: 'PATROL_ABNORMAL_SUSPENDED'
      });
    }

    const cooperative = await Cooperative.findById(cooperativeId);
    if (!cooperative) {
      return res.status(404).json({ error: '合作社不存在' });
    }
    if (cooperative.isSuspended) {
      return res.status(400).json({
        error: '合作社已被暂停授权，无法登记用标',
        code: 'COOPERATIVE_SUSPENDED'
      });
    }

    const certificate = await AuthorizationCertificate.findById(certificateId);
    if (!certificate) {
      return res.status(404).json({ error: '授权证书不存在' });
    }
    if (certificate.status !== 'approved') {
      return res.status(400).json({ error: '只有已批准的证书可以登记用标' });
    }
    if (certificate.validUntil < new Date()) {
      return res.status(400).json({ error: '授权证书已过期' });
    }

    const labelUsage = new LabelUsage({
      ...rest,
      cooperativeId,
      certificateId
    });
    await labelUsage.save();

    res.status(201).json({ message: '用标登记成功', labelUsage });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/label-usages', async (req: Request, res: Response) => {
  try {
    const { cooperativeId } = req.query;
    const query = cooperativeId ? { cooperativeId } : {};
    const usages = await LabelUsage.find(query)
      .populate('certificateId', 'certificateNumber variety batchNumber')
      .sort({ createdAt: -1 });
    res.json(usages);
  } catch (error) {
    res.status(500).json({ error: '获取用标登记列表失败' });
  }
});

router.post('/patrol-records', async (req: Request, res: Response) => {
  try {
    const { cooperativeId, result, ...rest } = req.body;
    const patrolRecord = new PatrolRecord({
      ...rest,
      cooperativeId,
      result
    });
    await patrolRecord.save();

    if (result === 'abnormal' || result === 'warning') {
      const cooperative = await Cooperative.findById(cooperativeId);
      if (cooperative) {
        const count = await PatrolRecord.countDocuments({
          cooperativeId,
          result: { $in: ['abnormal', 'warning'] },
          patrolDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        });
        if (count >= 2 && !cooperative.isSuspended) {
          cooperative.isSuspended = true;
          cooperative.suspendReason = '多次巡查异常，自动暂停授权';
          cooperative.suspendDate = new Date();
          await cooperative.save();
        }
      }
    }

    res.status(201).json({ message: '巡查记录已保存', patrolRecord });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/patrol-records', async (req: Request, res: Response) => {
  try {
    const { cooperativeId } = req.query;
    const query = cooperativeId ? { cooperativeId } : {};
    const records = await PatrolRecord.find(query)
      .populate('cooperativeId', 'name')
      .sort({ patrolDate: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '获取巡查记录列表失败' });
  }
});

router.get('/dashboard/stats', async (_req: Request, res: Response) => {
  try {
    const totalCooperatives = await Cooperative.countDocuments();
    const suspendedCooperatives = await Cooperative.countDocuments({ isSuspended: true });
    const totalCertificates = await AuthorizationCertificate.countDocuments();
    const approvedCertificates = await AuthorizationCertificate.countDocuments({ status: 'approved' });
    const pendingCertificates = await AuthorizationCertificate.countDocuments({ status: 'pending' });
    const totalPatrols = await PatrolRecord.countDocuments();
    const abnormalPatrols = await PatrolRecord.countDocuments({ result: { $in: ['abnormal', 'warning'] } });

    const expiredReports = await InspectionReport.countDocuments({
      validUntil: { $lt: new Date() }
    });

    const recentPatrols = await PatrolRecord.find()
      .populate('cooperativeId', 'name')
      .sort({ patrolDate: -1 })
      .limit(10);

    const recentApplications = await AuthorizationCertificate.find()
      .populate('cooperativeId', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      statistics: {
        totalCooperatives,
        suspendedCooperatives,
        totalCertificates,
        approvedCertificates,
        pendingCertificates,
        totalPatrols,
        abnormalPatrols,
        expiredReports
      },
      recentPatrols,
      recentApplications
    });
  } catch (error) {
    res.status(500).json({ error: '获取看板数据失败' });
  }
});

export default router;
