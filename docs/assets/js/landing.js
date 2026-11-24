(() => {
  'use strict';
  const figure = document.getElementById('clipboard');
  if (!figure) return;
  const cards = [...figure.querySelectorAll('.clip')];
  const address = cards.find(card => card.dataset.id === 'address');
  const tabs = [...figure.querySelectorAll('.scene-tabs button')];
  const search = figure.querySelector('input');
  const toggle = figure.querySelector('[data-pause-hero]');
  const caption = figure.querySelector('.demo-caption');
  const label = figure.querySelector('.filter-label');
  const track = figure.querySelector('.card-track');
  const viewport = figure.querySelector('.card-viewport');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const activeAnimations = new Set();
  const reuse = document.createElement('div');
  reuse.className = 'reuse';
  reuse.setAttribute('aria-hidden', 'true');
  reuse.innerHTML = '<span>下次寄件</span><strong>收货地址</strong><div>上海市浦东新区<br>示例路18号2单元301</div>';
  track.append(reuse);
  tabs.forEach(tab => {
    const progress = document.createElement('span');
    progress.className = 'scene-progress';
    progress.setAttribute('aria-hidden', 'true');
    tab.append(progress);
  });
  const pinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 6 3 4v2h-5v6l-1 2-1-2v-6H6v-2l3-4z"/></svg>';
  figure.querySelectorAll('.pin').forEach(pin => { pin.innerHTML = pinIcon; });

  let scene = 'history';
  let inView = false;
  let manualPause = reduced.matches;
  let playing = false;
  let timer = null;
  let elapsed = 0;
  let startedAt = 0;
  let step = 0;
  let manualScene = false;

  function animate(element, keyframes, options) {
    if (reduced.matches) return;
    const animation = element.animate(keyframes, options);
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation)).catch(() => activeAnimations.delete(animation));
  }
  function setControl() {
    const title = playing ? '暂停演示' : '继续播放';
    toggle.textContent = playing ? 'Ⅱ' : '▷';
    toggle.setAttribute('aria-label', title);
    toggle.title = title;
    figure.dataset.playing = String(playing);
  }
  function pause() {
    if (playing) elapsed += performance.now() - startedAt;
    clearTimeout(timer);
    timer = null;
    playing = false;
    activeAnimations.forEach(animation => animation.pause());
    setControl();
  }
  function resetTimeline() {
    pause();
    activeAnimations.forEach(animation => animation.cancel());
    elapsed = 0;
    step = 0;
    manualScene = false;
  }
  function filter({ resetScroll = true } = {}) {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach(card => {
      const included = (scene !== 'favorite' || card.dataset.pinned === 'true') &&
        card.dataset.content.toLowerCase().includes(query);
      card.classList.toggle('is-filtered', !included);
      card.inert = !included;
      card.setAttribute('aria-hidden', String(!included));
      if (included) shown++;
    });
    const empty = figure.querySelector('.empty');
    empty.hidden = shown > 0;
    empty.textContent = !query && scene === 'favorite'
      ? '还没有收藏。回到复制历史，点卡片上的图钉试试。'
      : '没有匹配的记录，换个词试试。';
    viewport.hidden = shown === 0;
    // Keep keyboard focus on a visible control when a card leaves the results.
    if (document.activeElement?.closest('.clip.is-filtered')) {
      tabs.find(tab => tab.dataset.scene === scene)?.focus({preventScroll:true});
    }
    if (resetScroll) viewport.scrollLeft = 0;
  }
  function setPinned(card, value) {
    card.dataset.pinned = String(value);
    const button = card.querySelector('.pin');
    button.setAttribute('aria-pressed', String(value));
    button.setAttribute('aria-label', (value ? '取消收藏' : '收藏') + (card.querySelector('h3')?.textContent || '旅行图片'));
    button.title = value ? '取消收藏' : '收藏';
  }
  function showScene(nextScene) {
    scene = nextScene;
    figure.dataset.scene = scene;
    figure.classList.remove('paste');
    reuse.setAttribute('aria-hidden', 'true');
    tabs.forEach(tab => {
      const selected = tab.dataset.scene === scene;
      tab.setAttribute('aria-pressed', String(selected));
      const progress = tab.querySelector('.scene-progress');
      progress.getAnimations().forEach(animation => animation.cancel());
      if (selected && playing) {
        const durations = { history: 6000, search: 3800, favorite: 6200 };
        animate(progress, [{transform:'scaleX(0)'},{transform:'scaleX(1)'}], {duration:durations[scene],fill:'forwards',easing:'linear'});
      }
    });
    cards.forEach(card => card.classList.remove('selected'));
    search.value = '';
    label.textContent = scene === 'favorite' ? '收藏' : '历史';
    if (scene === 'search') {
      search.value = '地址';
      caption.textContent = '搜一个词，找到那条收货地址。';
    } else if (scene === 'favorite') {
      caption.textContent = '常用的点一下收藏，下次直接贴。';
    } else {
      caption.textContent = '文字、链接、图片，连续复制也都在。';
    }
    filter();
  }
  function enterCard() {
    track.prepend(address);
    address.querySelector('footer span:last-child').textContent = '刚刚';
    animate(address, [
      { opacity:0, transform:'translateY(-22px) rotate(-3deg) scale(.96)' },
      { opacity:1, transform:'translateY(0) rotate(0) scale(1)' }
    ], {duration:700,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function panToLast() {
    const last = cards.find(card => card.dataset.id === 'photo');
    const right = last.offsetLeft + last.offsetWidth - viewport.offsetLeft;
    viewport.scrollTo({left:Math.max(0,right-viewport.clientWidth),behavior:reduced.matches?'instant':'smooth'});
  }
  function showPaste() {
    // The sample form belongs to the address card, not to other user-pinned records.
    const visibleCards = cards.filter(card => !card.classList.contains('is-filtered'));
    if (visibleCards.length !== 1 || visibleCards[0] !== address) return;
    figure.classList.add('paste');
    reuse.setAttribute('aria-hidden', 'false');
    caption.textContent = '收藏里的地址，下次寄件再用一次。';
  }
  const timeline = [
    { at:0, run:() => { setPinned(address, false); showScene('history'); } },
    { at:250, run:enterCard },
    { at:2000, run:panToLast },
    { at:4500, run:() => viewport.scrollTo({left:0,behavior:reduced.matches?'instant':'smooth'}) },
    { at:6000, run:() => { showScene('search'); search.value=''; filter(); } },
    { at:6250, run:() => { search.value='地'; filter(); } },
    { at:6650, run:() => { search.value='地址'; filter(); address.classList.add('selected'); } },
    { at:9800, run:() => {
      setPinned(address, true);
      showScene('favorite');
      animate(address.querySelector('.pin'), [{transform:'scale(1)'},{transform:'scale(1.35)',offset:.45},{transform:'scale(1)'}], {duration:450,easing:'ease-out'});
    } },
    { at:11400, run:showPaste }
  ];
  function tick() {
    if (!playing) return;
    const position = elapsed + performance.now() - startedAt;
    while (step < timeline.length && timeline[step].at <= position) {
      timeline[step].run();
      step++;
    }
    if (position >= 16000) {
      elapsed = 0;
      startedAt = performance.now();
      step = 0;
      tick();
      return;
    }
    const nextAt = step < timeline.length ? timeline[step].at : 16000;
    timer = setTimeout(tick, Math.max(16, nextAt-position));
  }
  function resume() {
    if (playing || manualPause || reduced.matches || !inView || document.hidden) return;
    if (manualScene) resetTimeline();
    playing = true;
    startedAt = performance.now();
    activeAnimations.forEach(animation => animation.play());
    setControl();
    tick();
  }
  function takeControl() {
    manualPause = true;
    pause();
    manualScene = true;
    // Manual interaction should not leave a card frozen halfway into view.
    activeAnimations.forEach(animation => animation.finish());
  }
  tabs.forEach(tab => tab.addEventListener('click', () => {
    takeControl();
    activeAnimations.forEach(animation => animation.cancel());
    showScene(tab.dataset.scene);
  }));
  search.addEventListener('focus', takeControl);
  search.addEventListener('input', () => {
    takeControl();
    figure.classList.remove('paste');
    reuse.setAttribute('aria-hidden', 'true');
    filter();
    caption.textContent = '搜索演示记录，也可以试试「链接」或「图片」。';
  });
  viewport.addEventListener('focusin', takeControl);
  viewport.addEventListener('pointerdown', takeControl, {passive:true});
  viewport.addEventListener('wheel', takeControl, {passive:true});
  cards.forEach(card => card.querySelector('.pin').addEventListener('click', () => {
    takeControl();
    setPinned(card, card.dataset.pinned !== 'true');
    figure.classList.remove('paste');
    reuse.setAttribute('aria-hidden', 'true');
    filter({ resetScroll: false });
    caption.textContent = card.dataset.pinned === 'true' ? '已收藏这条演示记录。' : '已取消这条演示记录的收藏。';
  }));
  toggle.addEventListener('click', () => {
    if (playing) { manualPause = true; pause(); }
    else { manualPause = false; resume(); }
  });
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting && entries[0].intersectionRatio >= .15;
    if (inView) resume();
    else pause();
  }, {threshold:.15}).observe(figure);
  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume());
  reduced.addEventListener('change', () => {
    resetTimeline();
    manualPause = reduced.matches;
    toggle.hidden = reduced.matches;
    showScene('history');
    resume();
  });
  toggle.hidden = reduced.matches;
  cards.forEach(card => setPinned(card, card.dataset.pinned === 'true'));
  setControl();
})();
