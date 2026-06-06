import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { polygon, point } from '@turf/helpers';
import ProtectionZone from '../models/ProtectionZone';
import PlotBoundary from '../models/PlotBoundary';
import InspectionReport from '../models/InspectionReport';
import PatrolRecord from '../models/PatrolRecord';
import { ICoordinate } from '../models/PlotBoundary';
import { Types } from 'mongoose';

export interface IVerificationResult {
  success: boolean;
  verificationStatus: 'verified' | 'failed';
  verificationResult: {
    expiryValid: boolean;
    batchNumberMatched: boolean;
    plotCodeMatched: boolean;
    plotWithinZone: boolean;
    failureReasons: string[];
  };
}

export const verifyInspectionReport = async (
  reportId: string | Types.ObjectId,
  expectedBatchNumber?: string,
  expectedPlotCode?: string
): Promise<IVerificationResult> => {
  const report = await InspectionReport.findById(reportId);
  if (!report) {
    throw new Error('检测报告不存在');
  }

  const failureReasons: string[] = [];
  const now = new Date();

  const expiryValid = report.validUntil > now;
  if (!expiryValid) {
    failureReasons.push('检测报告已过期');
  }

  let batchNumberMatched = true;
  if (expectedBatchNumber) {
    batchNumberMatched = report.batchNumber === expectedBatchNumber;
    if (!batchNumberMatched) {
      failureReasons.push(`报告批次号(${report.batchNumber})与申请批次号(${expectedBatchNumber})不匹配`);
    }
  }

  let plotCodeMatched = true;
  let plotWithinZone = true;

  if (report.plotBoundaryId) {
    const plot = await PlotBoundary.findById(report.plotBoundaryId);
    if (plot) {
      if (expectedPlotCode && report.plotCode) {
        plotCodeMatched = report.plotCode === expectedPlotCode;
        if (!plotCodeMatched) {
          failureReasons.push(`报告地块编号(${report.plotCode})与申请地块编号(${expectedPlotCode})不匹配`);
        }
      }
      plotWithinZone = plot.isWithinProtectionZone;
      if (!plotWithinZone) {
        failureReasons.push(`地块(${plot.name})不在地理标志保护范围内`);
      }
    }
  } else if (expectedPlotCode) {
    plotCodeMatched = false;
    failureReasons.push('报告未关联地块信息');
  }

  const success = expiryValid && batchNumberMatched && plotCodeMatched && plotWithinZone;

  report.verificationStatus = success ? 'verified' : 'failed';
  report.verificationResult = {
    expiryValid,
    batchNumberMatched,
    plotCodeMatched,
    plotWithinZone,
    failureReasons
  };
  report.verifiedAt = new Date();
  report.verifiedBy = 'system';
  await report.save();

  if (!success) {
    await createPatrolWarningFromReport(report, failureReasons);
  }

  return {
    success,
    verificationStatus: success ? 'verified' : 'failed',
    verificationResult: {
      expiryValid,
      batchNumberMatched,
      plotCodeMatched,
      plotWithinZone,
      failureReasons
    }
  };
};

const createPatrolWarningFromReport = async (
  report: any,
  failureReasons: string[]
) => {
  const patrolRecord = new PatrolRecord({
    cooperativeId: report.cooperativeId,
    plotBoundaryId: report.plotBoundaryId,
    inspectionReportId: report._id,
    inspectorName: '系统自动',
    patrolDate: new Date(),
    result: 'warning',
    source: 'report_verification',
    sourceDetail: '检测报告附件核验不合格',
    description: `检测报告(${report.reportNumber})核验不合格：${failureReasons.join('；')}`,
    findings: failureReasons,
    correctiveActions: '请合作社重新上传有效的检测报告'
  });
  await patrolRecord.save();
};

export const isPlotWithinProtectionZone = async (
  plotCoordinates: ICoordinate[]
): Promise<{ isWithin: boolean; message: string; zoneName?: string }> => {
  if (!plotCoordinates || plotCoordinates.length < 3) {
    return { isWithin: false, message: '地块坐标不足，无法构成有效区域' };
  }

  const activeZones = await ProtectionZone.find({ isActive: true });

  if (activeZones.length === 0) {
    return { isWithin: false, message: '未找到激活的保护范围' };
  }

  const plotCenter = calculateCenter(plotCoordinates);

  for (const zone of activeZones) {
    if (isPointInPolygon(plotCenter, zone.boundary)) {
      const allCornersInZone = plotCoordinates.every(coord =>
        isPointInPolygon(coord, zone.boundary)
      );
      if (allCornersInZone) {
        return {
          isWithin: true,
          message: `地块在保护范围内：${zone.name}`,
          zoneName: zone.name
        };
      }
    }
  }

  return {
    isWithin: false,
    message: '地块不在地理标志保护范围内，无法授权'
  };
};

const calculateCenter = (coords: ICoordinate[]): ICoordinate => {
  const latSum = coords.reduce((sum, c) => sum + c.lat, 0);
  const lngSum = coords.reduce((sum, c) => sum + c.lng, 0);
  return {
    lat: latSum / coords.length,
    lng: lngSum / coords.length
  };
};

const isPointInPolygon = (pt: ICoordinate, polygonCoords: ICoordinate[]): boolean => {
  if (polygonCoords.length < 3) return false;

  const turfPoint = point([pt.lng, pt.lat]);
  const closedCoords = [...polygonCoords];
  if (
    closedCoords[0].lat !== closedCoords[closedCoords.length - 1].lat ||
    closedCoords[0].lng !== closedCoords[closedCoords.length - 1].lng
  ) {
    closedCoords.push(closedCoords[0]);
  }
  const turfPolygon = polygon([closedCoords.map(c => [c.lng, c.lat])]);

  return booleanPointInPolygon(turfPoint, turfPolygon);
};

export const isReportExpired = (validUntil: Date): boolean => {
  return new Date(validUntil) < new Date();
};

export const generateCertificateNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AGRI-GI-${year}${month}${day}-${random}`;
};

export const hasAbnormalPatrolRecently = async (
  cooperativeId: string,
  days: number = 30
): Promise<boolean> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const PatrolRecord = (await import('../models/PatrolRecord')).default;
  const abnormalRecord = await PatrolRecord.findOne({
    cooperativeId,
    result: { $in: ['abnormal', 'warning'] },
    patrolDate: { $gte: cutoffDate }
  }).sort({ patrolDate: -1 });

  return !!abnormalRecord;
};
