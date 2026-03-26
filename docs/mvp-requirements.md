# 🖼️ RemoveBG Pro — 产品需求文档

> 文档版本：v2.0
> 更新日期：2026-03-26
> 负责人：小乐

---

## 1. 项目概述

| 项目 | 内容 |
|------|------|
| **产品名称** | RemoveBG Pro |
| **核心价值** | 一键去除图片背景，面向海外用户的 AI 工具，订阅制变现 |
| **目标用户** | 海外个人用户（设计师、电商卖家、内容创作者） |
| **目标市场** | 美国、欧洲为主 |
| **核心场景** | 快速获得透明背景图，无需复杂操作 |
| **验证目标** | 验证订阅付费路径，验证海外用户获取成本 |

---

## 2. 商业模式

### 2.1 收费模式

| 方案 | 内容 |
|------|------|
| **免费用户（游客）** | 每天 1 次处理额度（防滥用） |
| **免费用户（登录）** | 每月 20 次处理额度 |
| **Pro 订阅** | $8.8 / 月，无限次处理 |

### 2.2 变现路径

```
用户访问 → 免费处理 1~20 次 → 额度用完 → 引导订阅 Pro → PayPal 付款
                                                     ↓
                                            Webhook 同步订阅状态
                                                     ↓
                                              用户成为 Pro
```

### 2.3 支付体系

| 项目 | 方案 |
|------|------|
| **支付平台** | PayPal（个人账户可收海外款，提现到国内银行卡） |
| **订阅方式** | PayPal Billing API（跳转支付，移动端友好） |
| **订阅管理** | Webhook 同步订阅状态（取消/续费/退款自动处理） |
| **退款政策** | 用户在 PayPal 后台自行处理，我们不做自动化退款 |

---

## 3. 用户故事

### 游客用户
| 身份 | 故事 |
|------|------|
| 作为游客 | 我打开页面，不用注册就能处理 1 张图片 |
| 作为游客 | 额度用完后，页面提示我登录或订阅 |
| 作为游客 | 不想注册，我就离开了（降低门槛） |

### 登录用户
| 身份 | 故事 |
|------|------|
| 作为普通用户 | 我用 Google 账号登录，不需另外注册 |
| 作为普通用户 | 登录后每月有 20 次免费额度 |
| 作为普通用户 | 我能看到自己剩余多少额度 |
| 作为普通用户 | 额度用完，我可以升级到 Pro |

### Pro 用户
| 身份 | 故事 |
|------|------|
| 作为 Pro 用户 | 我订阅后无限次使用，不受额度限制 |
| 作为 Pro 用户 | 我的订阅状态在下次扣款前自动保持有效 |
| 作为 Pro 用户 | 我可以在 PayPal 后台随时取消订阅 |

---

## 4. 功能范围

### 4.1 MVP 必须有

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 图片上传 | 支持点击上传（手机调起相机/相册），支持拖拽，限制 jpg/png，最大 5MB | P0 |
| 背景移除 | 调用 remove.bg API，返回透明背景 PNG | P0 |
| 结果预览 | 棋盘格背景展示透明图，支持原图/结果图切换 | P0 |
| 一键下载 | 下载 PNG 文件到本地 | P0 |
| Google 登录 | 一键 Google 授权登录 | P0 |
| 额度管理 | 登录用户每月 20 次，Pro 用户不限 | P0 |
| 游客限制 | 游客每天 1 次（cookie 记录） | P0 |
| PayPal 订阅 | 升级 Pro 按钮，跳转 PayPal 付款 | P0 |
| 订阅状态同步 | Webhook 接收 PayPal 事件，更新用户订阅状态 | P0 |
| 移动端适配 | iOS Safari / Android 主流浏览器可用 | P0 |

### 4.2 后续迭代

| 功能 | 备注 |
|------|------|
| 历史记录 | 登录用户查看历史处理记录 |
| 换背景色 | 给透明图换个背景色 |
| 批量处理 | 一次上传多张 |
| 推广奖励 | 邀请好友得额外额度 |
| Stripe 接入 | Stripe 作为 PayPal 替代支付 |

---

## 5. 用户流程

### 5.1 主流程

