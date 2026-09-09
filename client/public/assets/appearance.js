// Run before styles and the app bundle to avoid a light flash on a dark device.
// Kept external so the production script-src policy remains self-only.
(function () {
  var preference = 'system';
  try {
    var saved = window.localStorage.getItem('aura.appearance.v1');
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch (_) {
    // Storage can be unavailable in private or embedded browser contexts.
  }
  var dark =
    preference === 'dark' ||
    (preference === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.appearance = preference;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark
    ? '#191b2b'
    : '#f8f7f4';
})();
