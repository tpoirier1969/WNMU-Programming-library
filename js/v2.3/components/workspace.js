import { renderResultCard } from "../../js/renderers/cards.js?v=v2.0";

export function renderResults(records, context='general'){
  return records.length
    ? records.map(r=>renderResultCard(r,context)).join('')
    : '<div class="panel empty-state"><h3>No matches</h3></div>';
}

export function renderWorkspace({title, filtersHtml, recordsHtml, showCount=true, count=0}){
  return `
  <section class="workspace-shell">
    <article class="panel workspace-head">
      <h2>${title}</h2>
    </article>
    <section class="panel workspace-pane filter-pane-card">${filtersHtml}</section>
    <section class="panel workspace-pane results-pane-card">
      ${showCount ? `<p class="results-meta">${count} item${count===1?'':'s'}</p>`:''}
      <div class="result-list">${recordsHtml}</div>
    </section>
  </section>`;
}
