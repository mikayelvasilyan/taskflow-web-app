// Apply the saved theme before first paint so there is no flash.
// A separate file (not an inline script) so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var pref = localStorage.getItem('tf-theme') || 'system';
    var dark =
      pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();
