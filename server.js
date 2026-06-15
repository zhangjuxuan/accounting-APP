/* ===================================================================
 * 小鸡记账 · 本地/云服务器后端（Express）
 * 职责：
 *   1. 托管前端静态文件（index.html / app.js / styles.css）
 *   2. 提供 AI 接口，复用 lib/deepseek.js（密钥藏在服务端）
 *
 * 说明：
 *   - 本地开发或部署到云服务器（如阿里云/腾讯云）时运行本文件。
 *   - 部署到 Vercel 时无需本文件，由 api/ 目录下的 serverless 函数提供同名接口。
 *
 * 接口：
 *   POST /api/ai/chat    会计知识问答
 *   POST /api/ai/advice  根据收支数据给建议
 *   POST /api/ai/health  收支健康度评价
 * =================================================================== */

'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const {
  callDeepSeek,
  buildChatMessages,
  buildAdviceMessages,
  buildHealthMessages
} = require('./lib/deepseek');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- 中间件 ----------
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname)); // 托管前端静态资源

// ---------- 统一错误响应 ----------
function sendError(res, e) {
  console.error('[AI接口异常]', e && e.message);
  let status = 500;
  let message = 'AI 服务暂时不可用，请稍后再试';
  if (e && e.code === 'NO_API_KEY') {
    message = '服务端未配置 API Key';
  } else if (e && e.name === 'AbortError') {
    status = 504;
    message = 'AI 响应超时，请稍后再试';
  }
  res.status(status).json({ code: 1, message: message });
}

// ===================================================================
// AI 接口
// ===================================================================

/** 会计知识问答 */
app.post('/api/ai/chat', async function (req, res) {
  try {
    const question = (req.body && req.body.question || '').toString().trim();
    if (!question) {
      return res.status(400).json({ code: 1, message: '问题不能为空' });
    }
    const answer = await callDeepSeek(buildChatMessages(question));
    res.json({ code: 0, message: 'success', data: { answer: answer } });
  } catch (e) {
    sendError(res, e);
  }
});

/** 根据收支数据给建议 */
app.post('/api/ai/advice', async function (req, res) {
  try {
    const answer = await callDeepSeek(buildAdviceMessages(req.body && req.body.summary));
    res.json({ code: 0, message: 'success', data: { answer: answer } });
  } catch (e) {
    sendError(res, e);
  }
});

/** 收支健康度评价 */
app.post('/api/ai/health', async function (req, res) {
  try {
    const answer = await callDeepSeek(buildHealthMessages(req.body && req.body.summary));
    res.json({ code: 0, message: 'success', data: { answer: answer } });
  } catch (e) {
    sendError(res, e);
  }
});

// 健康检查
app.get('/api/ping', function (req, res) {
  res.json({ code: 0, message: 'pong', hasKey: !!process.env.DEEPSEEK_API_KEY });
});

// ===================================================================
// 启动
// ===================================================================
app.listen(PORT, function () {
  console.log('========================================');
  console.log('  小鸡记账服务已启动');
  console.log('  访问地址: http://localhost:' + PORT);
  console.log('  API Key : ' + (process.env.DEEPSEEK_API_KEY ? '已配置 ✓' : '未配置 ✗'));
  console.log('========================================');
});
