(() => {
  const demo = document.querySelector('.am');
  if (!demo) return;

  const scene = demo.querySelector('.am-scene');
  const output = demo.querySelector('.am-output');
  const toggle = demo.querySelector('.am-toggle');
  const symbol = toggle.querySelector('.am-toggle-symbol');
  const outputStatus = demo.querySelector('.am-output-status');
  const cells = [...demo.querySelectorAll('[data-am-cell]')];
  const sources = [...demo.querySelectorAll('[data-am-source]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pending = new Set();
  const flights = new Set();
  let visible = false;
  let userPaused = false;
  let running = false;
  let started = false;
  let completed = false;
  let generation = 0;

  function arm(entry) {
    entry.startedAt = performance.now();
    entry.id = window.setTimeout(() => {
      pending.delete(entry);
      entry.callback();
    }, entry.remaining);
  }

  function schedule(callback, delay) {
    const entry = { callback, remaining: delay, startedAt: 0, id: null };
    pending.add(entry);
    if (running) arm(entry);
  }

  function clearCycle() {
    generation += 1;
    pending.forEach(entry => window.clearTimeout(entry.id));
    pending.clear();
    flights.forEach(({ animation, chip }) => {
      animation.cancel();
      chip.remove();
    });
    flights.clear();
    sources.forEach(source => source.classList.remove('am-source-active'));
  }

  function renderToggle() {
    const label = running ? '暂停整理演示' : completed ? '重播整理演示' : started ? '继续整理演示' : '播放整理演示';
    toggle.setAttribute('aria-label', label);
    toggle.title = label;
    symbol.textContent = running ? 'Ⅱ' : '▶';
    demo.dataset.playing = String(running);
  }

  function showComplete() {
    clearCycle();
    running = false;
    started = false;
    demo.classList.remove('am-running');
    demo.classList.add('am-finished');
    cells.forEach(cell => cell.classList.add('am-cell-visible'));
    outputStatus.textContent = '已整理';
    renderToggle();
  }

  function pause() {
    if (!running) return;
    const now = performance.now();
    pending.forEach(entry => {
      window.clearTimeout(entry.id);
      entry.remaining = Math.max(0, entry.remaining - (now - entry.startedAt));
      entry.id = null;
    });
    flights.forEach(({ animation }) => animation.pause());
    running = false;
    renderToggle();
  }

  function moveField(key) {
    const source = demo.querySelector('[data-am-source="' + key + '"]');
    const cell = demo.querySelector('[data-am-cell="' + key + '"]');
    const start = source.getBoundingClientRect();
    const end = cell.getBoundingClientRect();
    const bounds = scene.getBoundingClientRect();
    const chip = document.createElement('span');
    const ticket = generation;

    source.classList.add('am-source-active');
    chip.className = 'am-flying';
    chip.textContent = cell.textContent;
    chip.setAttribute('aria-hidden', 'true');
    chip.style.left = start.left - bounds.left + 'px';
    chip.style.top = start.top - bounds.top + 'px';
    scene.append(chip);

    const deltaX = end.left - start.left;
    const deltaY = end.top - start.top;
    const animation = chip.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: 0 },
      { transform: 'translate(0, -5px) scale(1.02)', opacity: 1, offset: .16 },
      { transform: 'translate(' + deltaX + 'px, ' + deltaY + 'px) scale(1)', opacity: 1, offset: .84 },
      { transform: 'translate(' + deltaX + 'px, ' + deltaY + 'px) scale(.98)', opacity: 0 }
    ], { duration: 950, easing: 'cubic-bezier(.3, .1, .2, 1)', fill: 'forwards' });
    const flight = { animation, chip };
    flights.add(flight);
    animation.finished.then(() => {
      if (ticket === generation) cell.classList.add('am-cell-visible');
      chip.remove();
      flights.delete(flight);
    }).catch(() => {});
  }

  function moveRow(index) {
    sources.forEach(source => source.classList.remove('am-source-active'));
    for (let column = 0; column < 3; column += 1) moveField(index + '-' + column);
  }

  function playCycle() {
    clearCycle();
    started = true;
    completed = false;
    running = true;
    demo.classList.add('am-running');
    demo.classList.remove('am-finished');
    cells.forEach(cell => cell.classList.remove('am-cell-visible'));
    outputStatus.textContent = '整理演示';
    renderToggle();

    schedule(() => moveRow(0), 450);
    schedule(() => moveRow(1), 2250);
    schedule(() => {
      completed = true;
      showComplete();
    }, 3400);
  }

  function resume() {
    if (!started) {
      playCycle();
      return;
    }
    running = true;
    pending.forEach(arm);
    flights.forEach(({ animation }) => animation.play());
    renderToggle();
  }

  function synchronize() {
    toggle.hidden = reducedMotion.matches;
    if (reducedMotion.matches) {
      showComplete();
      return;
    }
    const shouldPlay = visible && !document.hidden && !userPaused;
    if (shouldPlay && !running && !completed) resume();
    if (!shouldPlay) pause();
  }

  toggle.addEventListener('click', () => {
    if (completed) {
      completed = false;
      userPaused = false;
    } else {
      userPaused = !userPaused;
    }
    synchronize();
  });
  document.addEventListener('visibilitychange', synchronize);
  reducedMotion.addEventListener('change', synchronize);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .35;
    synchronize();
  }, { threshold: .35 }).observe(output);

  // The table remains readable until its own panel is visible, including on mobile.
  showComplete();
  toggle.hidden = reducedMotion.matches;
})();
