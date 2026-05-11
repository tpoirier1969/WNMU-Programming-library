import { renderWorkspace, renderResults } from "../components/workspace.js";
import { plantIdentifyFilters, mushroomIdentifyFilters } from "../components/filter-helpers.js";

export function renderIdentify({filters, records}){
  const kind = filters.kind || '';

  const filtersHtml = `
    <label>Type<select data-filter="kind">
      <option value="">Choose</option>
      <option value="plant" ${kind==='plant'?'selected':''}>Plant</option>
      <option value="mushroom" ${kind==='mushroom'?'selected':''}>Mushroom</option>
    </select></label>
    ${kind==='plant' ? plantIdentifyFilters(filters).join('') : ''}
    ${kind==='mushroom' ? mushroomIdentifyFilters(filters).join('') : ''}
  `;

  return renderWorkspace({
    title:'Identify',
    filtersHtml,
    recordsHtml: kind ? renderResults(records, kind==='mushroom'?'mushrooms':'general') : '<p>Choose a type</p>',
    count:records.length
  });
}
