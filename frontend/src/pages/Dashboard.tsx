import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, List, Tag, Alert } from 'antd';
import {
  TeamOutlined,
  FileProtectOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { apiService } from '../api';
import dayjs from 'dayjs';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await apiService.getDashboardStats();
      setStats(res.data);
    } catch (error) {
      console.error('加载看板数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, any> = {
      pending: { color: 'orange', text: '待审核' },
      approved: { color: 'green', text: '已批准' },
      rejected: { color: 'red', text: '已拒绝' },
      suspended: { color: 'default', text: '已暂停' }
    };
    const s = statusMap[status] || { color: 'default', text: status };
    return <Tag color={s.color}>{s.text}</Tag>;
  };

  const getPatrolTag = (result: string) => {
    const resultMap: Record<string, any> = {
      normal: { color: 'green', text: '正常' },
      warning: { color: 'orange', text: '预警' },
      abnormal: { color: 'red', text: '异常' }
    };
    const r = resultMap[result] || { color: 'default', text: result };
    return <Tag color={r.color}>{r.text}</Tag>;
  };

  if (loading) {
    return <div>加载中...</div>;
  }

  const columns = [
    {
      title: '合作社',
      dataIndex: ['cooperativeId', 'name'],
      key: 'cooperative'
    },
    {
      title: '品种',
      dataIndex: 'variety',
      key: 'variety'
    },
    {
      title: '批次',
      dataIndex: 'batchNumber',
      key: 'batchNumber'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status)
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>📊 运营看板</h2>

      {stats?.statistics?.expiredReports > 0 && (
        <Alert
          message="报告预警"
          description={`有 ${stats.statistics.expiredReports} 份检测报告已过期，请及时处理`}
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {stats?.statistics?.suspendedCooperatives > 0 && (
        <Alert
          message="授权预警"
          description={`有 ${stats.statistics.suspendedCooperatives} 家合作社被暂停授权`}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="合作社总数"
              value={stats?.statistics?.totalCooperatives || 0}
              prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="已授权证书"
              value={stats?.statistics?.approvedCertificates || 0}
              prefix={<FileProtectOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="待审核申请"
              value={stats?.statistics?.pendingCertificates || 0}
              prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="巡查总数"
              value={stats?.statistics?.totalPatrols || 0}
              prefix={<SearchOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="异常巡查"
              value={stats?.statistics?.abnormalPatrols || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card className="stat-card">
            <Statistic
              title="暂停授权"
              value={stats?.statistics?.suspendedCooperatives || 0}
              prefix={<ExclamationCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="📋 最新授权申请" bordered={false}>
            <Table
              columns={columns}
              dataSource={stats?.recentApplications || []}
              rowKey="_id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="🔍 最新巡查记录" bordered={false}>
            <List
              dataSource={stats?.recentPatrols || []}
              renderItem={(item: any) => (
                <List.Item key={item._id}>
                  <List.Item.Meta
                    title={
                      <span>
                        {item.cooperativeId?.name} {getPatrolTag(item.result)}
                      </span>
                    }
                    description={
                      <span>
                        {item.inspectorName} · {dayjs(item.patrolDate).format('YYYY-MM-DD')} · {item.description}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
