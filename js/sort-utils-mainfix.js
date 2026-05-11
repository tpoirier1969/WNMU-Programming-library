const COMMONNESS_ORDER = {
  "very common": 5, "abundant": 5, "plentiful": 5, "widespread": 5, "extremely common": 5,
  "common": 4, "fairly common": 4, "locally common": 4, "frequent": 4, "regular": 4,
  "occasional": 3, "scattered": 3, "moderately common": 3, "patchy": 3,
  "uncommon": 2, "infrequent": 2, "scarce": 2, "local": 2, "locally scarce": 2,
  "rare": 1, "very rare": 1, "sparse": 1, "isolated": 1
};
const FOOD_QUALITY_ORDER = { "choice": 5, "excellent": 5, "very good": 4, "good": 3, "fair": 2, "poor": 1, "not worth foraging": 0 };
function normSortText(value){ return String(value || '').trim().toLowerCase().replace(/\s+/g,' '); }
export function rankCommonness(record){
  const candidates = [
    record.commonness_score, record.commonnessScore, record.commonality_score, record.commonalityScore,
    record.commonness_rank, record.commonality_rank
  ].map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0);
  if (candidates.length) return candidates[0];
  const text = normSortText(
    record.commonness || record.commonness_label || record.commonnessLabel ||
    record.commonality || record.commonality_label || record.commonalityLabel || ''
  );
  if (!text) return 0;
  if (COMMONNESS_ORDER[text]) return COMMONNESS_ORDER[text];
  if (/(very common|abundant|widespread|plentiful|extremely common)/.test(text)) return 5;
  if (/(^|\b)(common|frequent|regular|fairly common|locally common)(\b|$)/.test(text)) return 4;
  if (/(occasional|scattered|moderate|patchy)/.test(text)) return 3;
  if (/(uncommon|scarce|infrequent|local)/.test(text)) return 2;
  if (/(rare|sparse|isolated)/.test(text)) return 1;
  return 0;
}
export function rankFoodQuality(record){
  const numeric = Number(record.food_quality_score ?? record.foodQualityScore ?? 0);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const text = normSortText(record.food_quality || record.foodQuality || record.mushroom_profile?.edibility_status || '');
  return FOOD_QUALITY_ORDER[text] || 0;
}
function sortWithRating(records, scoreFn, direction = 'desc'){
  return [...records].sort((a,b)=>{
    const aScore = scoreFn(a), bScore = scoreFn(b);
    const aRated = aScore > 0 ? 1 : 0, bRated = bScore > 0 ? 1 : 0;
    if (aRated !== bRated) return bRated - aRated;
    if (aRated && bRated && aScore !== bScore) return direction === 'asc' ? aScore - bScore : bScore - aScore;
    return String(a.display_name || a.common_name || '').localeCompare(String(b.display_name || b.common_name || ''));
  });
}
export function applyCustomSort(records, sortValue){
  const list = [...records];
  if (!sortValue) return list;
  if (sortValue === 'common-desc') return sortWithRating(list, rankCommonness, 'desc');
  if (sortValue === 'common-asc') return sortWithRating(list, rankCommonness, 'asc');
  if (sortValue === 'food-quality-desc') return sortWithRating(list, rankFoodQuality, 'desc');
  if (sortValue === 'food-quality-asc') return sortWithRating(list, rankFoodQuality, 'asc');
  return list;
}
