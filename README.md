# PH Sports - 学校体育队伍管理系统

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#) [![React](https://img.shields.io/badge/React-18+-blue)](#) [![Vite](https://img.shields.io/badge/Vite-5+-purple)](#) [![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange)](#)

一个现代化的学校体育队伍管理系统，支持学生和教师一起协作管理队伍成员、训练日志、排行榜和场地预订。

---

## 🎯 主要功能

### 📊 学生功能
- ✅ **队伍管理**：查看所在队伍的所有成员
- ✅ **排行榜**：实时查看队伍成员的训练排名和成就
- ✅ **训练记录**：记录和查看个人训练日志
- ✅ **场地预订**：申请预订运动场地（待教师批准）
- ✅ **个人资料**：管理个人信息和队伍加入

### 👨‍🏫 教师功能
- ✅ **队伍管理**：创建并管理队伍成员列表
- ✅ **场地批准**：审核和批准学生场地预订申请
- ✅ **宣传通知**：发布队伍公告和重要信息
- ✅ **数据统计**：查看队伍训练数据和成员进度
- ✅ **个人资料**：管理教师信息和教练资格

### 🔐 管理员功能
- ✅ **用户管理**：管理所有用户账户
- ✅ **教师审核**：审核和批准教师申请
- ✅ **系统配置**：配置系统设置和运动类型
- ✅ **数据管理**：访问所有数据表和记录

---

## 🏗️ 技术栈

| 层级 | 技术 | 说明 |
|-----|------|------|
| **前端** | React 18 + Vite 5 | 快速开发和构建 |
| **UI 框架** | Shadcn/ui + Tailwind CSS | 现代化组件库 |
| **数据获取** | React Query + Axios | 高效的数据管理 |
| **后端** | Cloudflare Workers | 边计算无服务器 |
| **数据库** | Cloudflare D1 SQLite | 分布式 SQL 数据库 |
| **部署** | Cloudflare Pages | 全球 CDN 部署 |

---

## 📁 项目结构

```
PH-Sports/
├── src/
│   ├── api/
│   │   ├── pages/           # 页面组件
│   │   │   ├── Dashboard.jsx            # 学生仪表板
│   │   │   ├── Teams.jsx               # 队伍管理
│   │   │   ├── VenueBooking.jsx        # 场地预订 ⭐
│   │   │   ├── TrainingLog.jsx         # 训练日志
│   │   │   ├── AdminPanel.jsx          # 管理员面板
│   │   │   └── ... 
│   │   ├── components/
│   │   │   ├── teams/
│   │   │   │   └── Leaderboard.jsx    # 排行榜组件
│   │   │   ├── training/               # 训练相关组件
│   │   │   ├── VenueBookingForm.jsx   # 预订表单
│   │   │   ├── VenueCalendar.jsx      # 日历组件
│   │   │   ├── ProtectedRoute.jsx     # 权限路由
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── AuthContext.jsx        # 认证上下文
│   │   │   ├── sports-config.js       # 运动类型配置
│   │   │   └── utils.js
│   │   ├── ui/                        # UI 组件库
│   │   ├── api.js                     # API 配置
│   │   ├── apiClient.js               # HTTP 客户端
│   │   └── App.jsx                    # 主应用
│   ├── index.css
│   └── main.jsx
├── functions/
│   └── api/
│       └── [[path]].js                # Cloudflare Workers 后端
├── public/
├── docs/
│   ├── VENUE_BOOKING_GUIDE.md         # 场地预订用户指南
│   └── TECHNICAL_IMPLEMENTATION.md    # 技术实现细节
├── schema.sql                         # 数据库架构
├── vite.config.js
├── wrangler.toml                      # Cloudflare 配置
├── tailwind.config.js
├── package.json
└── README.md
```

---

## 🚀 快速开始

### 前置要求
- Node.js 22.16.0+
- npm 10.9.2+
- Cloudflare 账户（用于部署）

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
# 启动 Vite 开发服务器（前端）
npm run dev

# 在另一个终端启动 Wrangler 后端
wrangler pages dev

# 访问 http://localhost:8788
```

### 构建生产版本

```bash
# 构建前端
npm run build

# 输出到 dist/ 目录
```

### 数据库初始化

```bash
# 创建数据库架构
wrangler d1 execute ph-sports-db --remote --file ./schema.sql

# 查看所有表
wrangler d1 execute ph-sports-db --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 🔒 认证和权限

### 用户角色

| 角色 | 描述 | 权限 |
|-----|------|------|
| **Student** | 学生用户 | 查看队伍、参加训练、预订场地、查看排行榜 |
| **Teacher** | 教师/教练 | 管理队伍、批准预订、发布公告、查看数据 |
| **Admin** | 系统管理员 | 完全访问所有功能 |

### 认证流程

1. 用户通过 `/auth/register` 注册或 `/auth/login` 登录
2. 后端返回 JWT token，存储在 `localStorage` 的 `ph_sports_access_token`
3. 所有 API 请求通过以下方式附加 token：
   - Authorization Header: `Bearer <token>`
   - 或 Query Parameter: `?token=<token>`