```
用户打开页面
    │
    ├─ 未登录 ──────────────────────────────────┐
    │   游客可处理 1 张/天                        │
    │   点击上传 → 处理 → 下载                    │
    │   额度用完 → 引导登录/订阅                 │
    │                                            │
    └─ 已登录（免费用户）────────────────────────┤
    │   每月 20 次额度                           │
    │   点击上传 → 检查额度 → 处理 → 下载         │
    │   额度用完 → 引导订阅 Pro                  │
    │                                            │
    └─ 已登录（Pro 用户）────────────────────────┤
        无限制使用
        点击上传 → 处理 → 下载
```

### 5.2 订阅升级流程

```
用户点击 "Upgrade to Pro ($8.8/mo)"
    ↓
前端请求 /api/paypal/create-subscription
    ↓
后端调用 PayPal Billing API，获取 approval_url
    ↓
前端跳转到 PayPal 付款页面
    ↓
用户付款成功，PayPal 回调我们的 Webhook
    ↓
我们更新用户订阅状态 → plan='pro', status='active'
    ↓
用户页面刷新，显示 Pro 状态
```

---

## 6. 技术架构

### 6.1 技术栈

| 层级 | 技术方案 |
|------|---------|
| **前端框架** | Next.js 16 (App Router) |
| **样式** | Tailwind CSS |
| **登录认证** | Auth.js (NextAuth v5) + Google OAuth |
| **数据库** | Cloudflare D1 (SQLite) |
| **ORM** | Drizzle ORM |
| **支付** | PayPal Checkout / Billing API |
| **图片处理 API** | remove.bg API |
| **部署** | Cloudflare Pages |
| **域名** | Cloudflare 管理（已接入） |

### 6.2 系统架构图

```
┌─────────────────┐
│   用户浏览器      │
│  (H5 / PC)      │
└────────┬────────┘
         │
         │ HTTPS
         ▼
┌─────────────────────────────────┐
│      Cloudflare Pages           │
│  ┌───────────┐  ┌────────────┐ │
│  │  Next.js   │  │ Auth.js    │ │
│  │  前端页面   │  │ Google登录  │ │
│  └─────┬─────┘  └─────┬──────┘ │
│        │              │         │
│  ┌─────▼──────────────▼──────┐ │
│  │      API Routes           │ │
│  │  /api/remove-bg           │ │
│  │  /api/paypal/checkout     │ │
│  │  /api/paypal/webhook      │ │
│  │  /api/user/status         │ │
│  └─────┬─────────────────────┘ │
└────────┼────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│         Cloudflare D1           │
│  ┌─────────┐  ┌─────────────┐  │
│  │  users  │  │subscriptions│  │
│  │  用户表  │  │  订阅表      │  │
│  └─────────┘  └─────────────┘  │
│  ┌─────────────┐                │
│  │  usage_logs │                │
│  │  使用记录表  │                │
│  └─────────────┘                │
└─────────────────────────────────┘
         │
         │ Webhook
         ▼
┌─────────────────┐
│   PayPal API    │
│  (订阅/支付)     │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   remove.bg API │
│  (图片处理)      │
└─────────────────┘
```

---

## 7. 数据库设计

### 7.1 ER 图

```
users ────────────── subscriptions
┌──────────┐         ┌──────────────────┐
│ id (PK)   │────────▶│ user_id (FK)      │
│ email     │         │ id (PK)           │
│ name      │         │ paypal_customer_id│
│ avatar_url│         │ plan (free/pro)   │
│ created_at│         │ status (active/..)│
└──────────┘         │ credits           │
                     │ current_period_end│
                     │ created_at        │
                     └──────────────────┘
                            ▲
                            │
usage_logs ─────────────────┘
┌────────────┐
│ id (PK)     │
│ user_id(FK)│
│ action      │
│ credits_used│
│ created_at  │
└────────────┘
```

### 7.2 表结构（SQLite D1）

