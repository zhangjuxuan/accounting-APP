# 🐤 小鸡记账

一款带 AI 助手的极简记账应用。前端原生 HTML/CSS/JS，后端通过 DeepSeek 大模型提供会计问答、收支建议、健康度评价。

## 功能

- 📒 记账：收入/支出、分类、备注、日期、数字键盘
- 📊 统计：分类占比饼图、近 6 月趋势柱状图（ECharts）
- 🐤 AI 助手：会计知识问答、收支建议、收支健康度评价

## 目录结构

```
.
├── index.html          # 前端页面
├── app.js              # 前端逻辑（数据存 localStorage）
├── styles.css          # 样式
├── lib/
│   └── deepseek.js     # DeepSeek 调用与 Prompt（前后端共享逻辑）
├── server.js           # 本地/云服务器后端（Express）
├── api/                # Vercel Serverless 函数
│   ├── _helper.js      # 通用辅助（非端点）
│   └── ai/
│       ├── chat.js     # → /api/ai/chat
│       ├── advice.js   # → /api/ai/advice
│       └── health.js   # → /api/ai/health
├── vercel.json         # Vercel 配置
├── .env                # 环境变量（含密钥，不提交 git）
├── .env.example        # 环境变量示例
└── package.json
```

## 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量：复制 .env.example 为 .env，填入你的 DeepSeek API Key
cp .env.example .env

# 3. 启动
npm start

# 4. 浏览器访问
open http://localhost:3000
```

> 注意：必须通过 `http://localhost:3000` 访问（由 server.js 托管），直接双击打开 index.html 调不通 AI 接口。

## 部署到 Vercel

1. 把代码推到 GitHub（`.env` 和 `node_modules` 已被 `.gitignore` 忽略，不会上传）
2. 登录 [vercel.com](https://vercel.com)，New Project，导入该 GitHub 仓库
3. 在项目的 **Settings → Environment Variables** 中添加：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
   - `DEEPSEEK_BASE_URL` = `https://api.deepseek.com`（可选）
   - `DEEPSEEK_MODEL` = `deepseek-chat`（可选）
4. 点击 Deploy，等待部署完成，获得访问网址

> Vercel 会自动把 `api/` 目录下的文件变成接口，根目录的 index.html 等作为静态站点托管。前端调用路径 `/api/ai/*` 与本地一致，无需改动。

## 环境变量说明

| 变量 | 说明 | 必填 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek 控制台生成的 API Key | ✅ |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` | ❌ |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` | ❌ |
| `PORT` | 本地服务端口，默认 3000（Vercel 忽略） | ❌ |

## 安全提示

- `.env` 含密钥，**禁止提交到 git**（已配置忽略）
- 部署到 Vercel 时，密钥填在 Vercel 后台环境变量，不写进代码
- 若密钥曾经泄露，请到 DeepSeek 控制台重新生成
