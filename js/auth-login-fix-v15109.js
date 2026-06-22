// v1.5.109 Admin GitHub login redirect fix
// Mirrors the working Pledge Library approach: prefer config.ADMIN_REDIRECT_URL,
// otherwise redirect back to the current page without the OAuth hash.
// This intentionally intercepts the older hard-coded login handler in events.js.

(function () {
  const VERSION = 'v1.5.109 admin login redirect fix';

  function text(value) {
    if (typeof normalizeText === 'function') return normalizeText(value);
    return String(value ?? '').trim();
  }

  function getAdminRedirectUrl() {
    const configured = text(window.APP_CONFIG?.ADMIN_REDIRECT_URL || (typeof config !== 'undefined' ? config.ADMIN_REDIRECT_URL : ''));
    if (configured) return configured;
    const url = new URL(window.location.href);
    url.hash = '';
    return url.toString();
  }

  function getSupabaseClient() {
    try {
      if (typeof state !== 'undefined' && state?.supabase) return state.supabase;
    } catch (_error) {}
    return null;
  }

  function message(textValue) {
    try {
      if (typeof els !== 'undefined' && els?.authMessage) els.authMessage.textContent = textValue || '';
      if (typeof setStatus === 'function') setStatus(textValue || '');
    } catch (_error) {}
  }

  async function startAdminLogin(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (typeof event?.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const client = getSupabaseClient();
    if (!client?.auth?.signInWithOAuth) {
      message('Admin sign-in is not ready yet. Refresh the page and try again.');
      return;
    }

    message('Sending you to GitHub…');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: getAdminRedirectUrl() }
    });
    if (error) message(error.message || String(error));
  }

  function install() {
    const button = document.getElementById('loginGitHubBtn');
    if (!button || button.dataset.wnmuAdminRedirectFix === '1') return;
    button.dataset.wnmuAdminRedirectFix = '1';
    button.addEventListener('click', startAdminLogin, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }

  window.WNMUAdminLoginFix = { version: VERSION, getAdminRedirectUrl };
})();