```sql
-- 用户表
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- Google sub (唯一标识)
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- 订阅表
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,             -- 随机 ID
  user_id TEXT NOT NULL REFERENCES users(id),
  paypal_customer_id TEXT UNIQUE,  -- PayPal 客户 ID
  paypal_subscription_id TEXT UNIQUE,-- PayPal 订阅 ID
  plan TEXT DEFAULT 'free',        -- 'free' | 'pro'
  status TEXT DEFAULT 'inactive',  -- 'active' | 'inactive' | 'canceled' | 'past_due'
  credits INTEGER DEFAULT 20,      -- 当月剩余额度
  current_period_end TEXT,          -- 本次订阅到期时间
  created_at TEXT DEFAULT (datetime('now'))
);

-- 使用记录表
CREATE TABLE usage_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  guest_token TEXT,                 -- 游客 token（cookie 关联）
  action TEXT NOT NULL,            -- 'remove_bg'
  credits_used INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

## 8. API 设计

### 8.1 现有 API

#### POST `/api/remove-bg`
> 处理图片，去除背景

**请求：**
```json
{
  "image": "data:image/png;base64,xxxxx"  // base64 或 FormData
}
```

**响应：**
```json
{
  "result": "data:image/png;base64,xxxxx"
}
```

**业务逻辑：**
1. 检查用户 session，获取 user_id
2. 无 session → 检查游客 cookie 记录（每天 1 次）
3. 有 session → 检查 D1 里 credits > 0
4. credits 不足 → 返回 402 `{ "error": "额度用完，请升级 Pro" }`
5. 调用 remove.bg API
6. 记录 usage_log，扣减 credits
7. 返回结果

---

### 8.2 新增 API

#### POST `/api/paypal/create-subscription`
> 创建 PayPal 订阅，返回支付链接

**需要登录**

**请求：**
```json
{
  // 无需参数，plan 固定 $8.8/mo
}
```

**响应：**
```json
{
  "approvalUrl": "https://www.paypal.com/xxxxx",
  "subscriptionId": "xxxxx"
}
```

---

#### POST `/api/paypal/webhook`
> 接收 PayPal 事件通知，同步订阅状态

**PayPal 发送的事件：**

| 事件类型 | 处理动作 |
|---------|---------|
| `BILLING.SUBSCRIPTION.CREATED` | 记录 subscription_id，更新 plan='pro', status='active' |
| `BILLING.SUBSCRIPTION.CANCELLED` | 更新 status='canceled' |
| `BILLING.SUBSCRIPTION.PAYMENT.FAILED` | 更新 status='past_due' |
| `BILLING.SUBSCRIPTION.RE-ACTIVATED` | 更新 status='active' |

**响应：** HTTP 200（必须，否则 PayPal 会重试）

---

#### GET `/api/user/status`
> 获取当前用户状态（是否登录、额度、订阅信息）

**需要登录**

**响应：**
```json
{
  "isLoggedIn": true,
  "user": {
    "id": "xxxxx",
    "name": "John",
    "email": "john@gmail.com",
    "avatarUrl": "https://..."
  },
  "subscription": {
    "plan": "pro",
    "status": "active",
    "credits": 999,
    "currentPeriodEnd": "2026-04-26T00:00:00Z"
  }
}
```

---

## 9. 前端页面结构

### 9.1 首页 (`/`)

```
┌──────────────────────────────────────────┐
│  Header                                  │
│  [Logo]              [Sign in with Google]│
│                      [avatar] [Credits]   │
├──────────────────────────────────────────┤
│  Hero                                    │
│  🖼️ One-click background removal          │
│  Free, fast, no signup needed            │
├──────────────────────────────────────────┤
│  Upload Area                             │
│  ┌────────────────────────────────────┐  │
│  │     📤                             │  │
│  │     Click or drag to upload        │  │
│  │     JPG/PNG, max 5MB               │  │
│  │     📷 Take a photo (mobile)       │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  Preview + Actions                       │
│  [Preview Image]                         │
│  [✨ Remove Background]                  │
│  [⬇️ Download PNG]                       │
├──────────────────────────────────────────┤
│  Upgrade Prompt (when limited)           │
│  ┌────────────────────────────────────┐  │
│  │  ⚠️ You've used X/Y credits        │  │
│  │  [Upgrade to Pro $8.8/mo]          │  │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  Footer                                  │
│  © 2026 RemoveBG Pro                    │
└──────────────────────────────────────────┘
```

### 9.2 用户状态展示

| 状态 | Header 显示 |
|------|------------|
| 游客 | 「Sign in with Google」按钮 |
| 登录免费用户 | 头像 + 「X/20 credits」+ 「Upgrade」按钮 |
| 登录 Pro 用户 | 头像 + 「Pro ✨」+ 无需显示额度 |

---

## 10. 交互细节

### 10.1 额度扣减规则

| 用户类型 | 触发条件 | 扣减 |
|---------|---------|------|
| 游客 | 每天首次处理 | -1（重置周期：次日 00:00 UTC）|
| 免费用户 | 每月处理 | -1（重置周期：次月 1日 00:00 UTC）|
| Pro 用户 | 任意处理 | 不扣减 |

### 10.2 额度用完提示

```
┌─────────────────────────────────────┐
│  ⚠️  You’ve used all 20 credits    │
│                                     │
│  Sign in for more free credits,    │
│  or upgrade to Pro for unlimited.   │
│                                     │
│  [Sign in with Google]              │
│  [Upgrade to Pro $8.8/mo]           │
└─────────────────────────────────────┘
```

### 10.3 支付流程 UI

1. 用户点击「Upgrade to Pro」
2. 按钮变为「Redirecting to PayPal...」
3. 页面跳转到 PayPal
4. 付款成功后，PayPal 重定向回 `/?success=true`
5. 前端检测 query param，显示「✅ Upgrade successful!」

---

## 11. 环境变量

```env
# Auth.js
AUTH_SECRET=xxxxxxxxxxxxxxxxxxxx
AUTH_GOOGLE_ID=xxxxxxxxxxxxxxxxxxxx
AUTH_GOOGLE_SECRET=xxxxxxxxxxxxxxxxxxxx
AUTH_URL=https://image-background-remover.zhuwd.com

