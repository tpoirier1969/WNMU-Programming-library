import { escapeHtml } from "../utils.js";

export function renderMushroomID(record) {
  return `<section class="detail-card section-block">
    <h3>Mushroom ID clues</h3>
    <div class="tag-row">
      ${(record.substrate||[]).concat(record.treeType||[], record.hostTree||[], record.ring||[], record.underside||[], record.texture||[], record.smell||[], record.staining||[])
        .filter(Boolean)
        .map(v=>`<span class="tag">${escapeHtml(v)}</span>`).join('')}
    </div>
  </section>`;
}

export function renderMushroomSafety(record) {
  if (!record.non_edible_severity && !record.effects_on_body) return '';
  const severity = record.non_edible_severity;
  if (severity && /choice|edible/i.test(severity)) return '';

  return `<section class="detail-card section-block">
    <h3>Risk / body effects</h3>
    ${severity ? `<p><strong>Severity:</strong> ${escapeHtml(severity)}</p>` : ''}
    ${record.affected_systems?.length ? `<p><strong>Affected systems:</strong> ${escapeHtml(record.affected_systems.join(', '))}</p>` : ''}
    ${record.effects_on_body ? `<p><strong>Effects:</strong> ${escapeHtml(record.effects_on_body)}</p>` : ''}
  </section>`;
}
