// WNMU Programming Library — large-screen Holidays / Events popup
// v1.5.127
// Owns only the large-screen popup workflow. Phone keeps the existing page navigation.

(function () {
  'use strict';

  const VERSION = 'v1.5.127';
  const DESKTOP_QUERY = '(min-width: 761px)';
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  let lastFocused = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function desktopMode() {
    try { return window.matchMedia(DESKTOP_QUERY).matches; }
    catch (_error) { return Number(window.innerWidth || 0) >= 761; }
  }

  function ensureStyles() {
    if (byId('wnmuHolidayPopupStyles')) return;
    const style = document.createElement('style');
    style.id = 'wnmuHolidayPopupStyles';
    style.textContent = `
      #holidayCalendarPopupBtn { display: none; }

      @media (min-width: 761px) {
        body.workspace-test-page #holidayCalendarBtn { display: none !important; }
        body.workspace-test-page #holidayCalendarPopupBtn { display: inline-flex !important; }
      }

      @media (max-width: 760px) {
        body.workspace-test-page #holidayCalendarPopupBtn { display: none !important; }
      }

      body.wnmu-holiday-popup-open { overflow: hidden !important; }
      #wnmuHolidayPopup {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(8, 27, 45, .58);
        backdrop-filter: blur(3px);
      }
      #wnmuHolidayPopup.hidden { display: none !important; }
      #wnmuHolidayPopup .wnmu-holiday-popup-card {
        width: min(980px, calc(100vw - 48px));
        max-height: calc(100vh - 48px);
        display: grid;
        grid-template-rows: auto minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid rgba(18, 134, 127, .24);
        border-radius: 18px;
        background: #f8fbfd;
        box-shadow: 0 28px 70px rgba(8, 27, 45, .30);
      }
      #wnmuHolidayPopup .wnmu-holiday-popup-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border-bottom: 1px solid rgba(18, 134, 127, .18);
        background: #fff;
      }
      #wnmuHolidayPopup .wnmu-holiday-popup-title {
        margin: 0;
        color: #103a66;
        font-size: 1.08rem;
        line-height: 1.15;
      }
      #wnmuHolidayPopup .wnmu-holiday-popup-head-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      #wnmuHolidayPopup .wnmu-holiday-popup-body {
        min-height: 0;
        overflow: auto;
        padding: 16px;
      }
      #wnmuHolidayPopup .wnmu-holiday-chooser {
        max-width: 680px;
        margin: 0 auto;
      }
      #wnmuHolidayPopup .wnmu-holiday-chooser-intro {
        margin: 0 0 12px;
        color: #36596d;
        font-size: .92rem;
      }
      #wnmuHolidayPopup .wnmu-holiday-year-row {
        display: flex;
        align-items: end;
        gap: 10px;
        margin-bottom: 14px;
      }
      #wnmuHolidayPopup .wnmu-holiday-year-row label {
        display: grid;
        gap: 4px;
        color: #36596d;
        font-size: .78rem;
        font-weight: 750;
      }
      #wnmuHolidayPopup .wnmu-holiday-year-row select {
        min-width: 118px;
        min-height: 34px;
      }
      #wnmuHolidayPopup .wnmu-holiday-month-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 9px;
      }
      #wnmuHolidayPopup .wnmu-holiday-month-btn {
        min-height: 48px;
        padding: 8px 10px;
        border-radius: 11px;
        font-weight: 800;
      }
      #wnmuHolidayPopup .wnmu-holiday-view {
        min-height: 520px;
        height: min(720px, calc(100vh - 150px));
      }
      #wnmuHolidayPopup .wnmu-holiday-frame {
        width: 100%;
        height: 100%;
        border: 0;
        border-radius: 12px;
        background: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function closePopup() {
    const popup = byId('wnmuHolidayPopup');
    if (!popup || popup.classList.contains('hidden')) return;
    popup.classList.add('hidden');
    popup.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wnmu-holiday-popup-open');
    const frame = byId('wnmuHolidayFrame');
    if (frame) frame.src = 'about:blank';
    showChooser();
    lastFocused?.focus?.();
  }

  function showChooser() {
    byId('wnmuHolidayChooser')?.classList.remove('hidden');
    byId('wnmuHolidayView')?.classList.add('hidden');
    byId('wnmuHolidayBackBtn')?.classList.add('hidden');
    const title = byId('wnmuHolidayPopupTitle');
    if (title) title.textContent = 'Holidays / Events';
  }

  function showMonth(month) {
    const numericMonth = Number(month);
    if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) return;
    const year = Number(byId('wnmuHolidayYear')?.value) || new Date().getFullYear();
    const chooser = byId('wnmuHolidayChooser');
    const view = byId('wnmuHolidayView');
    const frame = byId('wnmuHolidayFrame');
    const title = byId('wnmuHolidayPopupTitle');
    if (!chooser || !view || !frame) return;

    chooser.classList.add('hidden');
    view.classList.remove('hidden');
    byId('wnmuHolidayBackBtn')?.classList.remove('hidden');
    if (title) title.textContent = `${MONTH_NAMES[numericMonth - 1]} ${year} Holidays / Events`;
    frame.src = `holidays-calendar.html?embed=1&month=${numericMonth}&year=${encodeURIComponent(year)}&v=${encodeURIComponent(VERSION)}`;
  }

  function openPopup() {
    if (!desktopMode()) return;
    const popup = byId('wnmuHolidayPopup');
    if (!popup) return;
    lastFocused = document.activeElement;
    showChooser();
    popup.classList.remove('hidden');
    popup.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wnmu-holiday-popup-open');
    byId('wnmuHolidayMonthCurrent')?.focus?.();
  }

  function ensurePopup() {
    if (byId('wnmuHolidayPopup')) return;
    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let year = currentYear - 1; year <= currentYear + 4; year += 1) {
      yearOptions.push(`<option value="${year}"${year === currentYear ? ' selected' : ''}>${year}</option>`);
    }

    const popup = document.createElement('div');
    popup.id = 'wnmuHolidayPopup';
    popup.className = 'hidden';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-hidden', 'true');
    popup.setAttribute('aria-labelledby', 'wnmuHolidayPopupTitle');
    popup.innerHTML = `
      <div class="wnmu-holiday-popup-card">
        <div class="wnmu-holiday-popup-head">
          <h2 id="wnmuHolidayPopupTitle" class="wnmu-holiday-popup-title">Holidays / Events</h2>
          <div class="wnmu-holiday-popup-head-actions">
            <button type="button" id="wnmuHolidayBackBtn" class="ghost hidden">Choose another month</button>
            <button type="button" id="wnmuHolidayCloseBtn" class="ghost">Close</button>
          </div>
        </div>
        <div class="wnmu-holiday-popup-body">
          <div id="wnmuHolidayChooser" class="wnmu-holiday-chooser">
            <p class="wnmu-holiday-chooser-intro">Which month do you want to see?</p>
            <div class="wnmu-holiday-year-row">
              <label>Year
                <select id="wnmuHolidayYear">${yearOptions.join('')}</select>
              </label>
            </div>
            <div class="wnmu-holiday-month-grid">
              ${MONTH_NAMES.map((name, index) => `<button type="button" class="wnmu-holiday-month-btn" data-holiday-month="${index + 1}"${index + 1 === new Date().getMonth() + 1 ? ' id="wnmuHolidayMonthCurrent"' : ''}>${name}</button>`).join('')}
            </div>
          </div>
          <div id="wnmuHolidayView" class="wnmu-holiday-view hidden">
            <iframe id="wnmuHolidayFrame" class="wnmu-holiday-frame" title="Selected month holidays and events" src="about:blank"></iframe>
          </div>
        </div>
      </div>`;
    document.body.appendChild(popup);

    popup.addEventListener('click', (event) => {
      if (event.target === popup) closePopup();
      const monthButton = event.target.closest('[data-holiday-month]');
      if (monthButton) showMonth(monthButton.dataset.holidayMonth);
    });
    byId('wnmuHolidayCloseBtn')?.addEventListener('click', closePopup);
    byId('wnmuHolidayBackBtn')?.addEventListener('click', showChooser);
  }

  function ensureDesktopButton() {
    const original = byId('holidayCalendarBtn');
    if (!original || byId('holidayCalendarPopupBtn')) return;
    const button = original.cloneNode(true);
    button.id = 'holidayCalendarPopupBtn';
    button.removeAttribute('aria-hidden');
    button.removeAttribute('tabindex');
    button.disabled = false;
    button.textContent = original.textContent || 'Holidays / events';
    original.insertAdjacentElement('afterend', button);
    button.addEventListener('click', openPopup);
  }

  function handleViewportChange() {
    if (!desktopMode()) closePopup();
  }

  function install() {
    if (!window.WNMU_WORKSPACE_TEST) return;
    ensureStyles();
    ensureDesktopButton();
    ensurePopup();
    try { window.matchMedia(DESKTOP_QUERY).addEventListener('change', handleViewportChange); }
    catch (_error) { window.addEventListener('resize', handleViewportChange); }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !byId('wnmuHolidayPopup')?.classList.contains('hidden')) closePopup();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();

  window.WNMUHolidaysPopup = { version: VERSION, open: openPopup, close: closePopup };
})();