# PayPal
PAYPAL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
PAYPAL_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
PAYPAL_WEBHOOK_ID=xxxxxxxxxxxxxxxxxxxx
PAYPAL_MODE=sandbox                  # sandbox | live

# remove.bg
REMOVE_BG_API_KEY=xxxxxxxxxxxxxxxxxxxx
```

---

## 12. 第三方服务申请

| 服务 | 申请地址 | 备注 |
|------|---------|------|
| Google OAuth | https://console.cloud.google.com/apis/credentials | 需要添加 Authorized redirect URI |
| PayPal | https://developer.paypal.com/ | 申请 Sandbox + Live App |
| remove.bg | https://www.remove.bg/api | 免费 50 次/月 |

---

## 13. 验收标准

### 功能验收

- [ ] 游客每天可处理 1 张图片
- [ ] Google 登录正常（成功获取 session）
- [ ] 登录用户每月 20 次额度，扣减正确
- [ ] 额度用完正确返回 402 提示
- [ ] PayPal 订阅跳转正常
- [ ] Webhook 正确同步订阅状态
- [ ] Pro 用户无限次使用
- [ ] 移动端 iOS Safari 可正常上传（点击调用相机/相册）

### 非功能验收

- [ ] Lighthouse Performance > 80
- [ ] 页面加载 < 3s（3G 环境）
- [ ] 移动端布局完整，无横向溢出
- [ ] 部署到 Cloudflare Pages 正常运行

---

## 14. 第一阶段开发任务

| 任务 | 文件 | 状态 |
|------|------|------|
| 安装依赖（auth-js, drizzle-orm, paypal-sdk） | package.json | ⬜ |
| 配置 Auth.js + Google Provider | auth.ts, auth.config.ts | ⬜ |
| 创建 middleware.ts | middleware.ts | ⬜ |
| 创建数据库 Schema | src/db/schema.ts | ⬜ |
| 创建 Drizzle 配置 | drizzle.config.ts | ⬜ |
| 创建 Auth API 路由 | src/app/api/auth/[...nextauth]/route.ts | ⬜ |
| 创建用户状态查询 API | src/app/api/user/status/route.ts | ⬜ |
| 改造 remove-bg API（加额度检查） | src/app/api/remove-bg/route.ts | ⬜ |
| 改造前端（加登录按钮/用户信息） | src/app/page.tsx | ⬜ |
| 配置环境变量 | .env.local | ⬜ |

---

## 15. 迭代记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2026-03-19 | 初始 MVP 文档（无登录/付费）|
| v2.0 | 2026-03-26 | 增加登录体系 + PayPal 订阅 + 额度管理 |

---

_文档状态：待评审_
_下次更新：第一阶段开发完成后更新代码关联_
