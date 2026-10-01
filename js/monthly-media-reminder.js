(() => {
  'use strict';

  const TABLE = 'monthly_media_schedule';
  const DISMISS_PREFIX = 'wnmu-monthly-media-reminder-dismissed-';
  const WINDOW_DAYS = 7;

  function targetMonthForReminder(now = new Date()) {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const lastDay = new Date(year, month + 1, 0).getDate();

    if (day <= WINDOW_DAYS) return { year, month };
    if ((lastDay - day) < WINDOW_DAYS) {
      const next = new Date(year, month + 1, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    }
    return null;
  }

  function monthKey(target) {
    return `${target.year}-${String(target.month + 1).padStart(2, '0')}`;
  }

  function localDayKey(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function dateIsInTargetMonth(value, target) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return false;
    return Number(match[1]) === target.year && Number(match[2]) === target.month + 1;
  }

  function dismissedToday(target) {
    try {
      return localStorage.getItem(DISMISS_PREFIX + monthKey(target)) === localDayKey();
    } catch {
      return false;
    }
  }

  function dismissForToday(target) {
    try {
      localStorage.setItem(DISMISS_PREFIX + monthKey(target), localDayKey());
    } catch {}
  }

  async function loadActiveRows() {
    const config = window.APP_CONFIG || {};
    const baseUrl = String(config.SUPABASE_URL || '').replace(/\/$/, '');
    const anonKey = String(config.SUPABASE_ANON_KEY || '');
    if (!baseUrl || !anonKey) return [];
    const url = `${baseUrl}/rest/v1/${TABLE}?select=series_title,last_scheduled_date,is_active&is_active=eq.true&order=series_title.asc`;
    const response = await fetch(url, {
      cache: 'no-store',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`
      }
    });
    if (!response.ok) throw new Error(`Monthly media reminder lookup failed: HTTP ${response.status}`);
    return await response.json();
  }

  function installStyles() {
    if (document.getElementById('monthlyMediaReminderStyles')) return;
    const style = document.createElement('style');
    style.id = 'monthlyMediaReminderStyles';
    style.textContent = `
      .monthly-media-reminder-backdrop {
        position: fixed; inset: 0; z-index: 12000; display: flex;
        align-items: center; justify-content: center; padding: 18px;
        background: rgba(4,20,31,.42); backdrop-filter: blur(2px);
      }
      .monthly-media-reminder {
        width: min(520px, calc(100vw - 36px)); background: #fff; color: #173746;
        border: 1px solid rgba(18,134,127,.3); border-radius: 18px;
        box-shadow: 0 24px 60px rgba(12,39,68,.28); padding: 19px;
        font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      }
      .monthly-media-reminder h2 { margin: 0 0 7px; font-size: 1.08rem; }
      .monthly-media-reminder p { margin: 0 0 10px; line-height: 1.4; }
      .monthly-media-reminder .media-reminder-titles {
        margin: 8px 0 14px; padding: 9px 11px; border-radius: 11px;
        background: #f5f9fb; color: #49636f; font-size: .88rem; line-height: 1.4;
      }
      .monthly-media-reminder .media-reminder-actions {
        display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;
      }
      .monthly-media-reminder button, .monthly-media-reminder a {
        min-height: 36px; padding: 8px 12px; border-radius: 9px; border: 1px solid #b8cbd5;
        background: #fff; color: #173746; font: inherit; font-weight: 700; text-decoration: none;
        cursor: pointer; display: inline-flex; align-items: center;
      }
      .monthly-media-reminder a {
        background: #176d75; border-color: #176d75; color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function showReminder(target, staleRows) {
    if (!staleRows.length || document.getElementById('monthlyMediaReminderBackdrop')) return;
    installStyles();
    const monthName = new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(target.year, target.month, 1));
    const preview = staleRows.slice(0, 6).map((row) => String(row.series_title || 'Untitled')).join(', ');
    const more = staleRows.length > 6 ? ` and ${staleRows.length - 6} more` : '';

    const backdrop = document.createElement('div');
    backdrop.id = 'monthlyMediaReminderBackdrop';
    backdrop.className = 'monthly-media-reminder-backdrop';
    backdrop.innerHTML = `
      <div class="monthly-media-reminder" role="dialog" aria-modal="true" aria-labelledby="monthlyMediaReminderTitle">
        <h2 id="monthlyMediaReminderTitle">Monthly Media needs attention</h2>
        <p><strong>${staleRows.length} active series</strong> do not have a Last Sched date in ${monthName} ${target.year}.</p>
        <div class="media-reminder-titles"></div>
        <div class="media-reminder-actions">
          <button type="button" data-media-reminder-dismiss>Dismiss for today</button>
          <a href="monthly-media.html">Open Monthly Media</a>
        </div>
      </div>
    `;
    backdrop.querySelector('.media-reminder-titles').textContent = preview + more;
    backdrop.querySelector('[data-media-reminder-dismiss]').addEventListener('click', () => {
      dismissForToday(target);
      backdrop.remove();
    });
    document.body.appendChild(backdrop);
  }

  async function checkMonthlyMediaReminder() {
    const target = targetMonthForReminder();
    if (!target || dismissedToday(target)) return;
    try {
      const rows = await loadActiveRows();
      const staleRows = rows.filter((row) => !dateIsInTargetMonth(row.last_scheduled_date, target));
      showReminder(target, staleRows);
    } catch (error) {
      console.warn('Monthly Media reminder skipped:', error?.message || error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void checkMonthlyMediaReminder(), { once: true });
  } else {
    void checkMonthlyMediaReminder();
  }
})();
