# 农产品地理标志授权全栈 Web 应用

## 功能概述

本系统实现了农产品地理标志授权的全流程管理，包括：

### 核心业务流程
1. **合作社申请** - 合作社提交地块坐标、品种、批次和检测报告
2. **保护范围校验** - 自动校验地块是否在地理标志保护范围内
3. **检测报告审核** - 检测机构上传报告，系统自动校验有效期
4. **用标登记** - 品牌管理员审核授权，合作社登记用标
5. **巡查预警** - 监管人员记录巡查结果，异常自动触发预警
6. **暂停授权** - 多次巡查异常自动暂停合作社授权

### 业务规则
- ✅ 地块不在保护范围内不能授权
- ✅ 检测报告过期必须重新上传
- ✅ 巡查异常后新增用标登记被暂停
- ✅ 同一批次不能重复申请证书

## 技术栈

### 后端
- Node.js + TypeScript
- Express Web 框架
- MongoDB + Mongoose ODM
- Turf.js（地理空间计算）

### 前端
- React 18 + TypeScript
- Vite 构建工具
- Ant Design UI 组件库
- React-Leaflet（地图组件）
- React Router 路由

### 部署
- Docker + Docker Compose
- Nginx（前端静态服务）

## 快速开始

### 方式一：Docker 运行（推荐）

```bash
# 1. 构建并启动所有服务
npm run docker:build
npm run docker:up

# 2. 等待服务启动后，运行验收测试
npm run test:acceptance

# 3. 访问应用
# 前端: http://localhost:3000
# 后端API: http://localhost:3001/api/health
```

### 方式二：本地开发运行

前置条件：
- Node.js 18+
- MongoDB 运行在 localhost:27017

```bash
# 1. 安装依赖
npm install

# 2. 启动后端服务（端口 3001）
cd backend
npm install
npm run dev

# 3. 新开终端，启动前端服务（端口 3000）
cd frontend
npm install
npm run dev

# 4. 运行验收测试（需要服务已启动）
npm run test:acceptance
```

## 验收测试

运行验收测试脚本验证所有业务规则：

```bash
npm run test:acceptance
```

测试内容：
1. 创建合作社
2. 保护范围内地块校验通过
3. 保护范围外地块校验不通过
4. 保护范围外地块申请授权失败
5. 创建有效检测报告
6. 过期检测报告自动标记
7. 过期报告申请授权被拒绝
8. 正常申请授权成功
9. 同一批次重复申请被拒绝
10. 品牌管理员批准授权
11. 监管人员记录异常巡查
12. 巡查异常后用标登记被暂停
13. 预警看板数据查询
14. 过期报告状态校验

## 项目结构

```
.
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── models/         # 数据模型
│   │   ├── services/       # 业务规则服务
│   │   ├── routes.ts       # API 路由
│   │   ├── db.ts           # 数据库连接
│   │   ├── seed.ts         # 初始化数据
│   │   └── index.ts        # 入口文件
│   ├── Dockerfile
│   └── package.json
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── pages/          # 页面组件
│   │   ├── api/            # API 服务
│   │   ├── App.tsx         # 主应用
│   │   └── main.tsx        # 入口文件
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml      # Docker 编排
├── acceptance-test.js      # 验收测试脚本
└── package.json
```

## 数据模型

- **Cooperative（合作社）** - 合作社基本信息及授权状态
- **PlotBoundary（地块边界）** - 地块坐标及保护范围校验结果
- **InspectionReport（检测报告）** - 检测报告及有效期管理
- **AuthorizationCertificate（授权证书）** - 授权申请及审批状态
- **LabelUsage（用标登记）** - 地理标志使用登记
- **PatrolRecord（巡查记录）** - 监管巡查及异常记录
- **ProtectionZone（保护范围）** - 地理标志保护区域

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/protection-zones | 获取保护范围列表 |
| GET/POST | /api/cooperatives | 合作社列表/创建 |
| POST | /api/plot-boundaries/validate | 地块保护范围校验 |
| GET/POST | /api/plot-boundaries | 地块列表/创建 |
| GET/POST | /api/inspection-reports | 检测报告列表/上传 |
| POST | /api/authorization-certificates/apply | 提交授权申请 |
| POST | /api/authorization-certificates/:id/approve | 批准授权 |
| POST | /api/authorization-certificates/:id/reject | 拒绝授权 |
| GET | /api/authorization-certificates | 授权证书列表 |
| GET/POST | /api/label-usages | 用标登记列表/创建 |
| GET/POST | /api/patrol-records | 巡查记录列表/创建 |
| GET | /api/dashboard/stats | 看板统计数据 |

## 页面功能

1. **预警看板** - 统计数据、最新申请、最新巡查、预警提醒
2. **授权申请** - 分步表单、地图标绘、范围校验、报告上传
3. **授权列表** - 证书列表、审核操作、状态筛选
4. **报告管理** - 检测报告上传、状态展示、有效期管理
5. **巡查记录** - 巡查登记、结果记录、整改跟踪
6. **预警监控** - 异常预警、暂停授权、过期报告提醒
