// Add New Program: suggest distributor from existing records without changing duplicate detection.
(() => {
  'use strict';

  function install() {
    const form = document.getElementById('programForm');
    if (!form || form.dataset.distributorMatchInstalled === '1') return;

    const titleField = form.elements.title;
    const nolaField = form.elements.nola_eidr;
    const distributorField = form.elements.distributor;
    if (!titleField || !nolaField || !distributorField) return;
    form.dataset.distributorMatchInstalled = '1';

    const normalize = (value) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    const clean = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
    const placeholders = new Set(['nonola', 'no nola', 'no-nola', 'n/a', 'na', 'none', 'unknown']);
    let revision = 0;
    let debounceTimer = null;
    let inFlightKey = '';
    let completedKey = '';
    let autoFilled = '';
    let manualOverride = false;
    let internalChange = false;
    const promptedKeys = new Set();

    const style = document.createElement('style');
    style.textContent = [
      '.distributor-match-dialog{width:min(500px,calc(100vw - 30px));max-height:min(80vh,650px);',
      'padding:20px;border:1px solid #bbcedb;border-radius:16px;box-shadow:0 22px 65px #102a4380;',
      'background:#fff;color:#203a4b;font:inherit;}',
      '.distributor-match-dialog::backdrop{background:#0b203e80;}',
      '.distributor-match-dialog h2{margin:0 0 8px;font-size:1.2rem;}',
      '.distributor-match-dialog p{margin:0 0 15px;line-height:1.4;}',
      '.distributor-match-options{display:grid;gap:8px;margin-bottom:14px;}',
      '.distributor-match-options button{width:100%;display:flex;justify-content:space-between;',
      'gap:12px;text-align:left;align-items:center;padding:11px 13px;}',
      '.distributor-match-options small{font-weight:400;white-space:nowrap;}',
      '.distributor-match-cancel{width:100%;padding:10px;}'
    ].join('');
    document.head.appendChild(style);

    const dialog = document.createElement('dialog');
    dialog.className = 'distributor-match-dialog';
    dialog.setAttribute('aria-labelledby', 'distributor-match-heading');
    const heading = document.createElement('h2');
    heading.id = 'distributor-match-heading';
    heading.textContent = 'Choose a distributor';
    const explanation = document.createElement('p');
    const options = document.createElement('div');
    options.className = 'distributor-match-options';
    const manualButton = document.createElement('button');
    manualButton.type = 'button';
    manualButton.className = 'ghost distributor-match-cancel';
    manualButton.textContent = 'Enter a distributor manually';
    dialog.append(heading, explanation, options, manualButton);
    document.body.appendChild(dialog);

    function closeDialog() {
      if (dialog.open) dialog.close();
    }

    function invalidate() {
      revision += 1;
      window.clearTimeout(debounceTimer);
      closeDialog();
    }

    function isManualValue() {
      const current = clean(distributorField.value);
      return manualOverride || (Boolean(current) && normalize(current) !== normalize(autoFilled));
    }

    function setDistributor(value) {
      internalChange = true;
      try {
        distributorField.value = value;
        // The existing app shows the APT Vote control based on the distributor.
        distributorField.dispatchEvent(new Event('change', { bubbles: true }));
      } finally {
        internalChange = false;
      }
    }

    function clearOldAutoFill() {
      if (autoFilled && !manualOverride && normalize(distributorField.value) === normalize(autoFilled)) {
        setDistributor('');
      }
      autoFilled = '';
    }

    function identity() {
      const title = clean(titleField.value);
      const rawNola = clean(nolaField.value);
      const nola = rawNola && !placeholders.has(normalize(rawNola)) ? rawNola : '';
      return { title, nola, key: normalize(title) + '|' + normalize(nola) };
    }

    async function exactMatches(field, value) {
      const matches = [];
      // Page rather than silently miss a conflicting distributor after the first few results.
      for (let offset = 0; offset < 3000; offset += 1000) {
        const { data, error } = await state.supabase
          .from('programs_enriched')
          .select('id,title,nola_eidr,distributor')
          .ilike(field, value)
          .order('id', { ascending: true })
          .range(offset, offset + 999);
        if (error) throw error;
        const rows = data || [];
        rows.forEach((row) => {
          if (normalize(row[field]) === normalize(value)) matches.push(row);
        });
        if (rows.length < 1000) return matches;
      }
      throw new Error('Too many matching programs to choose a distributor reliably.');
    }

    async function distributorMatches(lookup) {
      // An exact, meaningful NOLA match is stronger evidence than a title match.
      if (lookup.nola) {
        const nolaMatches = await exactMatches('nola_eidr', lookup.nola);
        if (nolaMatches.some((row) => clean(row.distributor))) return { rows: nolaMatches, basis: 'NOLA' };
      }
      return { rows: await exactMatches('title', lookup.title), basis: 'title' };
    }

    function choicesFor(rows) {
      const byDistributor = new Map();
      rows.forEach((row) => {
        const name = clean(row.distributor);
        if (!name) return;
        const key = normalize(name);
        const found = byDistributor.get(key);
        if (found) found.count += 1;
        else byDistributor.set(key, { name, count: 1 });
      });
      return Array.from(byDistributor.values())
        .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
    }

    function showChoices(choices, key, basis) {
      if (promptedKeys.has(key)) return;
      promptedKeys.add(key);
      options.replaceChildren();
      explanation.textContent = 'Existing programs with this ' + basis +
        ' have different distributors. Choose one, or enter your own.';
      choices.forEach((choice) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ghost';
        const name = document.createElement('strong');
        name.textContent = choice.name;
        const count = document.createElement('small');
        count.textContent = choice.count + (choice.count === 1 ? ' matching program' : ' matching programs');
        button.append(name, count);
        button.addEventListener('click', () => {
          manualOverride = true;
          autoFilled = '';
          setDistributor(choice.name);
          closeDialog();
        });
        options.appendChild(button);
      });
      dialog.showModal();
    }

    async function lookupDistributor() {
      const lookup = identity();
      if (!lookup.title || !state?.supabase || (typeof canEdit === 'function' && !canEdit()) || isManualValue()) return;
      if (lookup.key === completedKey || lookup.key === inFlightKey) return;

      const token = ++revision;
      inFlightKey = lookup.key;
      try {
        const result = await distributorMatches(lookup);
        if (token !== revision || lookup.key !== identity().key || isManualValue()) return;
        completedKey = lookup.key;
        const choices = choicesFor(result.rows);
        if (choices.length === 1) {
          autoFilled = choices[0].name;
          setDistributor(autoFilled);
        } else if (choices.length > 1) {
          clearOldAutoFill();
          showChoices(choices, lookup.key, result.basis);
        } else {
          clearOldAutoFill();
        }
      } catch (error) {
        // A failed lookup never prevents entry or changes an existing distributor.
        console.warn('Distributor suggestion unavailable; enter manually if needed.', error);
      } finally {
        if (inFlightKey === lookup.key) inFlightKey = '';
      }
    }

    function scheduleLookup(delay = 120) {
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => void lookupDistributor(), delay);
    }

    function onIdentityInput() {
      invalidate();
      // Wait until both fields have been entered; title-only matching happens on blur.
      const next = identity();
      if (next.title && next.nola) scheduleLookup(650);
    }

    titleField.addEventListener('input', onIdentityInput);
    nolaField.addEventListener('input', onIdentityInput);
    [titleField, nolaField].forEach((field) => {
      field.addEventListener('focusout', (event) => {
        // Don't interrupt someone moving from Title to NOLA.
        if (field === titleField && event.relatedTarget === nolaField) return;
        scheduleLookup(120);
      });
    });

    const onDistributorEdited = () => {
      if (internalChange) return;
      manualOverride = true;
      autoFilled = '';
      invalidate();
    };
    distributorField.addEventListener('input', onDistributorEdited);
    distributorField.addEventListener('change', onDistributorEdited);

    manualButton.addEventListener('click', () => {
      manualOverride = true;
      autoFilled = '';
      closeDialog();
      distributorField.focus();
    });
    dialog.addEventListener('cancel', () => {
      // This set of choices will not be shown repeatedly.
    });

    form.addEventListener('reset', () => {
      invalidate();
      manualOverride = false;
      autoFilled = '';
      inFlightKey = '';
      completedKey = '';
      promptedKeys.clear();
    });

    // The PBS-offer parser fills fields programmatically without input events.
    document.addEventListener('click', (event) => {
      if (!event.target.closest('#applyPbsImportBtn')) return;
      window.setTimeout(() => {
        invalidate();
        scheduleLookup(150);
      }, 0);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
