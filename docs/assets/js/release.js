/* Public release metadata only. No analytics, identifiers or application data. */
(function () {
  'use strict';
  const repository = 'wlei24/sparepage-releases';
  const base = 'https://github.com/' + repository;

  function selectRelease(release) {
    if (!release || release.draft !== false || release.prerelease !== false ||
        typeof release.tag_name !== 'string' || !/^v?\d{1,6}\.\d{1,6}\.\d{1,6}$/.test(release.tag_name) ||
        !Array.isArray(release.assets)) return null;
    const version = release.tag_name.replace(/^v/, '');
    const filename = 'SparePage-' + version + '-macOS-arm64.dmg';
    const asset = release.assets.find(item => item && item.name === filename &&
      item.state === 'uploaded' && Number.isSafeInteger(item.size) && item.size > 0);
    if (!asset) return null;
    // Construct trusted destinations instead of trusting URLs or HTML in release metadata.
    return {
      version: 'v' + version,
      download: base + '/releases/download/' + release.tag_name + '/' + filename,
      notes: base + '/releases/tag/' + release.tag_name
    };
  }

  async function refresh(document, fetcher = fetch) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetcher('https://api.github.com/repos/' + repository + '/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' }, signal: controller.signal,
        credentials: 'omit', cache: 'no-store', redirect: 'error'
      });
      if (!response.ok) return false;
      const release = selectRelease(await response.json());
      if (!release) return false;
      document.querySelectorAll('[data-release-version]').forEach(el => { el.textContent = release.version; });
      document.querySelectorAll('.download-link').forEach(el => {
        el.href = release.download;
        el.setAttribute('aria-label', '下载拾贴 ' + release.version + '，Apple Silicon macOS 安装包');
      });
      document.querySelectorAll('[data-release-notes]').forEach(el => { el.href = release.notes; });
      return true;
    } catch (_) {
      // The static latest-release links remain useful without JS, on timeout or rate limiting.
      return false;
    } finally { clearTimeout(timer); }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { selectRelease, refresh };
  else if (typeof document !== 'undefined') void refresh(document);
})();
