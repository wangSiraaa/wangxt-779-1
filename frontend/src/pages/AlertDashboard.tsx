import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, List, Tag, Alert, Button, Space, Badge } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { apiService } from '../api';
import dayjs from 'dayjs';

const AlertDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [patrols, setPatrols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, coopRes, reportsRes, patrolsRes] = await Promise.all([
        apiService.getDashboardStats(),
        apiService.getCooperatives(),
        apiService.getInspectionReports(),
        apiService.getPatrolRecords()
      ]);
      setStats(statsRes.data);
      setCooperatives(coopRes.data);
      setReports(reportsRes.data);
      setPatrols(patrolsRes.data);
    } catch (error) {
      console.error('加载预警数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const suspendedCooperatives = cooperatives.filter((c) => c.isSuspended);
  const expiredReports = reports.filter((r) => new Date(r.validUntil) < new Date());
  const abnormalPatrols = patrols.filter(
    (p) => p.result === 'abnormal' || p.result === 'warning'
  );
  const pendingCertificates = stats?.statistics?.pendingCertificates || 0;

  const getAlertLevel = (type: string) => {
    const levels: Record<string, any> = {
      critical: { color: 'red', text: '严重' },
      warning: { color: 'orange', text: '警告' },
      notice: { color: 'blue', text: '提示' }
    };
    return levels[type] || levels.notice;
  };

  const alerts = [];

  if (suspendedCooperatives.length > 0) {
    alerts.push({
      type: 'critical',
      title: `${suspendedCooperatives.length} 家合作社被暂停授权`,
      description: '这些合作社无法提交新的用标登记，请及时处理',
      list: suspendedCooperatives.map((c) => ({
        name: c.name,
        reason: c.suspendReason || '原因未知',
        date: c.suspendDate ? dayjs(c.suspendDate).format('YYYY-MM-DD') : '-'
      }))
    });
  }

  if (expiredReports.length > 0) {
    alerts.push({
      type: 'warning',
      title: `${expiredReports.length} 份检测报告已过期`,
      description: '报告过期后无法用于授权申请，请及时更新',
      list: expiredReports.slice(0, 5).map((r) => ({
        name: r.reportNumber,
        reason: `有效期至 ${dayjs(r.validUntil).format('YYYY-MM-DD')}`,
        date: dayjs(r.createdAt).format('YYYY-MM-DD')
      }))
    });
  }

  if (abnormalPatrols.length > 0) {
    alerts.push({
      type: 'warning',
      title: `发现 ${abnormalPatrols.length} 条异常/预警巡查记录`,
      description: '近期存在异常巡查，请关注整改情况',
      list: abnormalPatrols.slice(0, 5).map((p) => ({
        name: p.cooperativeId?.name || '未知合作社',
        reason: p.description,
        date: dayjs(p.patrolDate).format('YYYY-MM-DD')
      }))
    });
  }

  if (pendingCertificates > 0) {
    alerts.push({
      type: 'notice',
      title: `${pendingCertificates} 份授权申请待审核`,
      description: '请及时处理待审核的授权申请'
    });
  }

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>
        <Badge count={alerts.length} offset={[10, 0]}>
          🚨 预警监控看板
        </Badge>
      </h2>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="暂停授权合作社"
              value={suspendedCooperatives.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="过期检测报告"
              value={expiredReports.length}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="异常/预警巡查"
              value={abnormalPatrols.length}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核申请"
              value={pendingCertificates}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {alerts.length === 0 ? (
        <Alert
          message="✅ 暂无预警"
          description="当前系统运行正常，没有发现需要处理的预警信息"
          type="success"
          showIcon
        />
      ) : (
        <Row gutter={16}>
          {alerts.map((alert, index) => (
            <Col span={12} key={index} style={{ marginBottom: 16 }}>
              <Card
                type="inner"
                title={
                  <Space>
                    <ExclamationCircleOutlined
                      style={{ color: getAlertLevel(alert.type).color }}
                    />
                    <span style={{ color: getAlertLevel(alert.type).color }}>
                      {alert.title}
                    </span>
                  </Space>
                }
                extra={
                  <Tag color={getAlertLevel(alert.type).color}>
                    {getAlertLevel(alert.type).text}
                  </Tag>
                }
              >
                <p style={{ color: '#666', marginBottom: 12 }}>{alert.description}</p>
                {alert.list && (
                  <List
                    size="small"
                    dataSource={alert.list}
                    renderItem={(item: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name}
                          description={
                            <span>
                              {item.reason} · {item.date}
                            </span>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <div style={{ marginTop: 24, textAlign: 'right' }}>
        <Button onClick={loadAllData} type="primary">
          刷新数据
        </Button>
      </div>
    </div>
  );
};

export default AlertDashboard;
