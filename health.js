/* 收支健康度评价 - Vercel Serverless 接口  →  POST /api/ai/health */
'use strict';

const { callDeepSeek, buildHealthMessages } = require('../../lib/deepseek');
const { sendError, ensurePost } = require('../_helper');

module.exports = async function handler(req, res) {
  if (!ensurePost(req, res)) return;
  try {
    const summary = req.body && req.body.summary;
    const answer = await callDeepSeek(buildHealthMessages(summary));
    res.status(200).json({ code: 0, message: 'success', data: { answer: answer } });
  } catch (e) {
    sendError(res, e);
  }
};
