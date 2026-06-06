import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, Form, Input, message } from 'antd';
import { apiService } from '../api';
import dayjs from 'dayjs';

const CooperativeManagement: React.FC = () => {
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCooperatives();
  }, []);

  const loadCooperatives = async () => {
    setLoading(true);
    try {
      const res = await apiService.getCooperatives();
      setCooperatives(res.data);
    } catch (error) {
      message.error('加载合作社列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await apiService.createCooperative(values);
      message.success('合作社创建成功');
      setIsModalVisible(false);
      form.resetFields();
      loadCooperatives();
    } catch (error: any) {
      message.error('创建失败：' + (error.response?.data?.error || error.message));
    }
  };

  const columns = [
    {
      title: '合作社名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '法人代表',
      dataIndex: 'legalPerson',
      key: 'legalPerson'
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true
    },
    {
      title: '注册号',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber'
    },
    {
      title: '状态',
      dataIndex: 'isSuspended',
      key: 'status',
      render: (suspended: boolean) =>
        suspended ? (
          <Tag color="red">已暂停授权</Tag>
        ) : (
          <Tag color="green">正常</Tag>
        )
    },
    {
      title: '暂停原因',
      dataIndex: 'suspendReason',
      key: 'suspendReason',
      render: (reason: string) => reason || '-'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <Card
        title="🏢 合作社管理"
        bordered={false}
        extra={
          <Space>
            <Button type="primary" onClick={() => setIsModalVisible(true)}>
              + 新增合作社
            </Button>
            <Button onClick={loadCooperatives}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={cooperatives}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新增合作社"
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
            label="合作社名称"
            name="name"
            rules={[{ required: true, message: '请输入合作社名称' }]}
          >
            <Input placeholder="请输入合作社全称" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="法人代表"
              name="legalPerson"
              rules={[{ required: true, message: '请输入法人代表姓名' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入法人代表姓名" />
            </Form.Item>
            <Form.Item
              label="联系电话"
              name="phone"
              rules={[{ required: true, message: '请输入联系电话' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入联系电话" />
            </Form.Item>
          </div>
          <Form.Item
            label="地址"
            name="address"
            rules={[{ required: true, message: '请输入地址' }]}
          >
            <Input placeholder="请输入详细地址" />
          </Form.Item>
          <Form.Item
            label="营业执照注册号"
            name="registrationNumber"
            rules={[{ required: true, message: '请输入注册号' }]}
          >
            <Input placeholder="请输入统一社会信用代码或注册号" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CooperativeManagement;
