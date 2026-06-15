/* ===================================================================
 * DeepSeek 调用与 Prompt 构造 - 共享模块
 * 同时被 Express(server.js) 与 Vercel Serverless(api/) 复用，避免重复。
 * =================================================================== */

'use strict';

const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const REQUEST_TIMEOUT_MS = 60000; // 大模型响应超时时间

const SYSTEM_PROMPT_BASE =
  '你是「小鸡记账」App 内置的智能记账助手，名字叫小鸡。你的风格亲切、专业、简洁。' +
  '回答使用中文，重点突出，适当使用要点列表，避免长篇大论。';

/**
 * 调用 DeepSeek 对话接口。
 * @param {Array} messages OpenAI 格式的消息数组
 * @returns {Promise<string>} 模型返回的文本内容
 * @throws {Error} 当密钥缺失、网络异常或接口返回错误时抛出（带 code 字段）
 */
async function callDeepSeek(messages) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const err = new Error('未配置 DEEPSEEK_API_KEY');
    err.code = 'NO_API_KEY';
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const resp = await fetch(DEEPSEEK_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages,
        temperature: 0.7,
        stream: false
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      const text = await resp.text();
      const err = new Error('DeepSeek 接口返回错误: ' + resp.status + ' ' + text);
      err.code = 'UPSTREAM_ERROR';
      throw err;
    }

    const data = await resp.json();
    // 逐层判空，避免级联取值 NPE
    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;
    if (!content) {
      const err = new Error('DeepSeek 返回内容为空');
      err.code = 'EMPTY_RESPONSE';
      throw err;
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 将前端传来的收支数据汇总成简洁文本摘要，供大模型理解。
 * @param {Object} summary 前端组织好的收支汇总对象
 * @returns {string} 文本摘要
 */
function buildFinanceSummary(summary) {
  if (!summary || typeof summary !== 'object') return '用户暂无记账数据。';

  const lines = [];
  if (summary.month) lines.push('统计月份：' + summary.month);
  if (typeof summary.income === 'number') lines.push('本月收入：' + summary.income.toFixed(2) + ' 元');
  if (typeof summary.expense === 'number') lines.push('本月支出：' + summary.expense.toFixed(2) + ' 元');
  if (typeof summary.balance === 'number') lines.push('本月结余：' + summary.balance.toFixed(2) + ' 元');

  if (Array.isArray(summary.expenseByCategory) && summary.expenseByCategory.length > 0) {
    lines.push('支出分类明细：');
    summary.expenseByCategory.forEach(function (c) {
      lines.push('  - ' + c.name + '：' + Number(c.value).toFixed(2) + ' 元');
    });
  }

  if (Array.isArray(summary.trend) && summary.trend.length > 0) {
    lines.push('近 6 月收支趋势：');
    summary.trend.forEach(function (t) {
      lines.push('  - ' + t.month + '：收入 ' + Number(t.income).toFixed(2) +
        ' 元，支出 ' + Number(t.expense).toFixed(2) + ' 元');
    });
  }

  return lines.join('\n');
}

/** 构造「会计知识问答」消息 */
function buildChatMessages(question) {
  return [
    { role: 'system', content: SYSTEM_PROMPT_BASE + ' 本次任务：回答用户的会计、理财、记账相关知识问题。若问题与财务无关，礼貌引导回记账话题。' },
    { role: 'user', content: question }
  ];
}

/** 构造「收支建议」消息 */
function buildAdviceMessages(summary) {
  const summaryText = buildFinanceSummary(summary);
  return [
    { role: 'system', content: SYSTEM_PROMPT_BASE + ' 本次任务：根据用户的历史收支情况，给出 3-5 条具体、可执行的理财与消费建议。' },
    { role: 'user', content: '这是我的收支数据：\n' + summaryText + '\n\n请给我一些实用的理财建议。' }
  ];
}

/** 构造「健康度评价」消息 */
function buildHealthMessages(summary) {
  const summaryText = buildFinanceSummary(summary);
  return [
    { role: 'system', content: SYSTEM_PROMPT_BASE +
      ' 本次任务：评价用户的收支健康度。请先给出一个 0-100 的健康度评分和一句总评，' +
      '再从储蓄率、支出结构、收支平衡三个维度简要点评，最后给一句鼓励的话。' },
    { role: 'user', content: '这是我的收支数据：\n' + summaryText + '\n\n请评价我的收支健康度。' }
  ];
}

module.exports = {
  callDeepSeek,
  buildFinanceSummary,
  buildChatMessages,
  buildAdviceMessages,
  buildHealthMessages
};
