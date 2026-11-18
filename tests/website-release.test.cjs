const test = require('node:test');
const assert = require('node:assert/strict');
const { selectRelease, refresh } = require('../docs/assets/js/release.js');
const fixture = () => ({ tag_name: 'v0.3.1', draft: false, prerelease: false,
  assets: [{ name: 'SparePage-0.3.1-macOS-arm64.dmg', state: 'uploaded', size: 5000 }] });

test('only a published stable release with its matching uploaded installer is selected', () => {
  assert.equal(selectRelease(fixture()).version, 'v0.3.1');
  for (const changes of [{ draft: true }, { prerelease: true }, { tag_name: '<script>' },
      { assets: [] }, { assets: [{ ...fixture().assets[0], state: 'starter' }] },
      { assets: [{ ...fixture().assets[0], size: 0 }] },
      { assets: [{ ...fixture().assets[0], name: 'SparePage-0.3.0-macOS-arm64.dmg' }] }]) {
    assert.equal(selectRelease({ ...fixture(), ...changes }), null);
  }
});
test('untrusted metadata cannot redirect downloads or inject release HTML', () => {
  const release = fixture();
  release.html_url = 'javascript:alert(1)';
  release.assets[0].browser_download_url = 'https://example.invalid/package.dmg';
  const selected = selectRelease(release);
  assert.equal(selected.download, 'https://github.com/wlei24/sparepage-releases/releases/download/v0.3.1/SparePage-0.3.1-macOS-arm64.dmg');
  assert.equal(selected.notes, 'https://github.com/wlei24/sparepage-releases/releases/tag/v0.3.1');
});
function page() {
  const version = { textContent: '最新版本' };
  const download = { href: 'https://github.com/wlei24/sparepage-releases/releases/latest', setAttribute() {} };
  const notes = { href: download.href };
  return { version, download, notes, querySelectorAll(selector) {
    return selector === '[data-release-version]' ? [version] : selector === '.download-link' ? [download] : [notes];
  } };
}
test('version, installer and release notes change together after valid metadata', async () => {
  const doc = page();
  assert.equal(await refresh(doc, async () => ({ ok: true, json: async () => fixture() })), true);
  assert.equal(doc.version.textContent, 'v0.3.1');
  assert.match(doc.download.href, /0\.3\.1-macOS-arm64\.dmg$/);
  assert.match(doc.notes.href, /tag\/v0\.3\.1$/);
});
test('network failures, rate limits and invalid metadata keep the latest-release fallback', async () => {
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => ({ ok: false }),
      async () => ({ ok: true, json: async () => ({ ...fixture(), assets: [] }) })]) {
    const doc = page();
    assert.equal(await refresh(doc, fetcher), false);
    assert.equal(doc.version.textContent, '最新版本');
    assert.match(doc.download.href, /releases\/latest$/);
    assert.match(doc.notes.href, /releases\/latest$/);
  }
});
