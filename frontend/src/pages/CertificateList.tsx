import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, message, Select } from 'antd';
import { apiService } from '../api';
import dayjs from 'dayjs';

const { Option } = Select;

const CertificateList: React.FC = () => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCertificates();
  }, [statusFilter]);

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await apiService.getCertificates(params);
      setCertificates(res.data);
    } catch (error) {
      message.error('加载授权列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (record: any) => {
    Modal.confirm({
      title: '确认批准授权',
      content: `确定要批准 ${record.cooperativeId?.name} 的授权申请吗？`,
      onOk: async () => {
        try {
          await apiService.approveCertificate(record._id, { approvedBy: '管理员' });
          message.success('批准成功');
          loadCertificates();
        } catch (error: any) {
          message.error('批准失败：' + (error.response?.data?.error || error.message));
        }
      }
    });
  };

  const handleReject = (record: any) => {
    let rejectReason = '';
    Modal.confirm({
      title: '拒绝授权申请',
      content: (
        <div>
          <p>请填写拒绝原因：</p>
          <textarea
            style={{ width: '100%', height: 80, marginTop: 8 }}
            onChange={(e) => (rejectReason = e.target.value)}
            placeholder="请输入拒绝原因"
          />
        </div>
      ),
      onOk: async () => {
        try {
          await apiService.rejectCertificate(record._id, { rejectReason });
          message.success('已拒绝');
          loadCertificates();
        } catch (error: any) {
          message.error('操作失败：' + (error.response?.data?.error || error.message));
        }
      }
    });
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

  const columns = [
    {
      title: '证书编号',
      dataIndex: 'certificateNumber',
      key: 'certificateNumber',
      width: 200
    },
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
      title: '批次号',
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
      title: '有效期',
      key: 'validity',
      render: (_: any, record: any) => (
        <span>
          {dayjs(record.validFrom).format('YYYY-MM-DD')} ~ {dayjs(record.validUntil).format('YYYY-MM-DD')}
        </span>
      )
    },
    {
      title: '申请时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => {
        if (record.status === 'pending') {
          return (
            <Space>
              <Button type="link" size="small" onClick={() => handleApprove(record)}>
                批准
              </Button>
              <Button type="link" size="small" danger onClick={() => handleReject(record)}>
                拒绝
              </Button>
            </Space>
          );
        }
        if (record.status === 'rejected' && record.rejectReason) {
          return <span style={{ color: '#999' }}>原因：{record.rejectReason}</span>;
        }
        return null;
      }
    }
  ];

  return (
    <div>
      <Card
        title="📜 授权证书列表"
        bordered={false}
        extra={
          <Space>
            <span>筛选：</span>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}>
              <Option value="all">全部</Option>
              <Option value="pending">待审核</Option>
              <Option value="approved">已批准</Option>
              <Option value="rejected">已拒绝</Option>
              <Option value="suspended">已暂停</Option>
            </Select>
            <Button onClick={loadCertificates}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={certificates}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default CertificateList;
