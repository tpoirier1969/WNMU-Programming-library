import { renderResultCard as baseCard } from './cards-mainfix.js';

export function renderResultCard(record, context = 'general') {
  const common = record.commonness ? `<span class="tag commonness">${record.commonness}</span>` : '';

  const html = baseCard(record, context);

  // inject commonness tag into tag row
  return html.replace(
    '<div class="tag-row">',
    `<div class="tag-row">${common}`
  );
}
