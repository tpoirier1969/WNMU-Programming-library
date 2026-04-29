const config = window.APP_CONFIG || {};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ONLINE_HOLIDAY_MODULE = 'https://cdn.skypack.dev/date-holidays@3.27.0';
const UN_ICS_URL = 'https://raw.githubusercontent.com/civilianEU/un-international-days/master/un-international-days.ics';

const CATEGORY_META = Object.freeze({
  national: { label: 'National / Civic', className: 'cat-national' },
  religious: { label: 'Religious', className: 'cat-religious' },
  health: { label: 'Health / Safety', className: 'cat-health' },
  heritage: { label: 'Heritage / Culture', className: 'cat-heritage' },
  environment: { label: 'Environment / Wildlife', className: 'cat-environment' },
  education: { label: 'Education / Arts / Science', className: 'cat-education' },
  awareness: { label: 'Awareness / Advocacy', className: 'cat-awareness' },
  international: { label: 'International / UN', className: 'cat-international' },
  history: { label: 'Historical / Remembrance', className: 'cat-history' },
  seasonal: { label: 'Seasonal / Lifestyle', className: 'cat-seasonal' },
  custom: { label: 'Custom', className: 'cat-custom' }
});

const SUPPLEMENTAL_OBSERVANCES = Object.freeze([
  { title: 'Glaucoma Awareness Month', rule_type: 'month_scope', month: 1, category: 'health' },
  { title: 'National Mentoring Month', rule_type: 'month_scope', month: 1, category: 'awareness' },
  { title: 'Slavery and Human Trafficking Prevention Month', rule_type: 'month_scope', month: 1, category: 'awareness' },
  { title: 'Science Fiction Day', rule_type: 'fixed_date', month: 1, day: 2, category: 'education' },
  { title: 'Technology Day', rule_type: 'fixed_date', month: 1, day: 6, category: 'education' },
  { title: 'National Human Trafficking Awareness Day', rule_type: 'fixed_date', month: 1, day: 11, category: 'awareness' },
  { title: 'Religious Freedom Day', rule_type: 'fixed_date', month: 1, day: 16, category: 'national' },
  { title: 'International Holocaust Remembrance Day', rule_type: 'fixed_date', month: 1, day: 27, category: 'history' },

  { title: 'Bird-Feeding Month', rule_type: 'month_scope', month: 2, category: 'environment' },
  { title: 'American Heart Month', rule_type: 'month_scope', month: 2, category: 'health' },
  { title: 'Black History Month', rule_type: 'month_scope', month: 2, category: 'heritage' },
  { title: 'Groundhog Day', rule_type: 'fixed_date', month: 2, day: 2, category: 'seasonal' },
  { title: 'World Cancer Day', rule_type: 'fixed_date', month: 2, day: 4, category: 'health' },
  { title: 'Sami National Day', rule_type: 'fixed_date', month: 2, day: 6, category: 'heritage' },
  { title: 'Safer Internet Day', rule_type: 'nth_weekday', month: 2, nth: 2, weekday: 2, category: 'education', notes: '2nd Tuesday in February' },
  { title: 'International Day of Women and Girls in Science', rule_type: 'fixed_date', month: 2, day: 11, category: 'education' },
  { title: 'World Day of the Sick', rule_type: 'fixed_date', month: 2, day: 11, category: 'health' },
  { title: 'Sexual and Reproductive Health Awareness Week', rule_type: 'date_range_fixed', month: 2, start_month: 2, start_day: 12, end_month: 2, end_day: 16, category: 'health' },
  { title: 'Valentine\'s Day', rule_type: 'fixed_date', month: 2, day: 14, category: 'seasonal' },
  { title: 'Random Acts of Kindness Day', rule_type: 'fixed_date', month: 2, day: 17, category: 'awareness' },
  { title: 'World Day of Social Justice', rule_type: 'fixed_date', month: 2, day: 20, category: 'international' },

  { title: 'Brain Injury Awareness Month', rule_type: 'month_scope', month: 3, category: 'health' },
  { title: 'Irish-American Heritage Month', rule_type: 'month_scope', month: 3, category: 'heritage' },
  { title: 'National Colon Cancer Awareness Month', rule_type: 'month_scope', month: 3, category: 'health' },
  { title: 'Women\'s History Month', rule_type: 'month_scope', month: 3, category: 'heritage' },
  { title: 'Youth Art Month', rule_type: 'month_scope', month: 3, category: 'education' },
  { title: 'Employee Appreciation Day', rule_type: 'nth_weekday', month: 3, nth: 1, weekday: 5, category: 'awareness' },
  { title: 'World Wildlife Day', rule_type: 'fixed_date', month: 3, day: 3, category: 'environment' },
  { title: 'International Women\'s Day', rule_type: 'fixed_date', month: 3, day: 8, category: 'international' },
  { title: 'St. Urho Day', rule_type: 'fixed_date', month: 3, day: 16, category: 'heritage' },
  { title: 'St. Patrick\'s Day', rule_type: 'fixed_date', month: 3, day: 17, category: 'heritage' },
  { title: 'World Poetry Day', rule_type: 'fixed_date', month: 3, day: 21, category: 'education' },
  { title: 'World Down Syndrome Day', rule_type: 'fixed_date', month: 3, day: 21, category: 'health' },
  { title: 'International Day of Forests', rule_type: 'fixed_date', month: 3, day: 21, category: 'environment' },
  { title: 'World Water Day', rule_type: 'fixed_date', month: 3, day: 22, category: 'environment' },
  { title: 'National Vietnam War Veterans Day', rule_type: 'fixed_date', month: 3, day: 29, category: 'history' },
  { title: 'World Bipolar Day', rule_type: 'fixed_date', month: 3, day: 30, category: 'health' },

  { title: 'Arab American Heritage Month', rule_type: 'month_scope', month: 4, category: 'heritage' },
  { title: 'Autism Awareness Month', rule_type: 'month_scope', month: 4, category: 'health' },
  { title: 'Jazz Appreciation Month', rule_type: 'month_scope', month: 4, category: 'education' },
  { title: 'National Child Abuse Prevention Month', rule_type: 'month_scope', month: 4, category: 'awareness' },
  { title: 'National Poetry Month', rule_type: 'month_scope', month: 4, category: 'education' },
  { title: 'Second Chance Month', rule_type: 'month_scope', month: 4, category: 'awareness' },
  { title: 'Sexual Assault Awareness Month', rule_type: 'month_scope', month: 4, category: 'health' },
  { title: 'Public School Month', rule_type: 'month_scope', month: 4, category: 'education' },
  { title: 'World Autism Awareness Day', rule_type: 'fixed_date', month: 4, day: 2, category: 'health' },
  { title: 'World Health Day', rule_type: 'fixed_date', month: 4, day: 7, category: 'health' },
  { title: 'World Hemophilia Day', rule_type: 'fixed_date', month: 4, day: 17, category: 'health' },
  { title: 'National Education and Sharing Day', rule_type: 'fixed_date', month: 4, day: 19, category: 'education' },
  { title: 'Earth Day', rule_type: 'fixed_date', month: 4, day: 22, category: 'environment' },
  { title: 'International Jazz Day', rule_type: 'fixed_date', month: 4, day: 30, category: 'education' },

  { title: 'Women\'s Health Month', rule_type: 'month_scope', month: 5, category: 'health' },
  { title: 'ALS Awareness Month', rule_type: 'month_scope', month: 5, category: 'health' },
  { title: 'Asian Pacific American Heritage Month', rule_type: 'month_scope', month: 5, category: 'heritage' },
  { title: 'Celiac Awareness Month', rule_type: 'month_scope', month: 5, category: 'health' },
  { title: 'Jewish American Heritage Month', rule_type: 'month_scope', month: 5, category: 'heritage' },
  { title: 'Mental Health Awareness Month', rule_type: 'month_scope', month: 5, category: 'health' },
  { title: 'National Bike Month', rule_type: 'month_scope', month: 5, category: 'environment' },
  { title: 'National Foster Care Month', rule_type: 'month_scope', month: 5, category: 'awareness' },
  { title: 'National Pet Month', rule_type: 'month_scope', month: 5, category: 'seasonal' },
  { title: 'National Stroke Awareness Month', rule_type: 'month_scope', month: 5, category: 'health' },
  { title: 'World Press Freedom Day', rule_type: 'fixed_date', month: 5, day: 3, category: 'awareness' },
  { title: 'International Firefighters\' Day', rule_type: 'fixed_date', month: 5, day: 4, category: 'national' },
  { title: 'Cinco de Mayo', rule_type: 'fixed_date', month: 5, day: 5, category: 'heritage' },
  { title: 'International No Diet Day', rule_type: 'fixed_date', month: 5, day: 6, category: 'health' },
  { title: 'Teacher Appreciation Day', rule_type: 'nth_weekday', month: 5, nth: 1, weekday: 2, category: 'education' },
  { title: 'World Migratory Bird Day', rule_type: 'nth_weekday', month: 5, nth: 2, weekday: 6, category: 'environment' },
  { title: 'International Nurses Day', rule_type: 'fixed_date', month: 5, day: 12, category: 'health' },
  { title: 'Greek Pride Day', rule_type: 'fixed_date', month: 5, day: 19, category: 'heritage' },
  { title: 'World Hunger Day', rule_type: 'fixed_date', month: 5, day: 28, category: 'awareness' },
  { title: 'World No Tobacco Day', rule_type: 'fixed_date', month: 5, day: 31, category: 'health' },

  { title: 'Great Outdoors Month', rule_type: 'month_scope', month: 6, category: 'environment' },
  { title: 'African-American Music Appreciation Month', rule_type: 'month_scope', month: 6, category: 'heritage' },
  { title: 'Alzheimer\'s and Brain Awareness Month', rule_type: 'month_scope', month: 6, category: 'health' },
  { title: 'LGBT Pride Month', rule_type: 'month_scope', month: 6, category: 'heritage' },
  { title: 'National Safety Month', rule_type: 'month_scope', month: 6, category: 'health' },
  { title: 'International Children\'s Day', rule_type: 'fixed_date', month: 6, day: 1, category: 'international' },
  { title: 'World Environment Day', rule_type: 'fixed_date', month: 6, day: 5, category: 'environment' },
  { title: 'D-Day Anniversary', rule_type: 'fixed_date', month: 6, day: 6, category: 'history' },
  { title: 'Anne Frank Day', rule_type: 'fixed_date', month: 6, day: 12, category: 'history' },
  { title: 'Flag Day', rule_type: 'fixed_date', month: 6, day: 14, category: 'national' },
  { title: 'International Yoga Day', rule_type: 'fixed_date', month: 6, day: 21, category: 'health' },
  { title: 'Take Your Dog to Work Day', rule_type: 'nth_weekday', month: 6, nth: 3, weekday: 5, category: 'seasonal' },
  { title: 'PTSD Awareness Day', rule_type: 'fixed_date', month: 6, day: 27, category: 'health' },

  { title: 'National Ice Cream Month', rule_type: 'month_scope', month: 7, category: 'seasonal' },
  { title: 'Bastille Day', rule_type: 'fixed_date', month: 7, day: 14, category: 'heritage' },
  { title: 'Christmas in July', rule_type: 'month_scope', month: 7, category: 'seasonal' },

  { title: 'International Beer Day', rule_type: 'nth_weekday', month: 8, nth: 1, weekday: 5, category: 'seasonal' },
  { title: 'International Owl Awareness Day', rule_type: 'fixed_date', month: 8, day: 4, category: 'environment' },
  { title: 'International Day of the World\'s Indigenous Peoples', rule_type: 'fixed_date', month: 8, day: 9, category: 'heritage' },
  { title: 'Youth Day', rule_type: 'fixed_date', month: 8, day: 12, category: 'awareness' },
  { title: 'World Mosquito Day', rule_type: 'fixed_date', month: 8, day: 20, category: 'health' },
  { title: 'Women\'s Equality Day', rule_type: 'fixed_date', month: 8, day: 26, category: 'awareness' },
  { title: 'Friendship Day', rule_type: 'nth_weekday', month: 8, nth: 1, weekday: 0, category: 'seasonal' },
  { title: 'National Park Service Anniversary', rule_type: 'fixed_date', month: 8, day: 25, category: 'environment' },

  { title: 'Classical Music Month', rule_type: 'month_scope', month: 9, category: 'education' },
  { title: 'Gospel Music Heritage Month', rule_type: 'month_scope', month: 9, category: 'heritage' },
  { title: 'Healthy Aging Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'Self-Improvement Month', rule_type: 'month_scope', month: 9, category: 'awareness' },
  { title: 'Civic Awareness Month', rule_type: 'month_scope', month: 9, category: 'awareness' },
  { title: 'National Honey Month', rule_type: 'month_scope', month: 9, category: 'environment' },
  { title: 'National Sewing Month', rule_type: 'month_scope', month: 9, category: 'education' },
  { title: 'National Bourbon Heritage Month', rule_type: 'month_scope', month: 9, category: 'heritage' },
  { title: 'National Preparedness Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'National Prostate Health Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'National Yoga Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'Pain Awareness Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'National Recovery Month', rule_type: 'month_scope', month: 9, category: 'health' },
  { title: 'National Grandparents Day', rule_type: 'nth_weekday', month: 9, nth: 2, weekday: 0, category: 'seasonal' },
  { title: 'World Suicide Prevention Day', rule_type: 'fixed_date', month: 9, day: 10, category: 'health' },
  { title: 'Positive Thinking Day', rule_type: 'fixed_date', month: 9, day: 13, category: 'awareness' },
  { title: 'International Chocolate Day', rule_type: 'fixed_date', month: 9, day: 13, category: 'seasonal' },
  { title: 'World Car-Free Day', rule_type: 'fixed_date', month: 9, day: 22, category: 'environment' },
  { title: 'Native American Day', rule_type: 'fixed_date', month: 9, day: 27, category: 'heritage' },

  { title: 'Breast Cancer Awareness Month', rule_type: 'month_scope', month: 10, category: 'health' },
  { title: 'Filipino American Heritage Month', rule_type: 'month_scope', month: 10, category: 'heritage' },
  { title: 'Italian American Heritage and Culture Month', rule_type: 'month_scope', month: 10, category: 'heritage' },
  { title: 'National Arts and Humanities Month', rule_type: 'month_scope', month: 10, category: 'education' },
  { title: 'National Bullying Prevention Month', rule_type: 'month_scope', month: 10, category: 'awareness' },
  { title: 'National Cybersecurity Awareness Month', rule_type: 'month_scope', month: 10, category: 'education' },
  { title: 'National Disability Employment Awareness Month', rule_type: 'month_scope', month: 10, category: 'awareness' },
  { title: 'National Hispanic Heritage Month', rule_type: 'date_range_fixed', month: 9, start_month: 9, start_day: 15, end_month: 10, end_day: 15, category: 'heritage' },
  { title: 'National Pizza Month', rule_type: 'month_scope', month: 10, category: 'seasonal' },
  { title: 'Domestic Violence Awareness Month', rule_type: 'month_scope', month: 10, category: 'awareness' },
  { title: 'Armenian Culture Month', rule_type: 'month_scope', month: 10, category: 'heritage' },
  { title: 'World Vegetarian Day', rule_type: 'fixed_date', month: 10, day: 1, category: 'health' },
  { title: 'World Mental Health Day', rule_type: 'fixed_date', month: 10, day: 10, category: 'health' },
  { title: 'National Coming Out Day', rule_type: 'fixed_date', month: 10, day: 11, category: 'awareness' },
  { title: 'Boss\'s Day', rule_type: 'fixed_date', month: 10, day: 16, category: 'seasonal' },
  { title: 'Sweetest Day', rule_type: 'nth_weekday', month: 10, nth: 3, weekday: 6, category: 'seasonal' },
  { title: 'United Nations Day', rule_type: 'fixed_date', month: 10, day: 24, category: 'international' },
  { title: 'National Cat Day', rule_type: 'fixed_date', month: 10, day: 29, category: 'seasonal' },
  { title: 'Mischief Night', rule_type: 'fixed_date', month: 10, day: 30, category: 'seasonal' },

  { title: 'COPD Awareness Month', rule_type: 'month_scope', month: 11, category: 'health' },
  { title: 'Men\'s Health Awareness Month', rule_type: 'month_scope', month: 11, category: 'health' },
  { title: 'Native American and Alaska Native Heritage Month', rule_type: 'month_scope', month: 11, category: 'heritage' },
  { title: 'National Education Month', rule_type: 'month_scope', month: 11, category: 'education' },
  { title: 'American Education Week', rule_type: 'date_range_fixed', month: 11, start_month: 11, start_day: 18, end_month: 11, end_day: 22, category: 'education' },
  { title: 'World Vegan Day', rule_type: 'fixed_date', month: 11, day: 1, category: 'health' },
  { title: 'All Saints\' Day', rule_type: 'fixed_date', month: 11, day: 1, category: 'religious' },
  { title: 'All Souls\' Day', rule_type: 'fixed_date', month: 11, day: 2, category: 'religious' },
  { title: 'Veterans Day', rule_type: 'fixed_date', month: 11, day: 11, category: 'national' },
  { title: 'International Men\'s Day', rule_type: 'fixed_date', month: 11, day: 19, category: 'awareness' },
  { title: 'JFK Assassination Remembrance', rule_type: 'fixed_date', month: 11, day: 22, category: 'history' },
  { title: 'Black Friday', rule_type: 'nth_weekday', month: 11, nth: 4, weekday: 5, category: 'seasonal' },

  { title: 'Cyber Monday', rule_type: 'nth_weekday', month: 12, nth: 1, weekday: 1, category: 'seasonal' },
  { title: 'Pearl Harbor Remembrance Day', rule_type: 'fixed_date', month: 12, day: 7, category: 'history' },
  { title: 'Human Rights Day', rule_type: 'fixed_date', month: 12, day: 10, category: 'international' },
  { title: 'December Solstice', rule_type: 'manual_text', month: 12, manual_date_text: 'Around 12/21 each year', category: 'seasonal' },
  { title: 'Festivus', rule_type: 'fixed_date', month: 12, day: 23, category: 'seasonal' },
  { title: 'Christmas Eve', rule_type: 'fixed_date', month: 12, day: 24, category: 'religious' },
  { title: 'Christmas Day', rule_type: 'fixed_date', month: 12, day: 25, category: 'religious' },
  { title: 'Kwanzaa', rule_type: 'date_range_fixed', month: 12, start_month: 12, start_day: 26, end_month: 1, end_day: 1, category: 'heritage' },
  { title: 'New Year\'s Eve', rule_type: 'fixed_date', month: 12, day: 31, category: 'seasonal' }
]);

const state = {
  supabase: null,
  session: null,
  customObservances: [],
  selectedYear: new Date().getFullYear(),
  editingId: null,
  onlineObservances: [],
  holidayFeedStatus: 'Loading online holiday sources…',
  holidaysModule: null
};

const els = {
  setupNotice: document.getElementById('setupNotice'),
  pageShell: document.getElementById('pageShell'),
  statusLine: document.getElementById('statusLine'),
  loginGitHubBtn: document.getElementById('loginGitHubBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  authStateText: document.getElementById('authStateText'),
  pageFeedback: document.getElementById('pageFeedback'),
  yearSelect: document.getElementById('yearSelect'),
  refreshBtn: document.getElementById('refreshBtn'),
  monthsGrid: document.getElementById('monthsGrid'),
  customForm: document.getElementById('customForm'),
  saveCustomBtn: document.getElementById('saveCustomBtn'),
  resetCustomBtn: document.getElementById('resetCustomBtn'),
  customList: document.getElementById('customList'),
  ruleTypeSelect: document.getElementById('ruleTypeSelect'),
  monthSelect: document.getElementById('monthSelect'),
  ruleMonthSelect: document.getElementById('ruleMonthSelect'),
  startMonthSelect: document.getElementById('startMonthSelect'),
  endMonthSelect: document.getElementById('endMonthSelect'),
  weekdaySelect: document.getElementById('weekdaySelect'),
  holidaySourceNote: document.getElementById('holidaySourceNote'),
  legendChips: document.getElementById('legendChips')
};

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function escapeHtml(value) {
  return (value ?? '').toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function hasValidConfig() {
  return Boolean(config.SUPABASE_URL && config.SUPABASE_ANON_KEY && String(config.SUPABASE_URL).startsWith('http'));
}

function canEdit() {
  return Boolean(state.session);
}

function setStatus(message) {
  if (els.statusLine) els.statusLine.textContent = message || '';
}

function setFeedback(message = '', tone = '') {
  if (!els.pageFeedback) return;
  els.pageFeedback.textContent = message || '';
  els.pageFeedback.className = `feedback-line ${tone}`.trim();
}

function setHolidaySourceNote(message) {
  if (els.holidaySourceNote) els.holidaySourceNote.textContent = message || '';
}

function fillSelect(select, values, labeler) {
  if (!select) return;
  const existing = normalizeText(select.value);
  select.innerHTML = values.map((value) => `<option value="${value}">${escapeHtml(labeler ? labeler(value) : value)}</option>`).join('');
  if (existing) select.value = existing;
}

function populateStaticSelects() {
  const years = [];
  for (let year = state.selectedYear - 2; year <= state.selectedYear + 5; year += 1) years.push(year);
  fillSelect(els.yearSelect, years, (value) => String(value));
  els.yearSelect.value = String(state.selectedYear);
  fillSelect(els.monthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.ruleMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.startMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.endMonthSelect, MONTH_NAMES.map((_, idx) => idx + 1), (value) => MONTH_NAMES[value - 1]);
  fillSelect(els.weekdaySelect, WEEKDAY_NAMES.map((_, idx) => idx), (value) => WEEKDAY_NAMES[value]);
}

function renderLegend() {
  if (!els.legendChips) return;
  els.legendChips.innerHTML = Object.values(CATEGORY_META).map((meta) => `
    <span class="category-badge ${meta.className}"><span class="dot"></span>${escapeHtml(meta.label)}</span>
  `).join('');
}

function nthWeekdayOfMonth(year, month, weekday, nth) {
  const first = new Date(year, month - 1, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + ((nth - 1) * 7);
  const candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1) return null;
  return candidate;
}

function lastWeekdayOfMonth(year, month, weekday) {
  const last = new Date(year, month, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return new Date(year, month - 1, last.getDate() - offset);
}

function monthDayText(month, day) {
  return `${MONTH_NAMES[month - 1]} ${Number(day)}`;
}

function formatEventDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function ordinalLabel(value) {
  const numeric = Number(value);
  if (numeric === 1) return '1st';
  if (numeric === 2) return '2nd';
  if (numeric === 3) return '3rd';
  return `${numeric}th`;
}

function summarizeRule(item) {
  switch (item.rule_type) {
    case 'fixed_date': return `${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]} ${item.day}`;
    case 'nth_weekday': return `${ordinalLabel(item.nth)} ${WEEKDAY_NAMES[item.weekday]} in ${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]}`;
    case 'last_weekday': return `Last ${WEEKDAY_NAMES[item.weekday]} in ${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]}`;
    case 'month_scope': return `${MONTH_NAMES[(item.rule_month || item.month || 1) - 1]} (month-long)`;
    case 'date_range_fixed': return `${monthDayText(item.start_month, item.start_day)}–${monthDayText(item.end_month, item.end_day)}`;
    case 'manual_text': return item.manual_date_text || 'Manual date text';
    default: return item.rule_type || '';
  }
}

function computeOccurrence(item, year) {
  const ruleMonth = Number(item.rule_month || item.month || 0);
  switch (item.rule_type) {
    case 'fixed_date': {
      const month = ruleMonth;
      const date = new Date(year, month - 1, Number(item.day));
      if (date.getMonth() !== month - 1) return null;
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'nth_weekday': {
      const month = ruleMonth;
      const date = nthWeekdayOfMonth(year, month, Number(item.weekday), Number(item.nth));
      if (!date) return null;
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'last_weekday': {
      const month = ruleMonth;
      const date = lastWeekdayOfMonth(year, month, Number(item.weekday));
      return { month, dateText: formatEventDate(date), sortDay: date.getDate() };
    }
    case 'month_scope': {
      const month = ruleMonth;
      return { month, dateText: 'All month', sortDay: 0, monthScope: true };
    }
    case 'date_range_fixed': {
      const month = Number(item.month || item.start_month || 0);
      return {
        month,
        dateText: `${monthDayText(Number(item.start_month), Number(item.start_day))}–${monthDayText(Number(item.end_month), Number(item.end_day))}`,
        sortDay: Number(item.start_day || 0)
      };
    }
    case 'manual_text': {
      const month = Number(item.month || 0);
      return { month, dateText: normalizeText(item.manual_date_text) || 'Custom date', sortDay: 99 };
    }
    default:
      return null;
  }
}

function getCategoryMeta(category) {
  return CATEGORY_META[category] || CATEGORY_META.custom;
}

function inferCategory(title, types = [], note = '') {
  const haystack = `${normalizeLower(title)} ${normalizeLower(note)}`;
  const typeSet = Array.isArray(types) ? types.map((type) => normalizeLower(type)) : [normalizeLower(types)];

  if (typeSet.includes('public') || typeSet.includes('bank') || haystack.includes('president') || haystack.includes('memorial') || haystack.includes('veteran') || haystack.includes('independence') || haystack.includes('labor day') || haystack.includes('flag day') || haystack.includes('martin luther king')) return 'national';
  if (typeSet.includes('observance') && haystack.includes('united nations')) return 'international';
  if (haystack.includes('easter') || haystack.includes('passover') || haystack.includes('hanukkah') || haystack.includes('ramadan') || haystack.includes('diwali') || haystack.includes('epiphany') || haystack.includes('holy') || haystack.includes('christmas') || haystack.includes('all saints') || haystack.includes('all souls') || haystack.includes('religious') || haystack.includes('ash wednesday')) return 'religious';
  if (haystack.includes('cancer') || haystack.includes('health') || haystack.includes('nurse') || haystack.includes('medical') || haystack.includes('brain') || haystack.includes('mental') || haystack.includes('suicide') || haystack.includes('heart') || haystack.includes('trauma') || haystack.includes('autism') || haystack.includes('hemophilia') || haystack.includes('ptsd') || haystack.includes('tobacco') || haystack.includes('yoga') || haystack.includes('sick')) return 'health';
  if (haystack.includes('heritage') || haystack.includes('history month') || haystack.includes('culture') || haystack.includes('pride') || haystack.includes('holocaust') || haystack.includes('native american') || haystack.includes('black history') || haystack.includes('hispanic') || haystack.includes('jewish') || haystack.includes('irish') || haystack.includes('filipino') || haystack.includes('italian') || haystack.includes('armenian') || haystack.includes('sami') || haystack.includes('indigenous')) return 'heritage';
  if (haystack.includes('earth') || haystack.includes('forest') || haystack.includes('wildlife') || haystack.includes('bird') || haystack.includes('wetland') || haystack.includes('water') || haystack.includes('environment') || haystack.includes('park') || haystack.includes('arbor') || haystack.includes('car-free')) return 'environment';
  if (haystack.includes('science') || haystack.includes('teacher') || haystack.includes('education') || haystack.includes('poetry') || haystack.includes('jazz') || haystack.includes('music') || haystack.includes('technology') || haystack.includes('cyber') || haystack.includes('art') || haystack.includes('press freedom')) return 'education';
  if (haystack.includes('international') || haystack.includes('united nations') || haystack.includes('human rights') || haystack.includes('social justice')) return 'international';
  if (haystack.includes('awareness') || haystack.includes('kindness') || haystack.includes('mentoring') || haystack.includes('foster care') || haystack.includes('child abuse') || haystack.includes('domestic violence') || haystack.includes('preparedness') || haystack.includes('women\'s equality') || haystack.includes('coming out')) return 'awareness';
  if (haystack.includes('anniversary') || haystack.includes('remembrance') || haystack.includes('vietnam') || haystack.includes('jfk') || haystack.includes('pearl harbor') || haystack.includes('d-day')) return 'history';
  return 'seasonal';
}

function createEntry(base) {
  return {
    title: base.title,
    month: Number(base.month),
    dateText: base.dateText,
    sortDay: Number(base.sortDay || 0),
    note: normalizeText(base.note || ''),
    category: base.category || 'custom',
    monthScope: Boolean(base.monthScope),
    source: base.source || 'supplemental'
  };
}

function dedupeEntries(entries) {
  const seen = new Map();
  entries.forEach((entry) => {
    const key = `${normalizeLower(entry.title)}|${entry.month}|${normalizeLower(entry.dateText)}|${Boolean(entry.monthScope)}`;
    if (!seen.has(key)) seen.set(key, entry);
  });
  return [...seen.values()];
}

function buildSupplementalEntries(year) {
  return SUPPLEMENTAL_OBSERVANCES.map((item) => {
    const occurrence = computeOccurrence(item, year);
    if (!occurrence || !occurrence.month) return null;
    return createEntry({
      title: item.title,
      month: occurrence.month,
      dateText: occurrence.dateText,
      sortDay: occurrence.sortDay,
      monthScope: occurrence.monthScope,
      note: item.notes || '',
      category: item.category || inferCategory(item.title, [], item.notes || ''),
      source: 'supplemental'
    });
  }).filter(Boolean);
}

function buildCustomEntries(year) {
  return state.customObservances
    .filter((item) => item.is_active !== false)
    .map((item) => {
      const occurrence = computeOccurrence(item, year);
      if (!occurrence || !occurrence.month) return null;
      return createEntry({
        title: item.title,
        month: occurrence.month,
        dateText: occurrence.dateText,
        sortDay: occurrence.sortDay,
        monthScope: occurrence.monthScope,
        note: item.notes || '',
        category: inferCategory(item.title, [], item.notes || '') || 'custom',
        source: 'custom'
      });
    })
    .filter(Boolean);
}

function buildMonthBuckets(year) {
  const buckets = Array.from({ length: 12 }, () => ({ monthItems: [], datedItems: [] }));
  const combined = dedupeEntries([
    ...state.onlineObservances,
    ...buildSupplementalEntries(year),
    ...buildCustomEntries(year)
  ]);

  combined.forEach((entry) => {
    if (!entry.month || entry.month < 1 || entry.month > 12) return;
    const target = buckets[entry.month - 1];
    if (entry.monthScope) target.monthItems.push(entry);
    else target.datedItems.push(entry);
  });

  buckets.forEach((bucket) => {
    bucket.monthItems.sort((a, b) => normalizeLower(a.title).localeCompare(normalizeLower(b.title)));
    bucket.datedItems.sort((a, b) => (a.sortDay - b.sortDay) || normalizeLower(a.title).localeCompare(normalizeLower(b.title)));
  });
  return buckets;
}

function renderCategoryBadge(category) {
  const meta = getCategoryMeta(category);
  return `<span class="category-badge ${meta.className}"><span class="dot"></span>${escapeHtml(meta.label)}</span>`;
}

function renderCalendar() {
  const buckets = buildMonthBuckets(state.selectedYear);
  els.monthsGrid.innerHTML = buckets.map((bucket, idx) => `
    <section class="month-card">
      <div class="month-head"><h3>${MONTH_NAMES[idx]} ${state.selectedYear}</h3></div>
      <div class="month-body">
        <div>
          <div class="section-label">Month-long observances</div>
          ${bucket.monthItems.length ? `<div class="chip-list">${bucket.monthItems.map((item) => `<span class="month-chip ${getCategoryMeta(item.category).className}">${escapeHtml(item.title)}</span>`).join('')}</div>` : '<div class="muted-empty">Nothing loaded for the whole month.</div>'}
        </div>
        <div>
          <div class="section-label">Dated events</div>
          ${bucket.datedItems.length ? `<div class="month-event-list">${bucket.datedItems.map((item) => `
            <div class="month-event ${getCategoryMeta(item.category).className}">
              <div class="event-date">${escapeHtml(item.dateText)}</div>
              <div>
                <div class="event-top">
                  <div class="event-title">${escapeHtml(item.title)}</div>
                  ${renderCategoryBadge(item.category)}
                </div>
                ${item.note ? `<div class="event-note">${escapeHtml(item.note)}</div>` : ''}
              </div>
            </div>`).join('')}</div>` : '<div class="muted-empty">No dated entries for this month.</div>'}
        </div>
      </div>
    </section>`).join('');
}

function updateAuthUi() {
  const editing = canEdit();
  els.loginGitHubBtn?.classList.toggle('hidden', editing);
  els.logoutBtn?.classList.toggle('hidden', !editing);
  if (els.authStateText) {
    els.authStateText.textContent = editing
      ? 'Signed in. You can add, edit, and delete custom observances.'
      : 'Read-only. Sign in with GitHub to change the custom list.';
  }
  els.customForm?.querySelectorAll('input, select, textarea, button').forEach((field) => {
    if (field === els.resetCustomBtn) return;
    field.disabled = !editing;
  });
  renderCustomList();
}

function collectCustomPayload() {
  const form = els.customForm;
  const ruleType = normalizeText(form.elements.rule_type.value);
  const base = {
    title: normalizeText(form.elements.title.value),
    rule_type: ruleType,
    month: Number(form.elements.month.value || 0) || null,
    rule_month: Number(form.elements.rule_month.value || 0) || null,
    day: Number(form.elements.day.value || 0) || null,
    nth: Number(form.elements.nth.value || 0) || null,
    weekday: normalizeText(form.elements.weekday.value) === '' ? null : Number(form.elements.weekday.value),
    start_month: Number(form.elements.start_month.value || 0) || null,
    start_day: Number(form.elements.start_day.value || 0) || null,
    end_month: Number(form.elements.end_month.value || 0) || null,
    end_day: Number(form.elements.end_day.value || 0) || null,
    manual_date_text: normalizeText(form.elements.manual_date_text.value) || null,
    notes: normalizeText(form.elements.notes.value) || null,
    is_active: Boolean(form.elements.is_active.checked),
    updated_at: new Date().toISOString()
  };
  if (ruleType === 'fixed_date') base.rule_month = base.rule_month || base.month;
  return base;
}

function validateCustomPayload(payload) {
  if (!payload.title) return 'Title is required.';
  switch (payload.rule_type) {
    case 'fixed_date':
      if (!payload.rule_month || !payload.day) return 'Fixed date needs a month and day.';
      break;
    case 'nth_weekday':
      if (!payload.rule_month || !payload.nth || payload.weekday == null) return 'Nth weekday needs month, nth value, and weekday.';
      break;
    case 'last_weekday':
      if (!payload.rule_month || payload.weekday == null) return 'Last weekday needs month and weekday.';
      break;
    case 'month_scope':
      if (!payload.rule_month) return 'Month-long observance needs a month.';
      break;
    case 'date_range_fixed':
      if (!payload.start_month || !payload.start_day || !payload.end_month || !payload.end_day) return 'Date range needs start and end month/day.';
      break;
    case 'manual_text':
      if (!payload.month || !payload.manual_date_text) return 'Manual text needs a display month and date text.';
      break;
    default:
      return 'Unknown rule type.';
  }
  return '';
}

function resetCustomForm() {
  els.customForm?.reset();
  state.editingId = null;
  if (els.customForm?.elements?.is_active) els.customForm.elements.is_active.checked = true;
  els.customForm.elements.id.value = '';
  els.saveCustomBtn.textContent = 'Save observance';
  updateRuleFieldVisibility();
}

function loadCustomIntoForm(id) {
  const item = state.customObservances.find((entry) => String(entry.id) === String(id));
  if (!item) return;
  state.editingId = item.id;
  const form = els.customForm;
  form.elements.id.value = item.id;
  form.elements.title.value = item.title || '';
  form.elements.rule_type.value = item.rule_type || 'fixed_date';
  form.elements.month.value = item.month || item.rule_month || item.start_month || 1;
  form.elements.rule_month.value = item.rule_month || item.month || 1;
  form.elements.day.value = item.day || '';
  form.elements.nth.value = item.nth || 1;
  form.elements.weekday.value = item.weekday ?? '';
  form.elements.start_month.value = item.start_month || item.month || 1;
  form.elements.start_day.value = item.start_day || '';
  form.elements.end_month.value = item.end_month || item.month || 1;
  form.elements.end_day.value = item.end_day || '';
  form.elements.manual_date_text.value = item.manual_date_text || '';
  form.elements.notes.value = item.notes || '';
  form.elements.is_active.checked = item.is_active !== false;
  els.saveCustomBtn.textContent = 'Update observance';
  updateRuleFieldVisibility();
  window.scrollTo({ top: els.customForm.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' });
}

function renderCustomList() {
  els.customList.innerHTML = state.customObservances.length ? state.customObservances.map((item) => `
    <article class="custom-item">
      <div class="custom-item-top">
        <div>
          <div class="event-top">
            <div class="custom-item-title">${escapeHtml(item.title)}</div>
            ${renderCategoryBadge(inferCategory(item.title, [], item.notes || '') || 'custom')}
          </div>
          <div class="custom-item-meta">${escapeHtml(summarizeRule(item))}${item.notes ? ` · ${escapeHtml(item.notes)}` : ''}${item.is_active === false ? ' · inactive' : ''}</div>
        </div>
        <div class="custom-actions">
          ${canEdit() ? `<button type="button" data-action="edit" data-id="${item.id}">Edit</button>` : ''}
          ${canEdit() ? `<button type="button" class="danger" data-action="delete" data-id="${item.id}">Delete</button>` : ''}
        </div>
      </div>
    </article>
  `).join('') : '<div class="muted-empty">No custom observances yet.</div>';
}

function updateRuleFieldVisibility() {
  const selected = normalizeText(els.ruleTypeSelect?.value || 'fixed_date');
  document.querySelectorAll('[data-rule]').forEach((field) => {
    const allowed = normalizeText(field.dataset.rule).split(/\s+/).filter(Boolean);
    field.classList.toggle('hidden', !allowed.includes(selected));
  });
}

async function loadCustomObservances() {
  setStatus('Loading custom observances…');
  const { data, error } = await state.supabase
    .from('holiday_observances')
    .select('*')
    .order('month', { ascending: true, nullsFirst: false })
    .order('title', { ascending: true });
  if (error) throw error;
  state.customObservances = data || [];
  renderCustomList();
  renderCalendar();
  setStatus(`Loaded ${state.customObservances.length.toLocaleString()} custom observance${state.customObservances.length === 1 ? '' : 's'}.`);
}

function dayCodeToIndex(dayCode) {
  const map = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
  return map[dayCode] ?? null;
}

function parseIcsDate(raw) {
  const compact = normalizeText(raw).replace(/[^0-9]/g, '');
  if (compact.length < 8) return null;
  const year = Number(compact.slice(0, 4));
  const month = Number(compact.slice(4, 6));
  const day = Number(compact.slice(6, 8));
  return new Date(year, month - 1, day);
}

function unfoldIcs(text) {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function computeFromRRule(dtstart, rrule, year) {
  if (!rrule) return dtstart && dtstart.getFullYear() === year ? dtstart : null;
  const parts = Object.fromEntries(rrule.split(';').map((segment) => {
    const [key, value] = segment.split('=');
    return [key, value];
  }));
  const month = Number(parts.BYMONTH || (dtstart ? dtstart.getMonth() + 1 : 0));
  if (!month) return dtstart && dtstart.getFullYear() === year ? dtstart : null;
  if (parts.BYMONTHDAY) {
    return new Date(year, month - 1, Number(parts.BYMONTHDAY.split(',')[0]));
  }
  if (parts.BYDAY) {
    const rawByDay = parts.BYDAY.split(',')[0];
    const match = rawByDay.match(/^(-?\d)?([A-Z]{2})$/);
    const bySetPos = Number(parts.BYSETPOS || 0);
    if (match) {
      const ordinal = Number(match[1] || bySetPos || 0);
      const weekday = dayCodeToIndex(match[2]);
      if (weekday == null) return null;
      if (ordinal === -1) return lastWeekdayOfMonth(year, month, weekday);
      if (ordinal > 0) return nthWeekdayOfMonth(year, month, weekday, ordinal);
      if (dtstart) {
        const fallbackOrdinal = Math.ceil(dtstart.getDate() / 7);
        return nthWeekdayOfMonth(year, month, weekday, fallbackOrdinal);
      }
    }
  }
  return dtstart ? new Date(year, dtstart.getMonth(), dtstart.getDate()) : null;
}

function parseUNIcs(text, year) {
  const lines = unfoldIcs(text);
  const events = [];
  let current = null;

  lines.forEach((line) => {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      return;
    }
    if (line === 'END:VEVENT') {
      if (current?.summary) {
        const dtstart = current.dtstart ? parseIcsDate(current.dtstart) : null;
        const date = computeFromRRule(dtstart, current.rrule, year);
        if (date && date.getFullYear() === year) {
          const title = current.summary.replace(/\\,/g, ',').replace(/\\n/g, ' ');
          events.push(createEntry({
            title,
            month: date.getMonth() + 1,
            dateText: formatEventDate(date),
            sortDay: date.getDate(),
            note: 'UN observance',
            category: inferCategory(title, [], 'UN observance') || 'international',
            source: 'un'
          }));
        }
      }
      current = null;
      return;
    }
    if (!current) return;
    const separator = line.indexOf(':');
    if (separator < 0) return;
    const rawKey = line.slice(0, separator);
    const value = line.slice(separator + 1);
    const key = rawKey.split(';')[0];
    if (key === 'SUMMARY') current.summary = value;
    if (key === 'DTSTART') current.dtstart = value;
    if (key === 'RRULE') current.rrule = value;
  });

  return events;
}

async function getHolidaysModule() {
  if (state.holidaysModule) return state.holidaysModule;
  const mod = await import(ONLINE_HOLIDAY_MODULE);
  state.holidaysModule = mod.default || mod;
  return state.holidaysModule;
}

async function fetchDateHolidays(year) {
  const Holidays = await getHolidaysModule();
  const hd = new Holidays('US');
  if (typeof hd.setLanguages === 'function') hd.setLanguages('en');
  const raw = typeof hd.getHolidays === 'function' ? hd.getHolidays(year) : [];
  return (raw || []).map((holiday) => {
    const rawDate = normalizeText(holiday.date).slice(0, 10);
    const date = rawDate ? new Date(`${rawDate}T00:00:00`) : holiday.start ? new Date(holiday.start) : null;
    if (!date || Number.isNaN(date.getTime())) return null;
    const noteBits = [];
    if (holiday.substitute) noteBits.push('Observed');
    if (holiday.note) noteBits.push(holiday.note);
    return createEntry({
      title: holiday.name || holiday.localName || 'Holiday',
      month: date.getMonth() + 1,
      dateText: formatEventDate(date),
      sortDay: date.getDate(),
      note: noteBits.join(' · '),
      category: inferCategory(holiday.name || holiday.localName || '', holiday.type || holiday.types || [], holiday.note || ''),
      source: 'date-holidays'
    });
  }).filter(Boolean);
}

async function loadOnlineObservances(year) {
  const sourcesLoaded = [];
  const allEntries = [];
  const errors = [];

  try {
    const holidays = await fetchDateHolidays(year);
    allEntries.push(...holidays);
    sourcesLoaded.push(`date-holidays (${holidays.length})`);
  } catch (error) {
    console.error('date-holidays load failed', error);
    errors.push('date-holidays feed failed');
  }

  try {
    const response = await fetch(UN_ICS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`UN feed returned ${response.status}`);
    const text = await response.text();
    const unEntries = parseUNIcs(text, year);
    allEntries.push(...unEntries);
    sourcesLoaded.push(`UN observances (${unEntries.length})`);
  } catch (error) {
    console.error('UN ICS load failed', error);
    errors.push('UN observance feed failed');
  }

  state.onlineObservances = dedupeEntries(allEntries);
  if (sourcesLoaded.length) {
    state.holidayFeedStatus = `Online feeds loaded for ${year}: ${sourcesLoaded.join(' + ')}. Supplemental recurring observances are layered in below.`;
  } else {
    state.holidayFeedStatus = `Online feeds were unavailable for ${year}. Showing the supplemental recurring observances and anything custom you saved.`;
  }
  if (errors.length) {
    state.holidayFeedStatus += ` (${errors.join('; ')})`;
  }
  setHolidaySourceNote(state.holidayFeedStatus);
  renderCalendar();
}

async function saveCustomObservance(event) {
  event.preventDefault();
  if (!canEdit()) {
    setFeedback('Sign in with GitHub to change the custom list.', 'warn');
    return;
  }
  const payload = collectCustomPayload();
  const validationMessage = validateCustomPayload(payload);
  if (validationMessage) {
    setFeedback(validationMessage, 'warn');
    return;
  }
  setFeedback(`${state.editingId ? 'Updating' : 'Saving'} ${payload.title}…`, 'info');
  setStatus(`${state.editingId ? 'Updating' : 'Saving'} ${payload.title}…`);
  try {
    let response;
    if (state.editingId) response = await state.supabase.from('holiday_observances').update(payload).eq('id', state.editingId).select('*').single();
    else response = await state.supabase.from('holiday_observances').insert(payload).select('*').single();
    if (response.error) throw response.error;
    await loadCustomObservances();
    resetCustomForm();
    setFeedback(`Saved ${response.data.title}.`, 'success');
    setStatus(`Saved ${response.data.title}.`);
  } catch (error) {
    console.error(error);
    setFeedback(error.message, 'error');
    setStatus(error.message);
  }
}

async function deleteCustomObservance(id) {
  const existing = state.customObservances.find((item) => String(item.id) === String(id));
  const label = existing?.title || 'this observance';
  if (!window.confirm(`Delete ${label}?`)) return;
  setFeedback(`Deleting ${label}…`, 'info');
  setStatus(`Deleting ${label}…`);
  try {
    const { error } = await state.supabase.from('holiday_observances').delete().eq('id', id);
    if (error) throw error;
    await loadCustomObservances();
    setFeedback(`Deleted ${label}.`, 'success');
    setStatus(`Deleted ${label}.`);
  } catch (error) {
    console.error(error);
    setFeedback(error.message, 'error');
    setStatus(error.message);
  }
}

function bindEvents() {
  els.loginGitHubBtn?.addEventListener('click', async () => {
    setFeedback('Sending you to GitHub…', 'info');
    const { error } = await state.supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.href.split('#')[0] }
    });
    if (error) {
      setFeedback(error.message, 'error');
      setStatus(error.message);
    }
  });

  els.logoutBtn?.addEventListener('click', async () => {
    await state.supabase.auth.signOut();
    state.session = null;
    updateAuthUi();
    setStatus('Signed out. Read-only mode is active.');
  });

  els.yearSelect?.addEventListener('change', async () => {
    state.selectedYear = Number(els.yearSelect.value) || new Date().getFullYear();
    renderCalendar();
    setStatus(`Loading holiday feeds for ${state.selectedYear}…`);
    await loadOnlineObservances(state.selectedYear);
    setStatus(`Showing holidays and observances for ${state.selectedYear}.`);
  });

  els.refreshBtn?.addEventListener('click', () => {
    void loadCustomObservances().catch((error) => {
      console.error(error);
      setFeedback(error.message, 'error');
      setStatus(error.message);
    });
  });

  els.ruleTypeSelect?.addEventListener('change', updateRuleFieldVisibility);
  els.customForm?.addEventListener('submit', saveCustomObservance);
  els.resetCustomBtn?.addEventListener('click', resetCustomForm);
  els.customList?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-id]');
    if (!button || !canEdit()) return;
    const { action, id } = button.dataset;
    if (action === 'edit') loadCustomIntoForm(id);
    if (action === 'delete') void deleteCustomObservance(id);
  });
}

async function init() {
  if (!hasValidConfig()) {
    els.setupNotice?.classList.remove('hidden');
    return;
  }

  populateStaticSelects();
  renderLegend();
  bindEvents();
  updateRuleFieldVisibility();
  resetCustomForm();
  els.pageShell?.classList.remove('hidden');
  setHolidaySourceNote(state.holidayFeedStatus);

  const noStoreFetch = (input, init = {}) => fetch(input, { ...init, cache: 'no-store' });
  state.supabase = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
    global: { fetch: noStoreFetch }
  });

  const { data } = await state.supabase.auth.getSession();
  state.session = data.session;
  updateAuthUi();
  renderCalendar();

  state.supabase.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    updateAuthUi();
  });

  try {
    await loadCustomObservances();
    await loadOnlineObservances(state.selectedYear);
    setFeedback('', '');
  } catch (error) {
    console.error(error);
    const message = normalizeLower(error?.message).includes('holiday_observances')
      ? 'The holiday observances table is missing. Run sql/monthly-media-and-holidays.sql first.'
      : error.message;
    setFeedback(message, 'error');
    setStatus(message);
  }
}

void init();
