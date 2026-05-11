import { renderWorkspace, renderResults } from "../components/workspace.js";
import { optionHtml, vocabLabels, VOCAB, MONTHS } from "../components/filter-helpers.js";

export function renderHome({records, filters}){
  const filtersHtml = `
    <label>Search<input data-filter="search" value="${filters.search||''}"></label>
    <label>Month<select data-filter="month">${optionHtml(MONTHS, filters.month, 'Any month')}</select></label>
    <label>Habitat<select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>
  `;

  return renderWorkspace({
    title:'Guide species',
    filtersHtml,
    recordsHtml:renderResults(records),
    showCount:false
  });
}
