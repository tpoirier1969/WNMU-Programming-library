const COMMONNESS_ORDER = { 'very common': 5, 'common': 4, 'occasional': 3, 'uncommon': 2, 'rare': 1 };
const FOOD_QUALITY_ORDER = { choice: 4, good: 3, fair: 2, survival: 1 };

function normText(value) {
  return String(value || '').trim().toLowerCase();
}

export function normalizeCommonness(value) {
  const text = normText(value);
  if (!text) return '';
  if (text === 'very common') return 'very common';
  if (text === 'common') return 'common';
  if (text === 'occasional') return 'occasional';
  if (text === 'uncommon') return 'uncommon';
  if (text === 'rare') return 'rare';
  return '';
}

export function normalizeFoodQuality(value) {
  const text = normText(value);
  if (text === 'choice') return 'choice';
  if (text === 'good') return 'good';
  if (text === 'fair') return 'fair';
  if (text === 'survival') return 'survival';
  return '';
}

export function commonnessScore(record) {
  const label = normalizeCommonness(record?.commonness);
  return COMMONNESS_ORDER[label] || 0;
}

export function foodQualityScore(record) {
  const label = normalizeFoodQuality(record?.food_quality);
  return FOOD_QUALITY_ORDER[label] || 0;
}

export function sortByCommonness(records, direction = 'desc') {
  return [...(records || [])].sort((a, b) => {
    const aScore = commonnessScore(a);
    const bScore = commonnessScore(b);
    const aRated = aScore > 0 ? 1 : 0;
    const bRated = bScore > 0 ? 1 : 0;

    if (aRated !== bRated) return bRated - aRated;

    if (aRated && bRated) {
      if (direction === 'asc') {
        if (aScore !== bScore) return aScore - bScore;
      } else {
        if (aScore !== bScore) return bScore - aScore;
      }
    }

    return String(a?.display_name || '').localeCompare(String(b?.display_name || ''));
  });
}

export function sortByFoodQuality(records, direction = 'desc') {
  return [...(records || [])].sort((a, b) => {
    const aScore = foodQualityScore(a);
    const bScore = foodQualityScore(b);
    const aRated = aScore > 0 ? 1 : 0;
    const bRated = bScore > 0 ? 1 : 0;

    if (aRated !== bRated) return bRated - aRated;

    if (aRated && bRated) {
      if (direction === 'asc') {
        if (aScore !== bScore) return aScore - bScore;
      } else {
        if (aScore !== bScore) return bScore - aScore;
      }
    }

    return String(a?.display_name || '').localeCompare(String(b?.display_name || ''));
  });
}

export function applyCommonnessSort(records, sortValue) {
  if (sortValue === 'common-desc') return sortByCommonness(records, 'desc');
  if (sortValue === 'common-asc') return sortByCommonness(records, 'asc');
  if (sortValue === 'food-quality-desc') return sortByFoodQuality(records, 'desc');
  if (sortValue === 'food-quality-asc') return sortByFoodQuality(records, 'asc');
  return records;
}

export function sortLabel(sortValue) {
  if (sortValue === 'common-desc') return 'Most common first';
  if (sortValue === 'common-asc') return 'Least common first';
  if (sortValue === 'food-quality-desc') return 'Choice foods first';
  if (sortValue === 'food-quality-asc') return 'Lower food quality first';
  return 'Default sort';
}
