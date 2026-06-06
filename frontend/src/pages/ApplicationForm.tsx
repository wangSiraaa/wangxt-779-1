import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Steps,
  message,
  Alert,
  InputNumber,
  DatePicker,
  Space,
  Divider,
  Row,
  Col
} from 'antd';
import { MapContainer, TileLayer, Polygon, CircleMarker, useMapEvents } from 'react-leaflet';
import { apiService } from '../api';
import dayjs from 'dayjs';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

interface Coordinate {
  lat: number;
  lng: number;
}

const MapClickHandler: React.FC<{
  onMapClick: (lat: number, lng: number) => void;
  coordinates: Coordinate[];
}> = ({ onMapClick, coordinates }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });

  if (coordinates.length >= 3) {
    const positions: [number, number][] = coordinates.map((c) => [c.lat, c.lng]);
    return <Polygon positions={positions} pathOptions={{ color: 'blue', fillColor: '#3388ff', fillOpacity: 0.3 }} />;
  }
  return null;
};

const ApplicationForm: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coordinates, setCoordinates] = useState<Coordinate[]>([]);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [plotForm] = Form.useForm();
  const [reportForm] = Form.useForm();

  useEffect(() => {
    loadCooperatives();
  }, []);

  const loadCooperatives = async () => {
    try {
      const res = await apiService.getCooperatives();
      setCooperatives(res.data);
    } catch (error) {
      console.error('加载合作社列表失败', error);
    }
  };

  const loadReports = async (cooperativeId: string) => {
    try {
      const res = await apiService.getInspectionReports(cooperativeId);
      const validReports = res.data.filter((r: any) => r.status === 'valid' && new Date(r.validUntil) > new Date());
      setReports(validReports);
    } catch (error) {
      console.error('加载报告列表失败', error);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setCoordinates((prev) => [...prev, { lat, lng }]);
  };

  const clearCoordinates = () => {
    setCoordinates([]);
    setValidationResult(null);
  };

  const validatePlot = async () => {
    if (coordinates.length < 3) {
      message.warning('请至少标记3个点构成地块边界');
      return;
    }
    try {
      setLoading(true);
      const res = await apiService.validatePlot(coordinates);
      setValidationResult(res.data);
      if (res.data.isWithin) {
        message.success(res.data.message);
      } else {
        message.error(res.data.message);
      }
    } catch (error: any) {
      message.error('校验失败：' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCooperativeChange = async (value: string) => {
    loadReports(value);
  };

  const handleSubmit = async () => {
    try {
      const plotData = await plotForm.validateFields();
      const reportData = await reportForm.validateFields();
      const appData = await form.validateFields();

      setLoading(true);

      const plotRes = await apiService.createPlotBoundary({
        ...plotData,
        cooperativeId: appData.cooperativeId,
        coordinates
      });

      const reportRes = await apiService.createInspectionReport({
        ...reportData,
        cooperativeId: appData.cooperativeId,
        plotBoundaryId: plotRes.data.plotBoundary._id,
        reportDate: reportData.reportDate.toDate(),
        validUntil: reportData.validUntil.toDate()
      });

      const certRes = await apiService.applyCertificate({
        cooperativeId: appData.cooperativeId,
        plotBoundaryId: plotRes.data.plotBoundary._id,
        inspectionReportId: reportRes.data._id,
        variety: plotData.variety,
        batchNumber: appData.batchNumber
      });

      message.success('授权申请提交成功！');
      setCurrentStep(3);
    } catch (error: any) {
      if (error.response?.data?.code) {
        const errorCode = error.response.data.code;
        const errorMessages: Record<string, string> = {
          OUTSIDE_PROTECTION_ZONE: '地块不在保护范围内，无法授权',
          REPORT_EXPIRED: '检测报告已过期，请重新上传',
          PATROL_ABNORMAL_SUSPENDED: '近30天内存在巡查异常记录，新增用标登记已暂停',
          DUPLICATE_BATCH: '该批次已申请过授权证书，不能重复申请',
          COOPERATIVE_SUSPENDED: '合作社已被暂停授权'
        };
        message.error(errorMessages[errorCode] || error.response.data.error);
      } else {
        message.error('提交失败：' + (error.message || '未知错误'));
      }
    } finally {
      setLoading(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 0) {
      try {
        await plotForm.validateFields();
        if (coordinates.length < 3) {
          message.warning('请在地图上标记地块边界（至少3个点）');
          return;
        }
        if (!validationResult) {
          await validatePlot();
          return;
        }
        if (!validationResult.isWithin) {
          message.error('地块不在保护范围内，无法继续申请');
          return;
        }
        setCurrentStep(1);
      } catch {
        message.error('请完善地块信息');
      }
    } else if (currentStep === 1) {
      try {
        await reportForm.validateFields();
        const reportData = reportForm.getFieldsValue();
        if (reportData.validUntil && reportData.validUntil.isBefore(dayjs())) {
          message.error('检测报告有效期不能早于今天');
          return;
        }
        setCurrentStep(2);
      } catch {
        message.error('请完善报告信息');
      }
    } else if (currentStep === 2) {
      handleSubmit();
    }
  };

  const prevStep = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const resetForm = () => {
    setCurrentStep(0);
    setCoordinates([]);
    setValidationResult(null);
    form.resetFields();
    plotForm.resetFields();
    reportForm.resetFields();
  };

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>📝 地理标志授权申请</h2>

      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          <Step title="地块信息" description="标记地块边界并校验" />
          <Step title="检测报告" description="上传检测报告" />
          <Step title="确认提交" description="确认并提交申请" />
          <Step title="完成" description="申请已提交" />
        </Steps>

        {currentStep === 0 && (
          <div>
            <Form form={plotForm} layout="vertical">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="合作社"
                    name="cooperativeId"
                    rules={[{ required: true, message: '请选择合作社' }]}
                  >
                    <Select placeholder="请选择合作社" onChange={handleCooperativeChange}>
                      {cooperatives.map((c) => (
                        <Option key={c._id} value={c._id}>
                          {c.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="地块名称"
                    name="name"
                    rules={[{ required: true, message: '请输入地块名称' }]}
                  >
                    <Input placeholder="请输入地块名称" />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    label="面积(亩)"
                    name="area"
                    rules={[{ required: true, message: '请输入面积' }]}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    label="品种"
                    name="variety"
                    rules={[{ required: true, message: '请输入品种' }]}
                  >
                    <Input placeholder="如：五常大米" />
                  </Form.Item>
                </Col>
              </Row>
            </Form>

            <Divider />

            <h4>📍 请在地图上标记地块边界（点击地图添加点，至少3个点）</h4>
            <Space style={{ marginBottom: 16 }}>
              <Button onClick={clearCoordinates} danger>
                清除标记
              </Button>
              <Button type="primary" onClick={validatePlot} loading={loading}>
                校验保护范围
              </Button>
              <span>已标记 {coordinates.length} 个点</span>
            </Space>

            {validationResult && (
              <Alert
                message={validationResult.isWithin ? '✅ 校验通过' : '❌ 校验失败'}
                description={validationResult.message}
                type={validationResult.isWithin ? 'success' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <MapContainer
              center={[45.0, 127.0]}
              zoom={10}
              style={{ height: '400px', width: '100%', borderRadius: '8px' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
              <MapClickHandler onMapClick={handleMapClick} coordinates={coordinates} />
              {coordinates.map((coord, index) => (
                <CircleMarker
                  key={index}
                  center={[coord.lat, coord.lng]}
                  radius={5}
                  pathOptions={{ color: 'red' }}
                />
              ))}
            </MapContainer>
          </div>
        )}

        {currentStep === 1 && (
          <Form form={reportForm} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="报告编号"
                  name="reportNumber"
                  rules={[{ required: true, message: '请输入报告编号' }]}
                >
                  <Input placeholder="请输入检测报告编号" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="检测机构"
                  name="issuedBy"
                  rules={[{ required: true, message: '请输入检测机构' }]}
                >
                  <Input placeholder="请输入检测机构名称" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="品种"
                  name="variety"
                  rules={[{ required: true, message: '请输入品种' }]}
                >
                  <Input placeholder="请输入检测品种" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  label="批次号"
                  name="batchNumber"
                  rules={[{ required: true, message: '请输入批次号' }]}
                >
                  <Input placeholder="请输入批次号" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="报告日期"
                  name="reportDate"
                  rules={[{ required: true, message: '请选择报告日期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  label="有效期至"
                  name="validUntil"
                  rules={[{ required: true, message: '请选择有效期' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item label="备注" name="remark">
              <TextArea rows={3} placeholder="可选：备注信息" />
            </Form.Item>
          </Form>
        )}

        {currentStep === 2 && (
          <div>
            <Alert
              message="请确认申请信息"
              description="确认无误后点击提交按钮，系统将自动进行业务规则校验"
              type="info"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Form form={form} layout="vertical">
              <Form.Item
                label="批次号（用于生成授权证书）"
                name="batchNumber"
                rules={[{ required: true, message: '请输入批次号' }]}
              >
                <Input placeholder="请输入唯一的批次号，同一批次不能重复申请" />
              </Form.Item>
            </Form>
            <div style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
              <p><strong>地块坐标点数：</strong>{coordinates.length}</p>
              <p><strong>保护范围校验：</strong>{validationResult?.isWithin ? '✅ 通过' : '❌ 不通过'}</p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <h3>🎉 授权申请已提交</h3>
            <p>您的申请已成功提交，请等待品牌管理员审核</p>
            <Button type="primary" onClick={resetForm} style={{ marginTop: 16 }}>
              提交新的申请
            </Button>
          </div>
        )}

        {currentStep < 3 && (
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            {currentStep > 0 && (
              <Button onClick={prevStep} style={{ marginRight: 8 }}>
                上一步
              </Button>
            )}
            <Button type="primary" onClick={nextStep} loading={loading}>
              {currentStep === 2 ? '提交申请' : '下一步'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ApplicationForm;