### 权限检查

```javascript
// 示例：仅学生可访问
<ProtectedRoute allowRoles={['student']}>
  <VenueBooking />
</ProtectedRoute>

// 示例：学生和教师可访问
<RoleRoute allowRoles={['student', 'teacher']}>
  <TrainingLog />
</RoleRoute>
```

---

## 📋 核心功能详解

### 1. 场地预订（VenueBooking）⭐ **新功能**

学生可以通过场地预订功能申请预订运动场地。

#### 功能流程
```
学生申请 → 状态：pending → 教师审核 → 批准/拒绝 → 最终状态
```

#### 学生工作流
1. 打开 **"Venue Booking"** 页面
2. 查看 2 周内可预订的时间槽
3. 点击时间槽打开预订表单
4. 填写详情：
   - 运动类型（必须是队伍成员的运动）
   - 场地
   - 时间和时长
   - 用途说明
5. 提交申请（初始状态：**pending**）
6. 等待教师批准

#### 教师工作流
1. 访问 **"Admin Panel"** 或 **"Venue Booking"** 页面
2. 查看所有待批准的预订请求
3. 点击预订查看详情
4. 选择：
   - ✅ **批准**：状态变为 approved
   - ❌ **拒绝**：可附加拒绝原因

#### API 端点
- `POST /api/venue-bookings` - 创建预订
- `GET /api/venue-bookings` - 列表查询
- `GET /api/venue-bookings/{id}` - 获取详情
- `PATCH /api/venue-bookings/{id}` - 更新预订
- `DELETE /api/venue-bookings/{id}` - 删除预订

#### 权限规则

| 操作 | 学生 | 教师 | 管理员 |
|-----|------|------|--------|
| 创建预订 | ✅ 限队伍成员 | ✅ | ✅ |
| 查看自己的预订 | ✅ | ✅ | ✅ |
| 查看他人预订 | ❌ | ✅ 仅自己教的运动 | ✅ |
| 批准/拒绝 | ❌ | ✅ | ✅ |
| 删除 | ✅ 仅自己的 | ✅ | ✅ |

#### 状态流转

```
pending ──愿意批准──> approved ──接受────> final_approved
   │                      │
   │                   拒绝
   └────────────────> rejected
```

📖 **详细指南**：见 [VENUE_BOOKING_GUIDE.md](./docs/VENUE_BOOKING_GUIDE.md)

### 2. 排行榜（Leaderboard）

实时显示队伍成员的训练排名。

**特性**：
- 按运动类型筛选
- 按训练时长、频率排名
- 本月统计数据
- 成就徽章

**数据来源**：
- `training_logs` 表中当月的训练记录
- 按 `duration`（时间）排序

### 3. 训练日志（TrainingLog）

记录学生的日常训练信息。

**记录字段**：
- 日期、时间
- 运动类型
- 时长（分钟）
- 强度等级
- 会话类型（独练/团练）
- 备注

### 4. 队伍管理（Teams）

学生查看所在队伍的成员和详情。

**功能**：
- 查看队伍成员列表
- 查看队伍排行榜
- 了解队伍统计信息

### 5. 管理员面板（AdminPanel）

系统管理员的中央管理界面。

**功能**：
- 用户管理：查看、编辑、删除用户
- 教师审核：批准或拒绝教师申请
- 场地管理：查看和管理所有场地预订
- 数据导出：获取系统数据报告

---

## 🗄️ 数据库架构

### 主要表结构

#### users（用户表）
```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE
full_name TEXT
role TEXT ('student', 'teacher', 'admin')
sport_coached TEXT (JSON array for teachers)
password_hash TEXT
password_salt TEXT
profile_complete BOOLEAN
teacher_status TEXT ('pending', 'approved', 'rejected')
created_at DATETIME
```

#### team_memberships（队伍成员表）
```sql
id TEXT PRIMARY KEY
user_email TEXT
user_name TEXT
sport TEXT
role TEXT ('member', 'captain')
created_at DATETIME
```

#### venue_bookings （场地预订表）⭐
```sql
id TEXT PRIMARY KEY
booked_by_email TEXT
booked_by_name TEXT
sport TEXT
venue TEXT
date DATE
time_slot TEXT (HH:MM)
duration INTEGER (minutes)
purpose TEXT
status TEXT ('pending', 'approved', 'rejected')
teacher_comment TEXT
created_at DATETIME
updated_at DATETIME
```

#### training_logs（训练日志表）
```sql
id TEXT PRIMARY KEY
user_email TEXT
user_name TEXT
sport TEXT
date DATE
duration INTEGER (minutes)
session_type TEXT ('personal', 'team')
intensity TEXT ('low', 'medium', 'high')
notes TEXT
created_at DATETIME
```

#### announcements（公告表）
```sql
id TEXT PRIMARY KEY
teacher_email TEXT
teacher_name TEXT
sport TEXT
title TEXT
content TEXT
priority TEXT ('normal', 'urgent')
created_at DATETIME
```

