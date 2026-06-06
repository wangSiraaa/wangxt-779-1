import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { apiService } from '../api';
import dayjs from 'dayjs';

const { Option } = Select;

const ReportManagement: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadReports();
    loadCooperatives();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await apiService.getInspectionReports();
      setReports(res.data);
    } catch (error) {
      message.error('加载报告列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadCooperatives = async () => {
    try {
      const res = await apiService.getCooperatives();
      setCooperatives(res.data);
    } catch (error) {
      console.error('加载合作社列表失败', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        reportDate: values.reportDate.toDate(),
        validUntil: values.validUntil.toDate()
      };
      await apiService.createInspectionReport(data);
      message.success('报告上传成功');
      setIsModalVisible(false);
      form.resetFields();
      loadReports();
    } catch (error: any) {
      message.error('上传失败：' + (error.response?.data?.error || error.message));
    }
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const getStatusTag = (status: string, validUntil: string) => {
    if (isExpired(validUntil) || status === 'expired') {
      return <Tag color="red">已过期</Tag>;
    }
    if (status === 'pending') {
      return <Tag color="orange">待审核</Tag>;
    }
    return <Tag color="green">有效</Tag>;
  };

  const columns = [
    {
      title: '报告编号',
      dataIndex: 'reportNumber',
      key: 'reportNumber'
    },
    {
      title: '合作社',
      dataIndex: 'cooperativeId',
      key: 'cooperativeId',
      render: (id: string) => {
        const coop = cooperatives.find((c) => c._id === id);
        return coop?.name || id;
      }
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
      title: '检测机构',
      dataIndex: 'issuedBy',
      key: 'issuedBy'
    },
    {
      title: '报告日期',
      dataIndex: 'reportDate',
      key: 'reportDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '有效期至',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: any) => getStatusTag(record.status, record.validUntil)
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <Card
        title="📄 检测报告管理"
        bordered={false}
        extra={
          <Space>
            <Button type="primary" onClick={() => setIsModalVisible(true)}>
              + 上传报告
            </Button>
            <Button onClick={loadReports}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={reports}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="上传检测报告"
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="合作社"
            name="cooperativeId"
            rules={[{ required: true, message: '请选择合作社' }]}
          >
            <Select placeholder="请选择合作社">
              {cooperatives.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="报告编号"
              name="reportNumber"
              rules={[{ required: true, message: '请输入报告编号' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入报告编号" />
            </Form.Item>
            <Form.Item
              label="检测机构"
              name="issuedBy"
              rules={[{ required: true, message: '请输入检测机构' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入检测机构名称" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="品种"
              name="variety"
              rules={[{ required: true, message: '请输入品种' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入检测品种" />
            </Form.Item>
            <Form.Item
              label="批次号"
              name="batchNumber"
              rules={[{ required: true, message: '请输入批次号' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入批次号" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="报告日期"
              name="reportDate"
              rules={[{ required: true, message: '请选择报告日期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item
              label="有效期至"
              name="validUntil"
              rules={[{ required: true, message: '请选择有效期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ReportManagement;
