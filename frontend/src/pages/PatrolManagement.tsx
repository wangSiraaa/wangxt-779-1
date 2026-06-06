import React, { useEffect, useState } from 'react';
import { Table, Card, Tag, Button, Space, Modal, Form, Input, Select, DatePicker, message } from 'antd';
import { apiService } from '../api';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

const PatrolManagement: React.FC = () => {
  const [patrols, setPatrols] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooperatives, setCooperatives] = useState<any[]>([]);
  const [plots, setPlots] = useState<any[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadPatrols();
    loadCooperatives();
  }, []);

  const loadPatrols = async () => {
    setLoading(true);
    try {
      const res = await apiService.getPatrolRecords();
      setPatrols(res.data);
    } catch (error) {
      message.error('加载巡查记录失败');
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

  const handleCooperativeChange = async (value: string) => {
    try {
      const res = await apiService.getPlotBoundaries(value);
      setPlots(res.data);
    } catch (error) {
      console.error('加载地块列表失败', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        patrolDate: values.patrolDate.toDate(),
        nextPatrolDate: values.nextPatrolDate?.toDate(),
        findings: values.findings ? values.findings.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean) : []
      };
      await apiService.createPatrolRecord(data);
      message.success('巡查记录保存成功');
      setIsModalVisible(false);
      form.resetFields();
      loadPatrols();
    } catch (error: any) {
      message.error('保存失败：' + (error.response?.data?.error || error.message));
    }
  };

  const getResultTag = (result: string) => {
    const resultMap: Record<string, any> = {
      normal: { color: 'green', text: '正常' },
      warning: { color: 'orange', text: '预警' },
      abnormal: { color: 'red', text: '异常' }
    };
    const r = resultMap[result] || { color: 'default', text: result };
    return <Tag color={r.color}>{r.text}</Tag>;
  };

  const columns = [
    {
      title: '合作社',
      dataIndex: ['cooperativeId', 'name'],
      key: 'cooperative'
    },
    {
      title: '巡查人员',
      dataIndex: 'inspectorName',
      key: 'inspectorName'
    },
    {
      title: '巡查日期',
      dataIndex: 'patrolDate',
      key: 'patrolDate',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD')
    },
    {
      title: '巡查结果',
      dataIndex: 'result',
      key: 'result',
      render: (result: string) => getResultTag(result)
    },
    {
      title: '问题描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '整改措施',
      dataIndex: 'correctiveActions',
      key: 'correctiveActions',
      ellipsis: true
    },
    {
      title: '下次巡查',
      dataIndex: 'nextPatrolDate',
      key: 'nextPatrolDate',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '记录时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm')
    }
  ];

  return (
    <div>
      <Card
        title="🔍 巡查记录管理"
        bordered={false}
        extra={
          <Space>
            <Button type="primary" onClick={() => setIsModalVisible(true)}>
              + 新增巡查记录
            </Button>
            <Button onClick={loadPatrols}>刷新</Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={patrols}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="新增巡查记录"
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
            <Select placeholder="请选择合作社" onChange={handleCooperativeChange}>
              {cooperatives.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="地块（可选）" name="plotBoundaryId">
            <Select placeholder="请选择地块">
              {plots.map((p) => (
                <Option key={p._id} value={p._id}>
                  {p.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              label="巡查人员"
              name="inspectorName"
              rules={[{ required: true, message: '请输入巡查人员姓名' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="请输入巡查人员姓名" />
            </Form.Item>
            <Form.Item
              label="巡查日期"
              name="patrolDate"
              rules={[{ required: true, message: '请选择巡查日期' }]}
              style={{ flex: 1 }}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item
            label="巡查结果"
            name="result"
            rules={[{ required: true, message: '请选择巡查结果' }]}
          >
            <Select placeholder="请选择巡查结果">
              <Option value="normal">正常</Option>
              <Option value="warning">预警</Option>
              <Option value="abnormal">异常</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="情况描述"
            name="description"
            rules={[{ required: true, message: '请输入情况描述' }]}
          >
            <TextArea rows={3} placeholder="请详细描述巡查情况" />
          </Form.Item>
          <Form.Item label="发现问题（用逗号分隔）" name="findings">
            <TextArea rows={2} placeholder="例如：农药使用不规范, 记录不完整" />
          </Form.Item>
          <Form.Item label="整改措施" name="correctiveActions">
            <TextArea rows={2} placeholder="请输入整改措施" />
          </Form.Item>
          <Form.Item label="下次巡查日期" name="nextPatrolDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PatrolManagement;
