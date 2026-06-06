import React from 'react';
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  FileAddOutlined,
  FileTextOutlined,
  FileProtectOutlined,
  SearchOutlined,
  AlertOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ApplicationForm from './pages/ApplicationForm';
import CertificateList from './pages/CertificateList';
import ReportManagement from './pages/ReportManagement';
import PatrolManagement from './pages/PatrolManagement';
import AlertDashboard from './pages/AlertDashboard';
import CooperativeManagement from './pages/CooperativeManagement';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: <Link to="/">预警看板</Link> },
    { key: '/cooperatives', icon: <TeamOutlined />, label: <Link to="/cooperatives">合作社管理</Link> },
    { key: '/apply', icon: <FileAddOutlined />, label: <Link to="/apply">授权申请</Link> },
    { key: '/certificates', icon: <FileProtectOutlined />, label: <Link to="/certificates">授权列表</Link> },
    { key: '/reports', icon: <FileTextOutlined />, label: <Link to="/reports">报告管理</Link> },
    { key: '/patrols', icon: <SearchOutlined />, label: <Link to="/patrols">巡查记录</Link> },
    { key: '/alerts', icon: <AlertOutlined />, label: <Link to="/alerts">预警监控</Link> }
  ];

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-logo">🌾 农产品地理标志授权管理系统</div>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
          />
        </Sider>
        <Layout style={{ padding: '0 24px 24px' }}>
          <Content className="app-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cooperatives" element={<CooperativeManagement />} />
              <Route path="/apply" element={<ApplicationForm />} />
              <Route path="/certificates" element={<CertificateList />} />
              <Route path="/reports" element={<ReportManagement />} />
              <Route path="/patrols" element={<PatrolManagement />} />
              <Route path="/alerts" element={<AlertDashboard />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default App;