---

## 🔑 环境变量

创建 `.env.local` 文件（前端）：

```env
VITE_API_BASE_URL=http://localhost:8788/api
VITE_ADMIN_EMAIL=admin@sportsync.edu
```

`wrangler.toml` 配置（后端）：

```toml
[env.production]
database_id = "ph-sports-db"
database_name = "ph-sports"
```

---

## 🧪 测试

### 单元测试

```bash
npm run test
```

### 端到端测试

```bash
# 测试场地预订功能
bash test-venue-booking.sh
```

### 手动测试清单

- [ ] 学生注册和登录
- [ ] 学生加入队伍
- [ ] 学生查看排行榜
- [ ] 学生创建训练日志
- [ ] **学生提交场地预订申请** ⭐
- [ ] 教师批准/拒绝预订 ⭐
- [ ] 教师发布公告
- [ ] 管理员审核教师申请
- [ ] 管理员管理所有数据

---

## 📦 部署

### 部署到 Cloudflare Pages

#### 前置条件
- 安装 Wrangler CLI：`npm install -g wrangler`
- 认证：`wrangler login`

#### 自动部署

```bash
# 关联 GitHub 仓库到 Cloudflare Pages
# 每次推送到主分支时自动部署

# 或手动部署
wrangler pages deploy dist
```

#### 手动部署

```bash
# 1. 构建项目
npm run build

# 2. 部署前端
wrangler pages deploy dist

# 3. 部署后端（如果有变化）
wrangler deploy --env production
```

#### 配置 D1 数据库

```bash
# 创建远程数据库
wrangler d1 create ph-sports-db --remote

# 初始化架构
wrangler d1 execute ph-sports-db --remote --file ./schema.sql

# 验证
wrangler d1 execute ph-sports-db --remote --command "SELECT count(*) FROM users;"
```

---

## 🐛 常见问题和故障排查

### 问题 1：场地预订时出现 403 Forbidden

**原因**：学生不是所选运动的队伍成员

**解决**：
1. 确认已加入该运动的队伍
2. 检查队伍成员列表中是否包含自己
3. 联系教师添加到队伍

### 问题 2：API 请求返回 401 Unauthorized

**原因**：Token 过期或无效

**解决**：
1. 重新登录
2. 清除浏览器 cookie：`localStorage.removeItem('ph_sports_access_token')`
3. 刷新页面

### 问题 3：排行榜显示"No activity this month"

**原因**：训练日志数据不存在或日期不匹配

**解决**：
1. 检查是否创建了训练日志
2. 确认日期是当月
3. 检查运动类型是否正确

### 问题 4：构建失败

**解决**：
```bash
# 清理依赖
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 重新构建
npm run build
```

---

## 📝 贡献指南

### 开发流程

1. 创建功能分支：`git checkout -b feature/your-feature`
2. 提交更改：`git commit -m "feat: add your feature"`
3. 推送到远程：`git push origin feature/your-feature`
4. 创建 Pull Request

### 代码规范

- 使用 ESLint：`npm run lint`
- 代码格式化：遵循 Prettier 配置
- 组件文件：使用 `.jsx` 扩展名
- Hooks：优先使用函数式组件

---

## 📚 文档

- [场地预订使用指南](./docs/VENUE_BOOKING_GUIDE.md) - 学生和教师的详细说明 ⭐
- [技术实现细节](./docs/TECHNICAL_IMPLEMENTATION.md) - 开发者参考
- [API 文档](./docs/API.md) - 完整的 API 规范
- [数据库设计](./schema.sql) - SQL 架构文件

---

## 📊 项目统计

| 指标 | 值 |
|-----|-----|
| 前端组件 | 30+ |
| API 端点 | 15+ |
| 数据库表 | 7 |
| 支持的运动类型 | 5 |
| 最大用户数 | 无限 |

---

## 🔒 安全

- ✅ 密码哈希：SHA-256 + Salt
- ✅ Token 认证：JWT-like 实现
- ✅ CORS 配置：允许跨域请求
- ✅ SQL 注入防护：参数化查询
- ✅ 会话管理：14 天过期时间

---

## 📄 许可证

本项目为学校内部项目，版权所有。

---

## 👥 团队

- **开发**：GitHub Copilot + 学生开发团队
- **更新日期**：2026-04-07
- **最新版本**：1.0.0

---

## 📞 支持

有问题？

- 📧 联系管理员：admin@sportsync.edu
- 🐞 报告 Bug：提交 Issue
- 💡 功能建议：讨论区

---

## 🎉 最近更新

### 2026-04-07 - 场地预订功能发布 ⭐
- ✨ **新功能**：学生现在可以创建场地预订申请
- 🔄 预订自动设为 `pending` 状态等待教师批准
- 📢 改进了用户反馈消息
- 📖 添加了完整的使用指南和技术文档
- ✅ 所有权限和流程已验证

### 之前版本
- 队伍管理和成员查看
- 排行榜和训练日志
- 用户认证和角色管理
- 管理员面板

---

**快来加入 PH Sports！** 🏆

