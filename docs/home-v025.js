(() => {
  const tabs = document.querySelectorAll('[data-filter]');
  const cards = [...document.querySelectorAll('[data-fav]')];
  const search = document.querySelector("#search");
  let favoritesOnly = false;
  function refresh() {
    cards.forEach(card => { card.hidden = (favoritesOnly && card.dataset.fav !== 'true') || !card.textContent.includes(search.value.trim()); });
    document.querySelector('.empty').hidden = cards.some(card => !card.hidden);
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String((tab.dataset.filter === 'fav') === favoritesOnly)));
  }
  search.addEventListener("input", refresh);
  tabs.forEach(tab => tab.addEventListener('click', () => {
    favoritesOnly = tab.dataset.filter === 'fav';
    refresh();
  }));
  cards.forEach(card => {
    const button = card.querySelector('.pin');
    button.addEventListener('click', () => {
      const pinned = card.dataset.fav !== 'true';
      card.dataset.fav = String(pinned);
      button.setAttribute('aria-pressed', String(pinned));
      button.setAttribute('aria-label', (pinned ? '取消收藏' : '收藏') + card.querySelector('strong').textContent);
      button.textContent = pinned ? '★' : '☆';
      refresh();
      if (card.hidden) document.querySelector('[data-filter="fav"]').focus();
    });
  });
})();
