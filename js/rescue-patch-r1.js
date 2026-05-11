const CREDITS_URL = 'data/wikimedia-image-overrides-wm4.json';

function routeName() {
  const hash = (location.hash || '#/home').replace(/^#\/?/, '');
  if (hash.startsWith('detail/')) return 'detail';
  if (hash.startsWith('focus/')) return hash.slice(6) || 'home';
  return hash || 'home';
}

function markActiveNav(route) {
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === route);
  });
}

function renameAvoidThese() {
  document.querySelectorAll('[data-nav="lookalikes"], a[href="#/lookalikes"], .section-chip, .workspace-head h2, .workspace-head .eyebrow, .result-header h3').forEach(el => {
    if ((el.textContent || '').trim() === 'Look-Alikes' || (el.textContent || '').trim() === 'Look-Alikes results' || (el.textContent || '').trim() === 'Look-Alikes filters') {
      el.textContent = el.textContent.replace('Look-Alikes', 'Avoid These');
    }
  });
}

function makeCardsClickable() {
  document.querySelectorAll('.card-title-link').forEach(link => {
    link.style.textDecoration = 'underline';
    link.style.textUnderlineOffset = '2px';
  });
  document.querySelectorAll('.result-card').forEach(card => {
    const title = card.querySelector('.card-title-link');
    const thumb = card.querySelector('.thumb');
    if (!title || !thumb) return;
    thumb.style.cursor = 'pointer';
    thumb.addEventListener('click', e => {
      e.preventDefault();
      title.click();
    }, { once: true });
  });
}

function hideHomeSeasonBits(route) {
  if (route !== 'home') return;
  document.querySelectorAll('.workspace-actions .buttonish, .result-actions .buttonish').forEach(btn => {
    if ((btn.textContent || '').trim() === 'In season') btn.remove();
  });
  const chooser = document.querySelector('.focus-now-panel .section-chip-row');
  if (chooser) chooser.remove();
}

function keepSeasonOnlyPlantsMushrooms(route) {
  if (route === 'plants' || route === 'mushrooms') return;
  document.querySelectorAll('.workspace-actions .buttonish, .result-actions .buttonish').forEach(btn => {
    if ((btn.textContent || '').trim() === 'In season') btn.remove();
  });
}

function filterMushrooms() {
  if (routeName() !== 'mushrooms') return;
  document.querySelectorAll('.result-card').forEach(card => {
    const text = (card.textContent || '').toLowerCase();
    const bad = /(risk:|deadly|poisonous|toxic|inedible|nonculinary|non-culinary|questionable)/.test(text);
    const good = /(edibility:\s*(choice|edible|good)|\bchoice\b|\bedible\b|\bgood\b)/.test(text);
    if (bad && !good) card.remove();
  });
  const header = document.querySelector('.workspace-head p:last-child');
  if (header) header.textContent = 'Edible and foraging-relevant mushrooms only. The dangerous or non-culinary stuff belongs under Avoid These or Medicinal.';
}

async function renderCreditsPage() {
  const root = document.getElementById('pageRoot');
  if (!root) return;
  let payload = { overrides: {} };
  try {
    const res = await fetch(CREDITS_URL, { cache: 'no-store' });
    if (res.ok) payload = await res.json();
  } catch {}
  const entries = Object.entries(payload.overrides || {}).map(([slug, value]) => {
    const label = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const items = (value.images || []).map((url, i) => `<li><a href="${url}" target="_blank" rel="noreferrer">Image ${i + 1}</a></li>`).join('');
    return `<article class="panel"><h3>${label}</h3><ul>${items}</ul></article>`;
  }).join('');
  root.innerHTML = `<section class="focus-now-panel panel"><div class="focus-now-copy"><p class="eyebrow subtle">Credits</p><h2>Image credits</h2><p>This rescue page uses Wikimedia image links supplied in chat.</p></div></section><section class="workspace-shell">${entries || '<section class="panel empty-state"><h3>No credits loaded</h3></section>'}</section>`;
  markActiveNav('credits');
}

async function applyRescuePatches() {
  const route = routeName();
  if (route === 'credits') {
    await renderCreditsPage();
    return;
  }
  renameAvoidThese();
  keepSeasonOnlyPlantsMushrooms(route);
  hideHomeSeasonBits(route);
  filterMushrooms();
  makeCardsClickable();
}

window.addEventListener('hashchange', () => setTimeout(applyRescuePatches, 60));
window.addEventListener('load', () => setTimeout(applyRescuePatches, 120));
const obs = new MutationObserver(() => {
  if (routeName() !== 'credits') applyRescuePatches();
});
obs.observe(document.documentElement, { childList: true, subtree: true });
