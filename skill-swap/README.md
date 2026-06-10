# 技能交换匹配与成长社区

一个基于 Vue3 + Express 的技能交换平台，用户可以发布可教/想学的技能，系统自动匹配并支持聊天、评价、技能树可视化。

## 功能特性

### 核心功能
- 🔄 **双向智能匹配** - 根据技能、时间、地域自动匹配，显示契合度评分
- 💬 **实时聊天** - 支持消息记录、未读提醒
- ⭐ **评价系统** - 交换完成后互评打分
- 🌳 **技能树** - 可视化展示个人成长路径
- 📊 **数据统计** - 热门技能排行、交换成功率
- 🔍 **多维筛选** - 按技能类别/距离/评分筛选

### 用户功能
- 发布「可教」技能（设置等级、描述、时间地域偏好）
- 发布「想学」技能
- 设置时间、地域、线上/线下偏好
- 查看匹配用户及契合度
- 发起交换请求
- 交换双方确认完成
- 互评打分
- 技能树管理
- 个人资料管理

## 技术栈

### 前端
- Vue 3 + Vite
- Vue Router 4
- Pinia 状态管理
- Element Plus UI 框架
- ECharts 图表库
- Axios HTTP 客户端

### 后端
- Express.js
- JWT 身份认证
- bcryptjs 密码加密
- UUID 唯一标识
- JSON 文件存储数据

## 项目结构

```
skill-swap/
├── backend/                    # 后端项目
│   ├── server.js           # 服务器入口
│   ├── package.json
│   ├── utils/
│   │   ├── storage.js    # JSON 存储工具
│   │   └── matching.js   # 匹配算法
│   └── data/             # JSON 数据存储
│       ├── users.json
│       ├── skills.json
│       ├── matches.json
│       ├── messages.json
│       ├── exchanges.json
│       ├── reviews.json
│       └── skillCategories.json
└── frontend/             # 前端项目
│   ├── src/
│   │   ├── main.js
│   │   ├── App.vue
│   │   ├── router/       # 路由配置
│   │   ├── stores/       # Pinia 状态管理
│   │   ├── api/          # API 封装
│   │   ├── styles/       # 全局样式
│   │   └── views/      # 页面组件
│   │       ├── Login.vue
│   │       ├── Register.vue
│   │       ├── Home.vue
│   │       ├── Publish.vue
│   │       ├── Matches.vue
│   │       ├── Chat.vue
│   │       ├── Profile.vue
│   │       ├── UserProfile.vue
│   │       ├── SkillTree.vue
│   │       ├── Rankings.vue
│   │       └── Exchanges.vue
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## 快速开始

### 1. 安装后端

```bash
cd backend
npm install
npm start
```

后端服务将在 http://localhost:3000 启动

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端开发服务器将在 http://localhost:5173 启动

### 3. 访问应用

打开浏览器访问 http://localhost:5173

## API 接口说明

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户

### 技能接口
- `GET /api/skills` - 获取技能列表
- `POST /api/skills` - 发布技能
- `PUT /api/skills/:id` - 更新技能
- `DELETE /api/skills/:id` - 删除技能

### 匹配接口
- `GET /api/matches` - 获取匹配结果

### 消息接口
- `GET /api/conversations` - 获取会话列表
- `GET /api/messages/:userId` - 获取消息记录
- `POST /api/messages` - 发送消息

### 交换接口
- `GET /api/exchanges` - 获取交换记录
- `POST /api/exchanges` - 发起交换
- `PUT /api/exchanges/:id/confirm` - 确认交换完成

### 评价接口
- `POST /api/reviews` - 提交评价
- `GET /api/reviews/:userId` - 获取用户评价

### 统计接口
- `GET /api/stats/popular-skills` - 热门技能
- `GET /api/stats/success-rate` - 成功率统计

## 匹配算法

系统会综合以下因素计算契合度：

1. **技能匹配度 (40%)** - 可教/想学双向匹配
2. **地域匹配 (15%)** - 城市/省份匹配
3. **时间匹配 (15%)** - 可用时间段重叠
4. **学习方式偏好 (10%)** - 线上/线下偏好一致

契合度评分 0-100%，仅显示 30% 以上的匹配。

## 数据说明

所有数据以 JSON 格式存储在 `backend/data/` 目录下，包括：

- users.json - 用户信息
- skills.json - 技能发布
- matches.json - 匹配记录
- messages.json - 聊天消息
- exchanges.json - 交换记录
- reviews.json - 评价数据
- skillCategories.json - 技能类别配置

## 使用说明

1. **注册账号** - 填写用户名、邮箱、密码
2. **发布技能** - 发布你可以教的和想要学的技能
3. **设置偏好** - 完善时间、地域偏好获得更精准匹配
4. **查看匹配** - 系统自动计算契合度并推荐匹配用户
5. **开始聊天** - 与匹配用户沟通交换细节
6. **发起交换** - 确认交换内容
7. **完成交换** - 双方确认完成
8. **互相评价** - 为本次交换打分评价
9. **技能树** - 记录技能成长路径

## 开发者

- Vue 3 Composition API
- Express.js
- Element Plus
- ECharts
