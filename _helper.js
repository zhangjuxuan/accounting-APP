/* ===================================================================
 * Vercel Serverless 通用辅助
 * 文件名以 _ 开头，不会被 Vercel 当作可访问的接口端点。
 * =================================================================== */

'use strict';

/**
 * 统一错误响应。
 * @param {Object} res Vercel 响应对象
 * @param {Error} e 异常对象
 */
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

/**
 * 仅允许 POST 方法，否则返回 405。
 * @returns {boolean} 校验是否通过
 */
function ensurePost(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ code: 1, message: '仅支持 POST 请求' });
    return false;
  }
  return true;
}

module.exports = { sendError, ensurePost };
