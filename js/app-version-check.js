// v1.5.103 App version check / required refresh gate
// Adapted from the Pledge Library version.json checker for the WNMU Programming Library.
// Fetches version.json with cache bypass, compares against this script version, and locks the page if a newer build is published.

(function () {
  const LOCAL_VERSION = 'v1.5.103';
  const VERSION_MANIFEST = 'version.json';
  const VERSION_CHECK_INTERVAL_MS = 10 * 60 * 1000;
  const OVERLAY_ID = 'appVersionGate';
  const STYLE_ID = 'appVersionGateStylesV15103';
  let timer = 0;
  let gateActive = false;

  function cleanVersion(value) {
    return String(value || '').trim().replace(/^v/i, '');
  }

  function localVersion() {
    return cleanVersion(LOCAL_VERSION);
  }

  function syncVisibleVersion() {
    const pill = document.getElementById('appVersion');
    if (pill && cleanVersion(pill.textContent) !== localVersion()) {
      pill.textContent = `v${localVersion()}`;
    }
  }

  function compareVersions(a, b) {
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

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.app-version-gate-active {
        overflow: hidden !important;
      }
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
      #${OVERLAY_ID}.hidden {
        display: none !important;
      }
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
      #${OVERLAY_ID} h2 {
        margin: 0 0 10px;
        color: #103a66;
        font-size: 1.35rem;
        line-height: 1.15;
      }
      #${OVERLAY_ID} p {
        margin: 8px 0;
        line-height: 1.42;
      }
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
      #${OVERLAY_ID} .app-version-gate-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 16px;
      }
      #${OVERLAY_ID} .app-version-gate-refresh {
        border: 1px solid transparent;
        background: linear-gradient(135deg, #12867f, #2dc7bd, #1d5f96);
        color: #fff;
        padding: 10px 14px;
        border-radius: 12px;
        font-weight: 850;
        cursor: pointer;
      }
      #${OVERLAY_ID} .app-version-gate-note {
        color: #597285;
        font-size: .88rem;
      }
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
        <p class="app-version-gate-note">The app is locked so old cached code can’t keep editing or scheduling with stale logic.</p>
        <div class="app-version-gate-actions">
          <button type="button" id="appVersionGateRefresh" class="app-version-gate-refresh" data-version-reload>Refresh now</button>
        </div>
      </div>
    `;
    document.body.appendChild(gate);

    gate.querySelector('#appVersionGateRefresh')?.addEventListener('click', forceFreshReload);
    return gate;
  }

  function hideGate() {
    gateActive = false;
    window.__wnmuVersionGateActive = false;
    document.body.classList.remove('app-version-gate-active');
    document.getElementById(OVERLAY_ID)?.classList.add('hidden');
  }

  function showGate(remoteVersion) {
    const local = localVersion();
    const remote = cleanVersion(remoteVersion);
    const gate = ensureOverlay();
    const message = gate.querySelector('#appVersionGateMessage');
    const pill = gate.querySelector('#appVersionGatePill');

    gateActive = true;
    window.__wnmuVersionGateActive = true;
    document.body.classList.add('app-version-gate-active');
    gate.classList.remove('hidden');

    if (message) {
      message.textContent = `Refresh this page to load the new version of the Programming Library. This page is running v${local}; v${remote} is published.`;
    }
    if (pill) {
      pill.textContent = `Current page v${local} · Required v${remote}`;
    }
    try {
      if (typeof setStatus === 'function') setStatus(`Update required. Refresh to load v${remote}.`);
    } catch {}
    requestAnimationFrame(() => gate.querySelector('#appVersionGateRefresh')?.focus());
  }

  async function forceFreshReload(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    const button = document.getElementById('appVersionGateRefresh');
    if (button) {
      button.disabled = true;
      button.textContent = 'Refreshing…';
    }

    const remote = cleanVersion(window.__wnmuRemoteVersion || 'latest');
    const stamp = `${remote || 'latest'}-${Date.now()}`;
    const next = new URL(window.location.href);
    next.searchParams.set('reload', stamp);
    next.searchParams.set('_v', stamp);

    try {
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(keys.map((key) => window.caches.delete(key)));
      }
    } catch (_error) {
      // Ignore cache API failures.
    }

    try {
      if (navigator.serviceWorker?.getRegistrations) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
    } catch (_error) {
      // Ignore service worker failures.
    }

    window.location.replace(next.toString());
    window.setTimeout(() => {
      try { window.location.reload(); } catch (_error) { /* ignore */ }
    }, 900);
  }

  function parseRemoteVersion(payload) {
    return cleanVersion(payload?.appVersion || payload?.version || payload?.APP_VERSION || '');
  }

  async function checkForRemoteUpdate({ silent = true } = {}) {
    try {
      syncVisibleVersion();
      const response = await window.fetch(`${VERSION_MANIFEST}?_=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Version check failed (${response.status})`);
      const payload = await response.json();
      const remote = parseRemoteVersion(payload);
      const local = localVersion();
      window.__wnmuRemoteVersion = remote;
      if (remote && compareVersions(remote, local) > 0) {
        showGate(remote);
        return true;
      }
      hideGate();
      return false;
    } catch (error) {
      if (!silent) console.warn('Could not check for app updates.', error);
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
    window.clearInterval(timer);
    void checkForRemoteUpdate({ silent: true });
    timer = window.setInterval(() => {
      void checkForRemoteUpdate({ silent: true });
    }, VERSION_CHECK_INTERVAL_MS);
  }

  ['click', 'pointerdown', 'mousedown', 'keydown', 'submit'].forEach((eventName) => {
    document.addEventListener(eventName, blockWhenGateActive, true);
  });

  window.WNMUAppVersionCheck = {
    checkForRemoteUpdate,
    forceFreshReload
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startVersionChecks);
  } else {
    startVersionChecks();
  }
})();
