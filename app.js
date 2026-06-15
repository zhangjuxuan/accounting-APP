/* ===================================================================
 * 简记 · 记账 App 核心逻辑
 * 数据存储：localStorage（key: jianji_records）
 * 单条记录结构：
 *   { id, type:'expense'|'income', category, amount, remark, date:'YYYY-MM-DD', ts }
 * =================================================================== */

(function () {
  'use strict';

  // ---------- 存储常量 ----------
  var STORAGE_KEY = 'jianji_records';

  // ---------- 分类预设 ----------
  var CATEGORIES = {
    expense: [
      { name: '餐饮', icon: '🍜' },
      { name: '交通', icon: '🚌' },
      { name: '购物', icon: '🛍️' },
      { name: '娱乐', icon: '🎮' },
      { name: '居住', icon: '🏠' },
      { name: '通讯', icon: '📱' },
      { name: '医疗', icon: '💊' },
      { name: '教育', icon: '📚' },
      { name: '旅行', icon: '✈️' },
      { name: '其他', icon: '📦' }
    ],
    income: [
      { name: '工资', icon: '💰' },
      { name: '兼职', icon: '🧰' },
      { name: '理财', icon: '📈' },
      { name: '红包', icon: '🧧' },
      { name: '退款', icon: '↩️' },
      { name: '其他', icon: '📦' }
    ]
  };

  // ---------- 工具函数 ----------

  /** 读取全部记录 */
  function loadRecords() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('读取记录失败', e);
      return [];
    }
  }

  /** 保存全部记录 */
  function saveRecords(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  /** 金额格式化为两位小数字符串 */
  function fmtMoney(n) {
    return (Math.round(n * 100) / 100).toFixed(2);
  }

  /** 获取 YYYY-MM 格式 */
  function monthKey(dateStr) {
    return dateStr.slice(0, 7);
  }

  /** 今日 YYYY-MM-DD */
  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /** 生成唯一 id */
  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /** 日期展示：MM月DD日 周X */
  function fmtDayLabel(dateStr) {
    var d = new Date(dateStr + 'T00:00:00');
    var week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var t = today();
    if (dateStr === t) return '今天 ' + week;
    return mm + '月' + dd + '日 ' + week;
  }

  /** 根据分类名取 icon */
  function getIcon(type, cateName) {
    var arr = CATEGORIES[type] || [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].name === cateName) return arr[i].icon;
    }
    return '📦';
  }

  // ---------- 全局状态 ----------
  var state = {
    records: loadRecords(),
    currentMonth: today().slice(0, 7),   // 首页展示的月份
    statsMonth: today().slice(0, 7),     // 统计页月份
    statsType: 'expense',                // 统计页收支切换
    // 记账弹层临时态
    record: {
      type: 'expense',
      category: '',
      amountStr: '0',
      remark: '',
      date: today()
    }
  };

  // ---------- DOM 引用 ----------
  var $ = function (id) { return document.getElementById(id); };

  // ===================================================================
  // 一、首页渲染
  // ===================================================================

  /** 计算指定月份的收入/支出/结余 */
  function calcMonthSummary(month) {
    var income = 0, expense = 0;
    state.records.forEach(function (r) {
      if (monthKey(r.date) === month) {
        if (r.type === 'income') income += r.amount;
        else expense += r.amount;
      }
    });
    return { income: income, expense: expense, balance: income - expense };
  }

  /** 渲染首页汇总 + 账单列表 */
  function renderHome() {
    var month = state.currentMonth;
    var sum = calcMonthSummary(month);

    $('home-month').textContent = month.replace('-', ' 年 ') + ' 月';
    $('home-expense').textContent = fmtMoney(sum.expense);
    $('home-income').textContent = fmtMoney(sum.income);
    $('home-balance').textContent = fmtMoney(sum.balance);

    // 取当月记录，按日期倒序分组
    var monthRecords = state.records.filter(function (r) {
      return monthKey(r.date) === month;
    });

    var listEl = $('home-bill-list');
    var emptyEl = $('home-empty');

    if (monthRecords.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    // 按日期分组
    var groups = {};
    monthRecords.forEach(function (r) {
      if (!groups[r.date]) groups[r.date] = [];
      groups[r.date].push(r);
    });

    // 日期倒序
    var days = Object.keys(groups).sort(function (a, b) {
      return b.localeCompare(a);
    });

    var html = '';
    days.forEach(function (day) {
      var dayRecords = groups[day];
      var dayIncome = 0, dayExpense = 0;
      dayRecords.forEach(function (r) {
        if (r.type === 'income') dayIncome += r.amount;
        else dayExpense += r.amount;
      });

      html += '<div class="bill-day-group">';
      html += '<div class="bill-day-header">';
      html += '<span>' + fmtDayLabel(day) + '</span>';
      html += '<span>支出 ' + fmtMoney(dayExpense) + ' · 收入 ' + fmtMoney(dayIncome) + '</span>';
      html += '</div>';

      dayRecords.forEach(function (r) {
        var sign = r.type === 'expense' ? '-' : '+';
        html += '<div class="bill-item">';
        html += '<div class="bill-icon">' + getIcon(r.type, r.category) + '</div>';
        html += '<div class="bill-info">';
        html += '<div class="bill-cate">' + escapeHtml(r.category) + '</div>';
        if (r.remark) {
          html += '<div class="bill-remark">' + escapeHtml(r.remark) + '</div>';
        }
        html += '</div>';
        html += '<div class="bill-amount ' + r.type + '">' + sign + fmtMoney(r.amount) + '</div>';
        html += '<div class="bill-del" data-del="' + r.id + '">✕</div>';
        html += '</div>';
      });

      html += '</div>';
    });

    listEl.innerHTML = html;

    // 绑定删除事件
    var dels = listEl.querySelectorAll('[data-del]');
    dels.forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-del');
        if (confirm('确定删除这条记录吗？')) {
          deleteRecord(id);
        }
      });
    });
  }

  /** 简易 HTML 转义，防止备注里的特殊字符破坏结构 */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ===================================================================
  // 二、记录增删
  // ===================================================================

  /** 新增一条记录 */
  function addRecord(rec) {
    state.records.push(rec);
    saveRecords(state.records);
  }

  /** 删除记录 */
  function deleteRecord(id) {
    state.records = state.records.filter(function (r) { return r.id !== id; });
    saveRecords(state.records);
    renderHome();
  }

  // ===================================================================
  // 三、记账弹层
  // ===================================================================

  /** 打开记账弹层 */
  function openRecordModal() {
    // 重置临时态
    state.record = {
      type: 'expense',
      category: '',
      amountStr: '0',
      remark: '',
      date: today()
    };
    // 同步 UI
    syncRecordSeg();
    renderCategoryGrid();
    $('record-remark').value = '';
    $('record-date').value = state.record.date;
    updateAmountDisplay();
    $('amount-cate').textContent = '点击自定义分类';
    $('amount-cate').classList.add('cate-editable');
    $('record-modal').classList.add('show');
  }

  /** 关闭记账弹层 */
  function closeRecordModal() {
    $('record-modal').classList.remove('show');
  }

  /** 同步弹层收支分段控件高亮 */
  function syncRecordSeg() {
    var btns = $('record-seg').querySelectorAll('.seg-btn');
    btns.forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-rtype') === state.record.type);
    });
  }

  /** 渲染分类网格 */
  function renderCategoryGrid() {
    var grid = $('category-grid');
    var list = CATEGORIES[state.record.type];
    var html = '';
    list.forEach(function (c) {
      var active = c.name === state.record.category ? ' active' : '';
      html += '<div class="cate-cell' + active + '" data-cate="' + c.name + '">';
      html += '<div class="cate-icon">' + c.icon + '</div>';
      html += '<div class="cate-name">' + c.name + '</div>';
      html += '</div>';
    });
    grid.innerHTML = html;

    // 绑定分类点击（再次点击取消选中）
    grid.querySelectorAll('[data-cate]').forEach(function (el) {
      el.addEventListener('click', function () {
        var clicked = el.getAttribute('data-cate');
        if (state.record.category === clicked) {
          // 再次点击同一个分类 → 取消选中
          state.record.category = '';
          $('amount-cate').textContent = '点击自定义分类';
          $('amount-cate').classList.add('cate-editable');
        } else {
          state.record.category = clicked;
          $('amount-cate').textContent = state.record.category;
          $('amount-cate').classList.remove('cate-editable');
        }
        renderCategoryGrid();
      });
    });
  }

  /** 更新金额显示 */
  function updateAmountDisplay() {
    var s = state.record.amountStr;
    // 显示时若是整数则补 .00 由用户继续输入，这里直接展示原始串
    $('amount-text').textContent = s === '' ? '0' : s;
  }

  /** 处理数字键盘输入 */
  function handleKey(key) {
    var r = state.record;
    if (key === 'del') {
      r.amountStr = r.amountStr.length > 1 ? r.amountStr.slice(0, -1) : '0';
    } else if (key === 'clear') {
      r.amountStr = '0';
    } else if (key === '.') {
      if (r.amountStr.indexOf('.') === -1) r.amountStr += '.';
    } else if (key === 'ok') {
      submitRecord();
      return;
    } else {
      // 数字键
      if (r.amountStr === '0') r.amountStr = key;
      else {
        // 限制小数点后两位
        var dot = r.amountStr.indexOf('.');
        if (dot !== -1 && r.amountStr.length - dot > 2) return;
        r.amountStr += key;
      }
    }
    updateAmountDisplay();
  }

  /** 提交记账 */
  function submitRecord() {
    var r = state.record;
    var amount = parseFloat(r.amountStr) || 0;

    if (!r.category) {
      alert('请先选择一个分类');
      return;
    }
    if (amount <= 0) {
      alert('请输入有效金额');
      return;
    }

    addRecord({
      id: genId(),
      type: r.type,
      category: r.category,
      amount: amount,
      remark: $('record-remark').value.trim(),
      date: $('record-date').value || today(),
      ts: Date.now()
    });

    closeRecordModal();
    // 记账后跳回首页并定位到记账所在月份
    state.currentMonth = monthKey($('record-date').value || today());
    switchPage('home');
    renderHome();
  }

  // ===================================================================
  // 四、统计页（ECharts）
  // ===================================================================

  var chartCategory = null;
  var chartTrend = null;

  /** 渲染统计页 */
  function renderStats() {
    var month = state.statsMonth;
    var type = state.statsType;
    var sum = calcMonthSummary(month);

    $('stats-income').textContent = fmtMoney(sum.income);
    $('stats-expense').textContent = fmtMoney(sum.expense);
    $('stats-balance').textContent = fmtMoney(sum.balance);

    renderCategoryChart(month, type);
    renderTrendChart(type);
  }

  /** 分类占比饼图 */
  function renderCategoryChart(month, type) {
    var box = $('chart-category');
    var emptyEl = $('stats-empty');

    // 聚合当月指定类型的分类金额
    var map = {};
    state.records.forEach(function (r) {
      if (monthKey(r.date) === month && r.type === type) {
        map[r.category] = (map[r.category] || 0) + r.amount;
      }
    });

    var data = Object.keys(map).map(function (k) {
      return { name: k, value: Math.round(map[k] * 100) / 100 };
    }).sort(function (a, b) { return b.value - a.value; });

    if (data.length === 0) {
      emptyEl.style.display = 'block';
      if (chartCategory) chartCategory.clear();
      return;
    }
    emptyEl.style.display = 'none';

    if (!chartCategory) chartCategory = echarts.init(box);
    chartCategory.setOption({
      tooltip: { trigger: 'item', formatter: '{b}: {c} 元 ({d}%)' },
      legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie',
        radius: ['38%', '62%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { formatter: '{b}\n{d}%', fontSize: 11 },
        data: data
      }]
    });
  }

  /** 近 6 月趋势柱状图 */
  function renderTrendChart(type) {
    var box = $('chart-trend');

    // 以 statsMonth 为基准，往前推 6 个月
    var base = new Date(state.statsMonth + '-01T00:00:00');
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      var mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      months.push(mk);
    }

    var values = months.map(function (mk) {
      var total = 0;
      state.records.forEach(function (r) {
        if (monthKey(r.date) === mk && r.type === type) total += r.amount;
      });
      return Math.round(total * 100) / 100;
    });

    var labels = months.map(function (mk) { return mk.slice(5) + '月'; });
    var color = type === 'expense' ? '#4caf7d' : '#e8734a';

    if (!chartTrend) chartTrend = echarts.init(box);
    chartTrend.setOption({
      tooltip: { trigger: 'axis', formatter: '{b}: {c} 元' },
      grid: { left: 40, right: 16, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
      series: [{
        type: 'bar',
        data: values,
        barWidth: '50%',
        itemStyle: { color: color, borderRadius: [4, 4, 0, 0] }
      }]
    });
  }

  // ===================================================================
  // 五、页面切换
  // ===================================================================

  /** 切换底部 Tab 页面 */
  function switchPage(page) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
    });
    $('page-' + page).classList.add('active');

    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-page') === page);
    });

    if (page === 'home') renderHome();
    if (page === 'stats') {
      renderStats();
      // 图表需在可见后 resize 以正确计算尺寸
      setTimeout(function () {
        if (chartCategory) chartCategory.resize();
        if (chartTrend) chartTrend.resize();
      }, 50);
    }
  }

  // ===================================================================
  // 六、事件绑定
  // ===================================================================

  function bindEvents() {
    // 底部 Tab 切换
    document.querySelectorAll('.tab-item').forEach(function (t) {
      t.addEventListener('click', function () {
        switchPage(t.getAttribute('data-page'));
      });
    });

    // ＋ 记账按钮
    $('btn-add').addEventListener('click', openRecordModal);

    // 弹层取消 / 遮罩关闭
    $('record-cancel').addEventListener('click', closeRecordModal);
    $('record-mask').addEventListener('click', closeRecordModal);
    // 顶部保存按钮
    $('record-save').addEventListener('click', submitRecord);

    // 弹层收支切换
    $('record-seg').querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.record.type = b.getAttribute('data-rtype');
        state.record.category = '';
        syncRecordSeg();
        renderCategoryGrid();
        $('amount-cate').textContent = '点击自定义分类';
        $('amount-cate').classList.add('cate-editable');
      });
    });

    // 点击分类文字区域 → 切换为输入框，可编辑/删除自定义分类
    $('amount-cate').addEventListener('click', function () {
      // 切换为输入框模式
      var input = $('amount-cate-input');
      var label = $('amount-cate');
      input.value = state.record.category || '';
      label.style.display = 'none';
      input.style.display = 'inline-block';
      input.focus();
    });

    // 输入框失焦时，保存自定义分类并切回文字显示
    $('amount-cate-input').addEventListener('blur', function () {
      var input = $('amount-cate-input');
      var label = $('amount-cate');
      var val = input.value.trim();
      state.record.category = val;
      input.style.display = 'none';
      label.style.display = 'inline-block';
      if (val) {
        label.textContent = val;
        label.classList.remove('cate-editable');
      } else {
        label.textContent = '点击自定义分类';
        label.classList.add('cate-editable');
      }
      renderCategoryGrid(); // 取消网格高亮（自定义分类不在预设列表中）
    });

    // 输入框按回车也确认
    $('amount-cate-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        $('amount-cate-input').blur();
      }
    });

    // 数字键盘
    $('keypad').querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        handleKey(b.getAttribute('data-key'));
      });
    });

    // 统计页月份选择
    $('stats-month').addEventListener('change', function () {
      state.statsMonth = this.value;
      renderStats();
    });

    // 统计页收支切换
    $('stats-seg').querySelectorAll('.seg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.statsType = b.getAttribute('data-type');
        $('stats-seg').querySelectorAll('.seg-btn').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        renderStats();
      });
    });

    // 窗口尺寸变化时 resize 图表
    window.addEventListener('resize', function () {
      if (chartCategory) chartCategory.resize();
      if (chartTrend) chartTrend.resize();
    });

    // AI 助手事件绑定
    bindAiEvents();
  }

  // ===================================================================
  // 六点五、AI 助手
  // ===================================================================

  /** AI 请求进行中标志，防止重复提交 */
  var aiLoading = false;

  /**
   * 组织当前统计月份的收支摘要，作为 AI 上下文。
   * @returns {Object} 收支汇总对象
   */
  function buildAiSummary() {
    var month = state.statsMonth;
    var sum = calcMonthSummary(month);

    // 当月支出分类聚合
    var map = {};
    state.records.forEach(function (r) {
      if (monthKey(r.date) === month && r.type === 'expense') {
        map[r.category] = (map[r.category] || 0) + r.amount;
      }
    });
    var expenseByCategory = Object.keys(map).map(function (k) {
      return { name: k, value: Math.round(map[k] * 100) / 100 };
    }).sort(function (a, b) { return b.value - a.value; });

    // 近 6 月趋势
    var base = new Date(month + '-01T00:00:00');
    var trend = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      var mk = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      var mIncome = 0, mExpense = 0;
      state.records.forEach(function (r) {
        if (monthKey(r.date) === mk) {
          if (r.type === 'income') mIncome += r.amount;
          else mExpense += r.amount;
        }
      });
      trend.push({
        month: mk,
        income: Math.round(mIncome * 100) / 100,
        expense: Math.round(mExpense * 100) / 100
      });
    }

    return {
      month: month,
      income: sum.income,
      expense: sum.expense,
      balance: sum.balance,
      expenseByCategory: expenseByCategory,
      trend: trend
    };
  }

  /**
   * 极简 Markdown 转 HTML：支持 **加粗**、- 列表、换行。
   * 仅用于展示 AI 返回内容，输入已做转义。
   */
  function simpleMarkdown(text) {
    var safe = escapeHtml(text);
    // 加粗
    safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 列表项
    safe = safe.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    safe = safe.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // 换行
    safe = safe.replace(/\n/g, '<br>');
    // 清理 ul 内多余 br
    safe = safe.replace(/<\/li><br>/g, '</li>');
    return safe;
  }

  /** 在结果区展示加载/结果/错误 */
  function showAiResult(html, isLoading) {
    var content = $('ai-result-content');
    content.innerHTML = html;
    content.classList.toggle('loading', !!isLoading);
  }

  /** 打开 AI 弹窗 */
  function openAiModal() {
    $('ai-modal').classList.add('show');
  }

  /** 关闭 AI 弹窗 */
  function closeAiModal() {
    $('ai-modal').classList.remove('show');
  }

  /**
   * 通用 AI 请求。
   * @param {string} endpoint 接口路径
   * @param {Object} payload 请求体
   */
  function requestAi(endpoint, payload) {
    if (aiLoading) return;
    aiLoading = true;
    setAiButtonsDisabled(true);
    showAiResult('<span class="ai-typing">小鸡正在思考<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>', true);

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (resp) { return resp.json(); })
      .then(function (data) {
        if (data && data.code === 0 && data.data && data.data.answer) {
          showAiResult(simpleMarkdown(data.data.answer), false);
        } else {
          showAiResult('<span class="ai-error">' + escapeHtml((data && data.message) || 'AI 返回异常') + '</span>', false);
        }
      })
      .catch(function () {
        showAiResult('<span class="ai-error">连接失败，请确认后端服务已启动（node server.js）</span>', false);
      })
      .finally(function () {
        aiLoading = false;
        setAiButtonsDisabled(false);
      });
  }

  /** 统一禁用/启用 AI 按钮 */
  function setAiButtonsDisabled(disabled) {
    ['ai-advice-btn', 'ai-health-btn', 'ai-send-btn'].forEach(function (id) {
      var el = $(id);
      if (el) el.disabled = disabled;
    });
  }

  /** 绑定 AI 助手交互事件 */
  function bindAiEvents() {
    // 打开/关闭弹窗
    $('ai-entry-btn').addEventListener('click', openAiModal);
    $('ai-close').addEventListener('click', closeAiModal);
    $('ai-mask').addEventListener('click', closeAiModal);

    // 收支建议
    $('ai-advice-btn').addEventListener('click', function () {
      requestAi('/api/ai/advice', { summary: buildAiSummary() });
    });

    // 健康度评价
    $('ai-health-btn').addEventListener('click', function () {
      requestAi('/api/ai/health', { summary: buildAiSummary() });
    });

    // 知识问答
    function sendQuestion() {
      var q = $('ai-question').value.trim();
      if (!q) {
        $('ai-question').focus();
        return;
      }
      requestAi('/api/ai/chat', { question: q });
    }
    $('ai-send-btn').addEventListener('click', sendQuestion);
    $('ai-question').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') sendQuestion();
    });
  }

  // ===================================================================
  // 七、初始化
  // ===================================================================

  /** 首次使用时写入演示数据，方便直接看到效果 */
  function seedDemoDataIfEmpty() {
    if (state.records.length > 0) return;
    var t = today();
    var ym = t.slice(0, 7);
    var demo = [
      { type: 'income', category: '工资', amount: 12000, remark: '本月工资', date: ym + '-05' },
      { type: 'expense', category: '餐饮', amount: 38.5, remark: '午餐', date: ym + '-08' },
      { type: 'expense', category: '交通', amount: 12, remark: '地铁', date: ym + '-08' },
      { type: 'expense', category: '购物', amount: 299, remark: '衣服', date: ym + '-10' },
      { type: 'expense', category: '餐饮', amount: 88, remark: '聚餐', date: t },
      { type: 'expense', category: '娱乐', amount: 45, remark: '电影', date: t }
    ];
    demo.forEach(function (d) {
      state.records.push({
        id: genId(),
        type: d.type,
        category: d.category,
        amount: d.amount,
        remark: d.remark,
        date: d.date,
        ts: Date.now()
      });
    });
    saveRecords(state.records);
  }

  /** 应用启动 */
  function init() {
    seedDemoDataIfEmpty();
    $('stats-month').value = state.statsMonth;
    bindEvents();
    switchPage('home');
  }

  // DOM 就绪后启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
