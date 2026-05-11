import { MONTHS } from "../../js/constants.js?v=v2.0";
import { VOCAB } from "../../js/vocabulary.js?v=v2.0";
import { escapeHtml } from "../../js/utils.js?v=v2.0";

export function optionHtml(values, current, label) {
  return [`<option value="">${label}</option>`]
    .concat((values || []).map(v => `<option value="${escapeHtml(v)}" ${current === v ? 'selected' : ''}>${escapeHtml(v)}</option>`))
    .join('');
}

export function vocabLabels(entries) {
  return (entries || []).map(entry => entry.label);
}

export function monthOptions(current, label = 'Any month') {
  return optionHtml(MONTHS, current, label);
}

export function hostTreeLabels(treeType) {
  const all = VOCAB.mushrooms.hostTrees || [];
  if (!treeType) return all.map(entry => entry.label);
  if (treeType === 'Hardwood') return all.filter(entry => entry.broadType === 'hardwood').map(entry => entry.label);
  if (treeType === 'Conifer / softwood') return all.filter(entry => entry.broadType === 'conifer').map(entry => entry.label);
  return all.map(entry => entry.label);
}

export function plantIdentifyFilters(filters) {
  return [
    `<label><span>Month</span><select data-filter="month">${monthOptions(filters.month)}</select></label>`,
    `<label><span>Plant category</span><select data-filter="category">${optionHtml(['Fruit','Green','Flower','Root','Tree Product','Green / Tubers'], filters.category, 'Any plant type')}</select></label>`,
    `<label><span>Habitat</span><select data-filter="habitat">${optionHtml(vocabLabels(VOCAB.common.habitats), filters.habitat, 'Any habitat')}</select></label>`,
    `<label><span>Part seen</span><select data-filter="part">${optionHtml(vocabLabels(VOCAB.common.observedParts), filters.part, 'Any part')}</select></label>`,
    `<label><span>Size</span><select data-filter="size">${optionHtml(vocabLabels(VOCAB.common.sizes), filters.size, 'Any size')}</select></label>`,
    `<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`
  ];
}

export function mushroomIdentifyFilters(filters) {
  return [
    `<label><span>Month</span><select data-filter="month">${monthOptions(filters.month)}</select></label>`,
    `<label><span>Substrate</span><select data-filter="substrate">${optionHtml(vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, 'Any substrate')}</select></label>`,
    `<label><span>Tree type</span><select data-filter="treeType">${optionHtml(vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, 'Any tree type')}</select></label>`,
    `<label><span>Host tree</span><select data-filter="hostTree">${optionHtml(hostTreeLabels(filters.treeType), filters.hostTree, 'Any host tree')}</select></label>`,
    `<label><span>Underside</span><select data-filter="underside">${optionHtml(vocabLabels(VOCAB.mushrooms.undersideTypes), filters.underside, 'Any underside')}</select></label>`,
    `<label><span>Ring</span><select data-filter="ring">${optionHtml(vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, 'Any ring state')}</select></label>`,
    `<label><span>Texture</span><select data-filter="texture">${optionHtml(vocabLabels(VOCAB.mushrooms.textures), filters.texture, 'Any texture')}</select></label>`,
    `<label><span>Smell</span><select data-filter="smell">${optionHtml(vocabLabels(VOCAB.mushrooms.odors), filters.smell, 'Any smell')}</select></label>`,
    `<label><span>Staining</span><select data-filter="staining">${optionHtml(vocabLabels(VOCAB.mushrooms.stainingColors), filters.staining, 'Any staining')}</select></label>`,
    `<label><span>Taste</span><select data-filter="taste">${optionHtml(vocabLabels(VOCAB.common.tastes), filters.taste, 'Any taste')}</select></label>`
  ];
}

export { VOCAB, MONTHS };