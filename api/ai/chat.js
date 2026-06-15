/* 会计知识问答 - Vercel Serverless 接口  →  POST /api/ai/chat */
'use strict';

const { callDeepSeek, buildChatMessages } = require('../../lib/deepseek');
const { sendError, ensurePost } = require('../_helper');

module.exports = async function handler(req, res) {
  if (!ensurePost(req, res)) return;
  try {
    const question = (req.body && req.body.question || '').toString().trim();
    if (!question) {
      return res.status(400).json({ code: 1, message: '问题不能为空' });
    }
    const answer = await callDeepSeek(buildChatMessages(question));
    res.status(200).json({ code: 0, message: 'success', data: { answer: answer } });
  } catch (e) {
    sendError(res, e);
  }
};
