import { classifyRecord } from "../lib/merge.js";

export function renderHome(species, rareSpecies, errors) {
  const plants = species.filter(r => classifyRecord(r).isPlant).length;
  const mushrooms = species.filter(r => classifyRecord(r).isMushroom).length;
  const medicinal = species.filter(r => classifyRecord(r).medicinal).length;
  const lookalikes = species.filter(r => classifyRecord(r).lookalike).length;

  return `
    <section class="panel">
      <h2>Clean modular build</h2>
      <p>This build keeps the scripts split into separate files and loads repo data through explicit source modules instead of one giant startup blob.</p>
      <div class="grid-4">
        <div class="stat-card"><div class="num">${species.length}</div><div>Total species records</div></div>
        <div class="stat-card"><div class="num">${plants}</div><div>Plants</div></div>
        <div class="stat-card"><div class="num">${mushrooms}</div><div>Mushrooms</div></div>
        <div class="stat-card"><div class="num">${medicinal}</div><div>Medicinal entries</div></div>
      </div>
    </section>

    <section class="panel">
      <div class="grid-3">
        <div class="stat-card"><div class="num">${lookalikes}</div><div>Non-edible / caution entries</div></div>
        <div class="stat-card"><div class="num">${rareSpecies.length}</div><div>Rare species entries</div></div>
        <div class="stat-card"><div class="num">${errors.length}</div><div>Load warnings</div></div>
      </div>
    </section>

    <section class="panel">
      <h3>Quick search</h3>
      <div class="controls">
        <div class="control-row">
          <input id="homeSearch" type="search" placeholder="Search species by common, scientific, notes, or slug" style="flex:1;min-width:280px">
          <button id="homeSearchBtn" class="primary" type="button">Search</button>
        </div>
      </div>
    </section>

    ${errors.length ? `
      <section class="error-box">
        <h3>Load warnings</h3>
        <p>The app loaded, but a few optional or overlay files failed.</p>
        <ul class="list-tight">
          ${errors.map(item => `<li><span class="codeish">${item.path}</span> — ${item.error}</li>`).join("")}
        </ul>
      </section>
    ` : ""}
  `;
}
