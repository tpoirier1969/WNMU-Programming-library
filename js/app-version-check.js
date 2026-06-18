// v1.5.108 App version check / Pledge-style manifest gate
// Patterned after the working Pledge Library checker:
// - compare version.json against this loaded app code version, not the visible flag
// - fetch version.json with cache: 'no-store' and a timestamp
// - clear Cache API + service workers before forced refresh
// - keep legacy manifest fields safe so older broken checkers cannot trap the page

(function () {
  const APP_VERSION = String(window.WNMU_APP_VERSION || 'v1.5.108');
  const VERSION_MANIFEST = String(window.WNMU_VERSION_MANIFEST || 'version.json');
  const VERSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const OVERLAY_ID = 'appVersionGate';
  const STYLE_ID = 'appVersionGateStylesV15108';
  let versionCheckTimer = 0;
  let gateActive = false;
  let remoteVersionInfo = { localVersion: cleanVersion(APP_VERSION), remoteVersion: '', blocked: false };

  window.WNMU_APP_VERSION = APP_VERSION;

  function cleanVersion(value = '') {
    return String(value || '').trim().replace(/^v/i, '');
  }

  function displayVersion(value = '') {
    const cleaned = cleanVersion(value);
    return cleaned ? `v${cleaned}` : '';
  }

  function compareVersions(a = '', b = '') {
    const aParts = cleanVersion(a).split(/[^0-9]+/).map((part) => Number(part || 0));
    const bParts = cleanVersion(b).split(/[^0-9]+/).map((part) => Number(part || 0));
    const length = Math.max(aParts.length, bParts.length);
    for (let index = 0; index < length; index += 1) {
      const aValue = Number.isFinite(aParts[index]) ? aParts[index] : 0;
      const bValue = Number.isFinite(bParts[index]) ? bParts[index] : 0;
      if (aValue > bValue) return 1;
      if (aValue < bValue) return -1;
    }
    return 0;
  }

  function syncVisibleVersion() {
    document.querySelectorAll('#appVersion, .version-pill').forEach((pill) => {
      const text = (pill.textContent || '').trim();
      if (/^v?\d+(?:\.\d+)+$/i.test(text) || pill.id === 'appVersion') {
        pill.textContent = displayVersion(APP_VERSION);
      }
    });
  }

  function versionGateEls() {
    return {
      gate: document.getElementById(OVERLAY_ID),
      message: document.getElementById('appVersionGateMessage'),
      pill: document.getElementById('appVersionGatePill'),
      refreshButton: document.getElementById('appVersionGateRefresh')
    };
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.app-version-gate-active { overflow: hidden !important; }
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: grid;
        place-items: center;
        padding: 18px;
        background: rgba(9, 29, 48, 0.62);
        backdrop-filter: blur(3px);
      }
      #${OVERLAY_ID}.hidden { display: none !important; }
      #${OVERLAY_ID} .app-version-gate-card {
        width: min(560px, calc(100vw - 32px));
        border: 1px solid rgba(18, 134, 127, 0.28);
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(255,255,255,.99), rgba(230,251,248,.98));
        color: #1e3140;
        box-shadow: 0 24px 58px rgba(9, 29, 48, 0.28);
        padding: 22px 24px;
      }
      #${OVERLAY_ID} .app-version-gate-kicker {
        color: #12867f;
        font-size: .72rem;
        font-weight: 900;
        letter-spacing: .12em;
        text-transform: uppercase;
        margin-bottom: 7px;
      }
      #${OVERLAY_ID} h2 { margin: 0 0 10px; color: #103a66; font-size: 1.35rem; line-height: 1.15; }
      #${OVERLAY_ID} p { margin: 8px 0; line-height: 1.42; }
      #${OVERLAY_ID} .app-version-gate-pill {
        display: inline-flex;
        align-items: center;
        margin: 10px 0 6px;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(45,199,189,.16);
        border: 1px solid rgba(18,134,127,.32);
        color: #12867f;
        font-size: .82rem;
        font-weight: 850;
      }
      #${OVERLAY_ID} .app-version-gate-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
      #${OVERLAY_ID} .app-version-gate-refresh {
        border: 1px solid transparent;
        background: linear-gradient(135deg, #12867f, #2dc7bd, #1d5f96);
        color: #fff;
        padding: 10px 14px;
        border-radius: 12px;
        font-weight: 850;
        cursor: pointer;
      }
      #${OVERLAY_ID} .app-version-gate-note { color: #597285; font-size: .88rem; }
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay() {
    injectStyles();
    let gate = document.getElementById(OVERLAY_ID);
    if (gate) return gate;

    gate = document.createElement('div');
    gate.id = OVERLAY_ID;
    gate.className = 'hidden';
    gate.setAttribute('role', 'alertdialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'appVersionGateTitle');
    gate.innerHTML = `
      <div class="app-version-gate-card">
        <div class="app-version-gate-kicker">Update required</div>
        <h2 id="appVersionGateTitle">A newer app version is available</h2>
        <p id="appVersionGateMessage">Refresh this page to load the new version of the Programming Library.</p>
        <div id="appVersionGatePill" class="app-version-gate-pill"></div>
        <p class="app-version-gate-note">The app is locked so old cached code cannot keep editing with stale logic.</p>
        <div class="app-version-gate-actions">
          <button type="button" id="appVersionGateRefresh" class="app-version-gate-refresh" data-version-reload>Refresh now</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);
    gate.querySelector('#appVersionGateRefresh')?.addEventListener('click', forceFreshReload);
    return gate;
  }

  function setVersionGate({ active = false, remoteVersion = '', localVersion = '' } = {}) {
    const local = cleanVersion(localVersion || APP_VERSION);
    const remote = cleanVersion(remoteVersion || remoteVersionInfo.remoteVersion || '');
    gateActive = Boolean(active);
    remoteVersionInfo = {
      ...remoteVersionInfo,
      localVersion: local,
      remoteVersion: remote,
      blocked: Boolean(active)
    };

    window.__wnmuVersionGateActive = gateActive;
    window.__wnmuRemoteVersion = remote;
    document.body.classList.toggle('app-version-gate-active', gateActive);

    const gate = ensureOverlay();
    const gateEls = versionGateEls();
    gate.classList.toggle('hidden', !gateActive);

    if (gateEls.message) {
      gateEls.message.textContent = remote
        ? `Refresh this page to load the new version of the Programming Library. This page is running v${local}; v${remote} is published.`
        : 'Refresh this page to load the new version of the Programming Library.';
    }
    if (gateEls.pill) {
      gateEls.pill.textContent = remote ? `Current page v${local} · Required v${remote}` : `Current page v${local}`;
    }
    if (gateActive) requestAnimationFrame(() => gateEls.refreshButton?.focus());
  }

  async function forceFreshReload(event = null) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const remote = cleanVersion(remoteVersionInfo.remoteVersion || window.__wnmuRemoteVersion || '');
    const stamp = `${remote || 'latest'}-${Date.now()}`;
    const next = new URL(window.location.href);
    next.searchParams.set('reload', stamp);
    next.searchParams.set('_v', stamp);

    document.querySelectorAll('[data-version-reload], #appVersionGateRefresh')
      .forEach((button) => {
        if ('disabled' in button) button.disabled = true;
        button.textContent = 'Reloading…';
      });

    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch (_error) {}

    try {
      if (navigator.serviceWorker?.getRegistrations) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (_error) {}

    window.location.assign(next.toString());
    window.setTimeout(() => {
      try { window.location.reload(); } catch (_error) {}
    }, 900);
  }

  function manifestRemoteVersion(payload = {}) {
    // New schema fields first. Legacy appVersion/version are kept only so old broken
    // checkers do not lock users in a loop.
    return cleanVersion(
      payload.currentAppVersion ||
      payload.requiredAppVersion ||
      payload.publishedVersion ||
      payload.latestVersion ||
      payload.APP_VERSION ||
      payload.appVersion ||
      payload.version ||
      ''
    );
  }

  function applyRemoteVersionBanner(payload = {}) {
    syncVisibleVersion();
    const localVersion = cleanVersion(APP_VERSION);
    const remoteVersion = manifestRemoteVersion(payload || {});

    remoteVersionInfo = {
      ...remoteVersionInfo,
      localVersion,
      remoteVersion,
      checkedAt: new Date().toISOString()
    };

    if (!remoteVersion || compareVersions(remoteVersion, localVersion) <= 0) {
      setVersionGate({ active: false, remoteVersion: '', localVersion });
      return false;
    }

    setVersionGate({ active: true, remoteVersion, localVersion });
    try { if (typeof setStatus === 'function') setStatus(`Update required. Refresh to load v${remoteVersion}.`); } catch (_error) {}
    return true;
  }

  async function checkForRemoteUpdate({ silent = true } = {}) {
    try {
      const manifestPath = `${VERSION_MANIFEST}?_=${Date.now()}`;
      const response = await window.fetch(manifestPath, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Version check failed (${response.status})`);
      const payload = await response.json();
      return applyRemoteVersionBanner(payload || {});
    } catch (error) {
      if (!silent) console.warn('Could not check for updates.', error);
      return false;
    }
  }

  function blockWhenGateActive(event) {
    if (!gateActive) return;
    const target = event.target;
    if (target instanceof Element && target.closest(`#${OVERLAY_ID}`)) return;
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  function startVersionChecks() {
    syncVisibleVersion();
    window.clearInterval(versionCheckTimer);
    void checkForRemoteUpdate({ silent: true });
    versionCheckTimer = window.setInterval(() => {
      void checkForRemoteUpdate({ silent: true });
    }, VERSION_CHECK_INTERVAL_MS);
  }

  ['click', 'pointerdown', 'mousedown', 'keydown', 'submit'].forEach((eventName) => {
    document.addEventListener(eventName, blockWhenGateActive, true);
  });

  window.WNMUAppVersionCheck = {
    checkForRemoteUpdate,
    forceFreshReload,
    applyRemoteVersionBanner,
    localVersion: () => cleanVersion(APP_VERSION)
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startVersionChecks);
  } else {
    startVersionChecks();
  }
})();
