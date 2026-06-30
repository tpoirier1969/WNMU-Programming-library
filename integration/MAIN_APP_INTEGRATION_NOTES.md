# Main App Integration Notes

These snippets expose the standalone report page from the main Programming Library only when Admin mode is active.

The feature itself lives in:

```text
quarterly-issues.html
styles-quarterly-issues.css
js/quarterly-issues-report.js
```

The report page also enforces Admin mode by checking the current Supabase auth session, so direct URL access still stays guarded.

## 1. Add the button to `index.html`

In the topbar actions, near the other app navigation buttons:

```html
<button id="quarterlyIssuesReportBtn" class="hidden">Quarterly issues</button>
```

Suggested placement:

```html
<button id="monthlyMediaBtn">Monthly media</button>
<button id="holidayCalendarBtn">Holidays / events</button>
<button id="quarterlyIssuesReportBtn" class="hidden">Quarterly issues</button>
<button id="exportBtn">Export current view</button>
```

## 2. Add the DOM reference in `js/core.js`

Inside the `els` object, near the other topbar buttons:

```js
quarterlyIssuesReportBtn: $('#quarterlyIssuesReportBtn'),
```

Suggested placement:

```js
monthlyMediaBtn: $('#monthlyMediaBtn'),
holidayCalendarBtn: $('#holidayCalendarBtn'),
quarterlyIssuesReportBtn: $('#quarterlyIssuesReportBtn'),
exportBtn: $('#exportBtn'),
```

## 3. Add the click handler in `js/events.js`

Inside `bindEvents()`, near the other navigation handlers:

```js
els.quarterlyIssuesReportBtn?.addEventListener('click', () => {
  window.location.href = 'quarterly-issues.html';
});
```

Suggested placement:

```js
els.newProgramBtn.addEventListener('click', () => { window.location.href = 'program-new.html'; });
els.monthlyMediaBtn?.addEventListener('click', () => { window.location.href = 'monthly-media.html'; });
els.holidayCalendarBtn?.addEventListener('click', () => { window.location.href = 'holidays-calendar.html'; });
els.quarterlyIssuesReportBtn?.addEventListener('click', () => { window.location.href = 'quarterly-issues.html'; });
```

## 4. Hide/show only in Admin mode

Find the existing `updateModeUI()` function and add this with the other admin-only button visibility logic:

```js
if (els.quarterlyIssuesReportBtn) {
  const admin = canEdit();
  els.quarterlyIssuesReportBtn.classList.toggle('hidden', !admin);
  els.quarterlyIssuesReportBtn.setAttribute('aria-hidden', admin ? 'false' : 'true');
}
```

This keeps the report builder visible only in Admin mode.

## 5. Important

Do not add write calls for this feature. The report page should remain draft/export only.

The report page already has no Supabase `.insert()`, `.update()`, `.delete()`, or `.rpc()` calls.
