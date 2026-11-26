(() => {
  const cards = Array.from(document.querySelectorAll('.clip-card'));
  const shelfGrid = document.getElementById('shelf-grid');
  const shelfCount = document.getElementById('shelf-count');
  const searchInput = document.getElementById('shelf-search');
  const demoTabs = Array.from(document.querySelectorAll('.demo-tab'));
  const demoCaption = document.getElementById('demo-caption');
  const playBtn = document.getElementById('demo-play-btn');
  const playIcon = document.getElementById('demo-play-icon');
  const emptyBox = document.getElementById('shelf-empty');
  const resetBtn = document.getElementById('reset-demo-btn');
  const toastEl = document.getElementById('toast');

  const captions = {
    history: '点卡片或按 1–4 快捷复制 · 点图钉收藏',
    search: '按关键词实时定位复制记录',
    pinned: '常用信息已固定，打开即贴'
  };

  let currentMode = 'history';
  let isPlaying = true;
  let autoTimer = null;
  let toastTimer = null;

  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2200);
  }

  function applyFilter() {
    const query = searchInput.value.trim().toLowerCase();
    let visibleCount = 0;

    cards.forEach((card) => {
      const keywords = (card.dataset.keywords || '').toLowerCase();
      const isPinned = card.dataset.pinned === 'true';

      const matchesQuery = !query || keywords.includes(query);
      const matchesMode = currentMode !== 'pinned' || isPinned;

      if (matchesQuery && matchesMode) {
        const wasHidden = card.classList.contains('is-hidden');
        card.classList.remove('is-hidden');
        if (wasHidden) {
          card.classList.remove('is-entering');
          void card.offsetWidth;
          card.classList.add('is-entering');
        }
        visibleCount += 1;
      } else {
        card.classList.add('is-hidden');
        card.classList.remove('is-entering');
      }
    });

    if (shelfGrid) {
      shelfGrid.classList.toggle('is-compact', visibleCount > 0 && visibleCount < 3);
    }

    if (shelfCount) {
      if (query) {
        shelfCount.textContent = `匹配 ${visibleCount} 条记录`;
      } else if (currentMode === 'pinned') {
        shelfCount.textContent = `已收藏 ${visibleCount} 条常用内容`;
      } else {
        shelfCount.textContent = `显示 ${visibleCount} 条记录`;
      }
    }

    emptyBox.hidden = visibleCount > 0;
  }

  function setMode(mode) {
    currentMode = mode;
    demoTabs.forEach((tab) => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    if (mode === 'search') {
      searchInput.value = '地址';
    } else if (mode === 'history' || mode === 'pinned') {
      searchInput.value = '';
    }

    if (demoCaption) demoCaption.textContent = captions[mode];
    applyFilter();
  }

  demoTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      stopAutoPlay();
      setMode(tab.dataset.mode);
    });
  });

  searchInput.addEventListener('input', () => {
    stopAutoPlay();
    currentMode = 'history';
    demoTabs.forEach((tab) => {
      const active = tab.dataset.mode === 'history';
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    if (demoCaption) demoCaption.textContent = captions.history;
    applyFilter();
  });

  function copyCardContent(card) {
    stopAutoPlay();
    const copyText = card.dataset.copy || '';
    if (copyText && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copyText).catch(() => {});
    }
    card.classList.add('is-copied');
    setTimeout(() => {
      card.classList.remove('is-copied');
    }, 700);
    const previewText = copyText.length > 22 ? `${copyText.slice(0, 22)}…` : copyText;
    showToast(`已复制：${previewText}`);
  }

  // Pin toggle & card copy interaction
  cards.forEach((card) => {
    const pinBtn = card.querySelector('.pin-btn');
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      stopAutoPlay();
      const nextPinned = card.dataset.pinned !== 'true';
      card.dataset.pinned = String(nextPinned);
      pinBtn.classList.toggle('is-pinned', nextPinned);
      pinBtn.setAttribute('aria-label', nextPinned ? '取消收藏' : '收藏此卡片');
      pinBtn.setAttribute('title', nextPinned ? '已收藏' : '收藏');
      const svg = pinBtn.querySelector('svg');
      svg.setAttribute('fill', nextPinned ? 'currentColor' : 'none');
      showToast(nextPinned ? '已收进收藏备忘' : '已取消收藏');
      applyFilter();
    });

    card.addEventListener('click', (e) => {
      if (e.target.closest('.pin-btn')) return;
      copyCardContent(card);
    });

    card.addEventListener('keydown', (e) => {
      if (e.target.closest('.pin-btn')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyCardContent(card);
      }
    });
  });

  // Number keys 1-4 quick-copy visible cards when not typing in an input
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    const index = Number(e.key) - 1;
    if (Number.isInteger(index) && index >= 0 && index <= 3) {
      const targetCard = cards[index];
      if (targetCard && !targetCard.classList.contains('is-hidden')) {
        copyCardContent(targetCard);
      }
    }
  });

  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    setMode('history');
  });

  function startAutoPlay() {
    isPlaying = true;
    playIcon.textContent = 'Ⅱ';
    const order = ['history', 'search', 'pinned'];
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const nextIndex = (order.indexOf(currentMode) + 1) % order.length;
      setMode(order[nextIndex]);
    }, 4500);
  }

  function stopAutoPlay() {
    isPlaying = false;
    playIcon.textContent = '▷';
    clearInterval(autoTimer);
  }

  playBtn.addEventListener('click', () => {
    if (isPlaying) {
      stopAutoPlay();
    } else {
      startAutoPlay();
    }
  });

  // Local AI animation sequence & scenario switcher
  const AI_SCENARIOS = {
    shipping: {
      desc: '零散收货消息，一键整理成表。',
      resultTitle: '收货清单',
      headers: ['收件人', '详细地址', '备注'],
      chats: [
        {
          id: 'chat-1',
          avatar: '林',
          avatarClass: 'avatar-a',
          html: '我这边寄<mark class="ai-token">上海市浦东新区示例路18号2单元301</mark>，写<mark class="ai-token">林小雨</mark>。麻烦<mark class="ai-token">周末送到，我在家</mark>。'
        },
        {
          id: 'chat-2',
          avatar: '周',
          avatarClass: 'avatar-b',
          html: '<mark class="ai-token">周可可</mark>收。寄<mark class="ai-token">深圳市南山区示例路9号</mark>，<mark class="ai-token">到了放前台就行</mark>。'
        }
      ],
      rows: [
        ['林小雨', '上海市浦东新区示例路18号2单元301', '周末送到，我在家'],
        ['周可可', '深圳市南山区示例路9号', '到了放前台就行']
      ]
    },
    meeting: {
      desc: '群聊待办，自动提取负责人与时间。',
      resultTitle: '会议待办',
      headers: ['负责人', '待办事项', '截止时间'],
      chats: [
        {
          id: 'chat-1',
          avatar: '陈',
          avatarClass: 'avatar-a',
          html: '这周<mark class="ai-token">周四下班前</mark>，<mark class="ai-token">陈明</mark>把<mark class="ai-token">新版官网首屏视觉稿和切图</mark>给到研发。'
        },
        {
          id: 'chat-2',
          avatar: '许',
          avatarClass: 'avatar-b',
          html: '<mark class="ai-token">许然</mark>负责<mark class="ai-token">整理 v0.2.5 更新日志与安装包校验</mark>，<mark class="ai-token">周五中午 12:00 前</mark>发出。'
        }
      ],
      rows: [
        ['陈明', '新版官网首屏视觉稿和切图给到研发', '周四下班前'],
        ['许然', '整理 v0.2.5 更新日志与安装包校验', '周五 12:00 前']
      ]
    }
  };

  const aiSection = document.getElementById('local-ai');
  const aiScenarioDesc = document.getElementById('ai-scenario-desc');
  const aiScenarioTabs = Array.from(document.querySelectorAll('.ai-scenario-tab'));
  const aiChatList = document.getElementById('ai-chat-list');
  const aiResultTitle = document.getElementById('ai-result-title');
  const aiTableHead = document.getElementById('ai-table-head');
  const aiTableBody = document.getElementById('ai-table-body');
  const aiFlowBridge = document.getElementById('ai-flow-bridge');
  const aiReplayBtn = document.getElementById('ai-replay-btn');
  const aiTriggerLabel = document.getElementById('ai-trigger-label');
  const aiTableWrap = document.getElementById('ai-table-wrap');
  const aiStatusBadge = document.getElementById('ai-status-badge');
  const aiCopyBtn = document.getElementById('ai-copy-btn');
  const aiCopyLabel = document.getElementById('ai-copy-label');
  let currentScenario = 'shipping';
  let aiTimers = [];
  let aiLoopTimer = null;

  function renderAiScenario(key) {
    const scenario = AI_SCENARIOS[key] || AI_SCENARIOS.shipping;
    currentScenario = key;

    aiScenarioTabs.forEach((tab) => {
      const active = tab.dataset.scenario === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    if (aiScenarioDesc) aiScenarioDesc.textContent = scenario.desc;
    if (aiResultTitle) aiResultTitle.textContent = scenario.resultTitle;

    if (aiChatList) {
      aiChatList.innerHTML = scenario.chats
        .map(
          (chat) => `
          <div class="chat-bubble" id="${chat.id}">
            <div class="avatar ${chat.avatarClass}">${chat.avatar}</div>
            <div class="bubble-content">
              <p>${chat.html}</p>
            </div>
          </div>`
        )
        .join('');
    }

    if (aiTableHead) {
      aiTableHead.innerHTML = scenario.headers.map((h) => `<th>${h}</th>`).join('');
    }

    if (aiTableBody) {
      aiTableBody.innerHTML = scenario.rows
        .map(
          ([col1, col2, col3]) => `
          <tr class="ai-row">
            <td><strong>${col1}</strong></td>
            <td>${col2}</td>
            <td><span class="note-chip">${col3}</span></td>
          </tr>`
        )
        .join('');
    }
  }

  function clearAiTimers() {
    aiTimers.forEach((t) => clearTimeout(t));
    aiTimers = [];
  }

  function stopAiLoop() {
    clearAiTimers();
    clearInterval(aiLoopTimer);
    aiLoopTimer = null;
  }

  function runAiSequence() {
    clearAiTimers();

    const chat1 = document.getElementById('chat-1');
    const chat2 = document.getElementById('chat-2');
    const chat1Tokens = chat1 ? Array.from(chat1.querySelectorAll('.ai-token')) : [];
    const chat2Tokens = chat2 ? Array.from(chat2.querySelectorAll('.ai-token')) : [];
    const allTokens = [...chat1Tokens, ...chat2Tokens];
    const aiRows = Array.from(document.querySelectorAll('.ai-row'));

    [chat1, chat2].forEach((b) => b && b.classList.remove('is-scanning'));
    allTokens.forEach((token) => token.classList.remove('is-active'));
    aiRows.forEach((row) => row.classList.remove('is-visible'));
    if (aiTableWrap) aiTableWrap.classList.add('is-loading');
    if (aiFlowBridge) aiFlowBridge.classList.add('is-processing');
    if (aiReplayBtn) aiReplayBtn.classList.add('is-processing');
    if (aiTriggerLabel) aiTriggerLabel.textContent = '正在识别…';
    if (aiStatusBadge) {
      aiStatusBadge.textContent = '识别原文…';
      aiStatusBadge.className = 'pane-badge processing';
    }

    aiTimers.push(setTimeout(() => {
      if (chat1) {
        chat1.classList.remove('is-scanning');
        void chat1.offsetWidth;
        chat1.classList.add('is-scanning');
      }
    }, 300));

    [420, 680, 940].forEach((delay, idx) => {
      aiTimers.push(setTimeout(() => {
        if (chat1Tokens[idx]) chat1Tokens[idx].classList.add('is-active');
      }, delay));
    });

    aiTimers.push(setTimeout(() => {
      if (chat1) chat1.classList.remove('is-scanning');
      if (aiTableWrap) aiTableWrap.classList.remove('is-loading');
      if (aiStatusBadge) aiStatusBadge.textContent = '生成清单…';
      if (aiTriggerLabel) aiTriggerLabel.textContent = '整理生成中';
      if (aiRows[0]) aiRows[0].classList.add('is-visible');
    }, 1220));

    aiTimers.push(setTimeout(() => {
      if (chat2) {
        chat2.classList.remove('is-scanning');
        void chat2.offsetWidth;
        chat2.classList.add('is-scanning');
      }
    }, 1600));

    [1720, 1980, 2240].forEach((delay, idx) => {
      aiTimers.push(setTimeout(() => {
        if (chat2Tokens[idx]) chat2Tokens[idx].classList.add('is-active');
      }, delay));
    });

    aiTimers.push(setTimeout(() => {
      if (chat2) chat2.classList.remove('is-scanning');
      if (aiRows[1]) aiRows[1].classList.add('is-visible');
      if (aiFlowBridge) aiFlowBridge.classList.remove('is-processing');
      if (aiReplayBtn) aiReplayBtn.classList.remove('is-processing');
      if (aiTriggerLabel) aiTriggerLabel.textContent = '本机 AI 整理';
      if (aiStatusBadge) {
        aiStatusBadge.textContent = '已结构化';
        aiStatusBadge.className = 'pane-badge success';
      }
    }, 2520));
  }

  function startAiLoop() {
    stopAiLoop();
    runAiSequence();
    aiLoopTimer = setInterval(runAiSequence, 5800);
  }

  aiScenarioTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextKey = tab.dataset.scenario;
      if (!nextKey || nextKey === currentScenario) return;
      renderAiScenario(nextKey);
      startAiLoop();
    });
  });

  if (aiCopyBtn) {
    aiCopyBtn.addEventListener('click', () => {
      const scenario = AI_SCENARIOS[currentScenario] || AI_SCENARIOS.shipping;
      const tsv = [
        scenario.headers.join('\t'),
        ...scenario.rows.map((r) => r.join('\t'))
      ].join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(tsv).catch(() => {});
      }
      if (aiCopyLabel) aiCopyLabel.textContent = '已复制';
      showToast(`已复制「${scenario.resultTitle}」表格`);
      setTimeout(() => {
        if (aiCopyLabel) aiCopyLabel.textContent = '复制清单';
      }, 1800);
    });
  }

  if (aiSection && 'IntersectionObserver' in window) {
    const aiObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!aiLoopTimer) {
            startAiLoop();
          }
        } else {
          stopAiLoop();
        }
      });
    }, { threshold: 0.25 });
    aiObserver.observe(aiSection);
  } else {
    startAiLoop();
  }

  aiReplayBtn.addEventListener('click', () => {
    startAiLoop();
    showToast('正在重新识别并整理为清单');
  });

  // OCR 3-phase cycle: marquee lock -> horizontal scan -> reveal result
  const captureSection = document.getElementById('capture');
  const wbMarquee = document.getElementById('wb-marquee');
  const ocrHud = document.getElementById('ocr-hud');
  const hudLabel = document.getElementById('hud-label');
  const hudCode = document.getElementById('hud-code');
  const ocrCopyBtn = document.getElementById('ocr-copy-btn');
  const ocrCopyLabel = document.getElementById('ocr-copy-label');
  let ocrTimers = [];
  let ocrLoopTimer = null;

  function clearOcrTimers() {
    ocrTimers.forEach((t) => clearTimeout(t));
    ocrTimers = [];
  }

  function stopOcrLoop() {
    clearOcrTimers();
    clearInterval(ocrLoopTimer);
    ocrLoopTimer = null;
  }

  function runOcrCycle() {
    clearOcrTimers();

    wbMarquee.classList.remove('is-scanning', 'is-locking');
    void wbMarquee.offsetWidth;
    wbMarquee.classList.add('is-locking');

    ocrHud.classList.remove('is-ready');
    ocrHud.classList.add('is-scanning');
    hudLabel.textContent = '正在识别…';
    hudCode.textContent = '···· ····';

    ocrTimers.push(setTimeout(() => {
      wbMarquee.classList.remove('is-locking');
      wbMarquee.classList.add('is-scanning');
    }, 320));

    ocrTimers.push(setTimeout(() => {
      wbMarquee.classList.remove('is-scanning');
      ocrHud.classList.remove('is-scanning');
      ocrHud.classList.add('is-ready');
      hudLabel.textContent = '识别结果';
      hudCode.textContent = 'SP 0318 2607';
    }, 1850));
  }

  function startOcrLoop() {
    stopOcrLoop();
    runOcrCycle();
    ocrLoopTimer = setInterval(runOcrCycle, 4600);
  }

  if (wbMarquee) {
    wbMarquee.addEventListener('click', () => {
      startOcrLoop();
      showToast('重新演示框选识字');
    });
  }

  if (captureSection && 'IntersectionObserver' in window) {
    const ocrObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (!ocrLoopTimer) {
            startOcrLoop();
          }
        } else {
          stopOcrLoop();
        }
      });
    }, { threshold: 0.25 });
    ocrObserver.observe(captureSection);
  } else {
    startOcrLoop();
  }

  ocrCopyBtn.addEventListener('click', () => {
    const text = 'SP 0318 2607';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    ocrCopyLabel.textContent = '已复制';
    showToast('已复制运单号：SP 0318 2607');
    setTimeout(() => {
      ocrCopyLabel.textContent = '复制文字';
    }, 1800);
  });

  // Scroll reveal for .reveal blocks
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  if (revealEls.length && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-inview');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-inview'));
  }

  // Scroll-spy for floating navbar links
  const navSectionLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const spySections = navSectionLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function setActiveNavLink(id) {
    navSectionLinks.forEach((link) => {
      const isMatch = link.getAttribute('href') === `#${id}`;
      link.classList.toggle('is-active', isMatch);
    });
  }

  if (spySections.length && 'IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveNavLink(entry.target.id);
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    spySections.forEach((sec) => navObserver.observe(sec));
  }

  // Scroll-linked damped morph: floating pill -> full-width docked bar
  const siteHeader = document.getElementById('site-header');
  const navPill = siteHeader ? siteHeader.querySelector('.nav-pill') : null;
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let targetP = 0;
  let currentP = 0;
  let navRafId = null;

  function applyNavMorph(p) {
    if (!siteHeader || !navPill) return;
    const vw = document.documentElement.clientWidth;
    const isMobile = vw <= 680;
    const sideGutter = isMobile ? 32 : 48;
    const pillW = Math.min(1000, vw - sideGutter);
    const w = pillW + (vw - pillW) * p;
    const ty = (isMobile ? 12 : 14) * (1 - p);
    const radius = 28 * (1 - p);
    const endPad = isMobile ? 16 : 24;
    const startPadL = isMobile ? 16 : 20;
    const padL = startPadL + (endPad - startPadL) * p;
    const padR = 10 + (endPad - 10) * p;

    siteHeader.style.setProperty('--nav-p', p.toFixed(4));
    navPill.style.width = `${w.toFixed(2)}px`;
    navPill.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0)`;
    navPill.style.borderRadius = `${radius.toFixed(2)}px`;
    navPill.style.paddingLeft = `${padL.toFixed(2)}px`;
    navPill.style.paddingRight = `${padR.toFixed(2)}px`;
  }

  function tickNavMorph() {
    const diff = targetP - currentP;
    if (reduceMotion || Math.abs(diff) < 0.001) {
      currentP = targetP;
      applyNavMorph(currentP);
      navRafId = null;
      return;
    }
    currentP += diff * 0.18;
    applyNavMorph(currentP);
    navRafId = requestAnimationFrame(tickNavMorph);
  }

  function updateNavTarget(immediate = false) {
    targetP = Math.min(Math.max(window.scrollY / 88, 0), 1);
    if (immediate || reduceMotion) {
      currentP = targetP;
      applyNavMorph(currentP);
      if (navRafId) {
        cancelAnimationFrame(navRafId);
        navRafId = null;
      }
      return;
    }
    if (!navRafId) {
      navRafId = requestAnimationFrame(tickNavMorph);
    }
  }

  window.addEventListener('scroll', () => updateNavTarget(false), { passive: true });
  window.addEventListener('resize', () => updateNavTarget(true), { passive: true });
  updateNavTarget(true);

  // Initialize
  startAutoPlay();
})();
