const COMMONNESS_ORDER = { 'very common': 5, 'common': 4, 'occasional': 3, 'uncommon': 2, 'rare': 1 };

function normText(value) {
  return String(value || '').trim().toLowerCase();
}

export function commonnessScore(record) {
  return COMMONNESS_ORDER[normText(record?.commonness)] || 0;
}

export function sortByCommonness(records, direction = 'desc') {
  return [...(records || [])].sort((a, b) => {
    const aScore = commonnessScore(a);
    const bScore = commonnessScore(b);
    const aKnown = aScore > 0 ? 1 : 0;
    const bKnown = bScore > 0 ? 1 : 0;

    if (aKnown !== bKnown) return bKnown - aKnown;

    if (direction === 'asc') {
      if (aScore !== bScore) return aScore - bScore;
    } else {
      if (aScore !== bScore) return bScore - aScore;
    }

    return String(a?.display_name || '').localeCompare(String(b?.display_name || ''));
  });
}

export function applyCommonnessSort(records, sortValue) {
  if (sortValue === 'common-desc') return sortByCommonness(records, 'desc');
  if (sortValue === 'common-asc') return sortByCommonness(records, 'asc');
  return records;
}

export function sortLabel(sortValue) {
  if (sortValue === 'common-desc') return 'Most common first';
  if (sortValue === 'common-asc') return 'Least common first';
  return 'Default sort';
}
