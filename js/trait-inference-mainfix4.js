import { VOCAB } from "./vocabulary.js?v=v2.0";

const PLANT_ID = {
  flowerColors: ["White","Purple","Pink","Yellow","Blue","Red","Green"],
  leafShapes: ["Round","Oval","Heart-shaped","Lance-shaped","Pointed","Lobed","Compound","Needle-like"],
  leafArrangements: ["Alternate","Opposite","Basal rosette","Whorled","Needle clusters"],
  stemSurfaces: ["Smooth","Hairy","Rough","Fuzzy","Prickly"],
  leafPointCounts: ["1-point","3-point","5-point","Many-lobed"]
};

const EXPLICIT_FLOWER_COLOR_MAP = {
  'dandelion-flowers':['Yellow'],'violet-flowers':['Purple','Blue'],'clover-flowers':['Pink','White'],'honeysuckle-flowers':['White','Yellow','Pink'],'elderflowers':['White'],'chicory-flowers':['Blue'],'basswood-linden-flowers':['Yellow','White'],'daylily-flowers':['Yellow'],'bee-balm-wild-bergamot':['Pink','Purple'],'goldenrod-flowers':['Yellow'],'cattail-pollen':['Yellow'],'wild-hop-cones':['Green'],'wood-sorrel-yellow-woodsorrel':['Yellow'],'yellow-pond-lily-bulbs':['Yellow'],'jerusalem-artichoke':['Yellow'],'wild-carrot':['White'],'garlic-mustard':['White'],'wild-mustard-greens':['Yellow'],'chickweed':['White'],'wood-sorrel':['Yellow'],'red-sorrel':['Red'],'miner-s-lettuce-winter-purslane':['White'],'wild-ginger':['Red','Brown'],'sweet-cicely':['White'],'fiddlehead-ferns':[],'plantain-broadleaf':['Green'],'ramps-wild-onion':['White'],'wild-leek-ramp':['White'],'juneberries-serviceberries':['White'],'wild-strawberries':['White'],'thimbleberries':['White'],'chokeberry-aronia':['White'],'ground-cherries':['Yellow'],'elderberries':['White'],'chokecherries':['White'],'lowbush-cranberries':['Pink'],'burdock-root':['Purple'],'groundnut-tubers':['Pink'],'cleavers':['White']
};
const EXPLICIT_LEAF_ARRANGEMENT_MAP = {
  'dandelion-greens':['Basal rosette'],'dandelion-flowers':['Basal rosette'],'plantain-broadleaf':['Basal rosette'],'violet-leaves':['Basal rosette'],'violet-flowers':['Basal rosette'],'fiddlehead-ferns':['Basal rosette'],'wood-sorrel':['Basal rosette'],'wood-sorrel-yellow-woodsorrel':['Alternate'],'chickweed':['Opposite'],'garlic-mustard':['Basal rosette','Alternate'],'wild-mustard-greens':['Alternate'],'sweet-cicely':['Alternate'],'wild-carrot':['Alternate'],'nettles':['Opposite'],'bee-balm-wild-bergamot':['Opposite'],'honeysuckle-flowers':['Opposite'],'clover-flowers':['Alternate'],'daylily-flowers':['Basal rosette'],'goldenrod-flowers':['Alternate'],'elderflowers':['Opposite'],'chicory-flowers':['Basal rosette'],'basswood-linden-flowers':['Alternate'],'jerusalem-artichoke':['Alternate'],'wild-ginger':['Basal rosette'],'ramps-wild-onion':['Basal rosette'],'wild-leek-ramp':['Basal rosette'],'pine-needles-tea':['Needle clusters'],'pine-resin-gum':['Needle clusters'],'spruce-tips':['Needle clusters'],'hemlock-tips':['Needle clusters'],'hazelnuts':['Alternate'],'beech-nuts':['Alternate'],'birch-sap':['Alternate'],'maple-sap':['Opposite'],'sassafras-root-bark':['Alternate'],'riverbank-grapes':['Alternate'],'fox-grapes':['Alternate'],'gooseberries':['Alternate'],'red-currants':['Alternate'],'black-currants':['Alternate'],'huckleberries':['Alternate'],'blueberries':['Alternate'],'wintergreen-berries':['Alternate'],'bearberries':['Alternate'],'mulberries':['Alternate'],'chokeberries':['Alternate'],'staghorn-sumac-berries':['Alternate'],'hawthorn-berries':['Alternate'],'highbush-cranberries-viburnum':['Opposite'],'american-persimmon':['Alternate'],'pawpaw':['Alternate'],'crabapples':['Alternate'],'juneberries-serviceberries':['Alternate'],'wild-strawberries':['Basal rosette'],'thimbleberries':['Alternate'],'chokeberry-aronia':['Alternate'],'raspberries':['Alternate'],'black-raspberries':['Alternate'],'wild-blackberries':['Alternate'],'chokecherries':['Alternate'],'elderberries':['Opposite'],'ground-cherries':['Alternate'],'lowbush-cranberries':['Alternate'],'burdock-root':['Basal rosette'],'groundnut-tubers':['Alternate'],'lamb-s-quarters':['Alternate'],'goosefoot-close-cousin-of-lamb-s-quarters':['Alternate'],'purslane':['Alternate'],'cleavers':['Whorled']
};
const EXPLICIT_LEAF_SHAPE_MAP = {
  'dandelion-greens':['Lobed'],'dandelion-flowers':['Lobed'],'plantain-broadleaf':['Oval'],'violet-leaves':['Heart-shaped'],'violet-flowers':['Heart-shaped'],'wood-sorrel':['Heart-shaped'],'wood-sorrel-yellow-woodsorrel':['Heart-shaped'],'chickweed':['Oval'],'garlic-mustard':['Heart-shaped'],'wild-mustard-greens':['Lobed'],'sweet-cicely':['Compound'],'wild-carrot':['Compound'],'nettles':['Pointed'],'bee-balm-wild-bergamot':['Lance-shaped'],'honeysuckle-flowers':['Oval'],'clover-flowers':['Compound'],'daylily-flowers':['Lance-shaped'],'goldenrod-flowers':['Lance-shaped'],'elderflowers':['Compound'],'chicory-flowers':['Lance-shaped'],'basswood-linden-flowers':['Heart-shaped'],'jerusalem-artichoke':['Pointed'],'wild-ginger':['Heart-shaped'],'ramps-wild-onion':['Lance-shaped'],'wild-leek-ramp':['Lance-shaped'],'pine-needles-tea':['Needle-like'],'pine-resin-gum':['Needle-like'],'spruce-tips':['Needle-like'],'hemlock-tips':['Needle-like'],'hazelnuts':['Oval'],'beech-nuts':['Oval'],'birch-sap':['Pointed'],'maple-sap':['Lobed'],'sassafras-root-bark':['Lobed'],'riverbank-grapes':['Lobed'],'fox-grapes':['Lobed'],'gooseberries':['Lobed'],'red-currants':['Lobed'],'black-currants':['Lobed'],'huckleberries':['Oval'],'blueberries':['Oval'],'wintergreen-berries':['Oval'],'bearberries':['Oval'],'mulberries':['Pointed'],'chokeberries':['Oval'],'staghorn-sumac-berries':['Compound'],'hawthorn-berries':['Lobed'],'highbush-cranberries-viburnum':['Lobed'],'american-persimmon':['Oval'],'pawpaw':['Oval'],'crabapples':['Oval'],'juneberries-serviceberries':['Oval'],'wild-strawberries':['Compound'],'thimbleberries':['Lobed'],'chokeberry-aronia':['Oval'],'raspberries':['Compound'],'black-raspberries':['Compound'],'wild-blackberries':['Compound'],'chokecherries':['Oval'],'elderberries':['Compound'],'ground-cherries':['Oval'],'lowbush-cranberries':['Oval'],'burdock-root':['Heart-shaped','Lobed'],'groundnut-tubers':['Compound'],'lamb-s-quarters':['Lobed'],'goosefoot-close-cousin-of-lamb-s-quarters':['Lobed'],'purslane':['Oval'],'cleavers':['Lance-shaped','Pointed']
};
const EXPLICIT_OBSERVED_PART_MAP = {
  'dandelion-greens':['Leaf'],'dandelion-flowers':['Flower'],'violet-leaves':['Leaf'],'violet-flowers':['Flower'],'clover-flowers':['Flower'],'honeysuckle-flowers':['Flower'],'elderflowers':['Flower'],'chicory-flowers':['Flower'],'basswood-linden-flowers':['Flower'],'daylily-flowers':['Flower'],'bee-balm-wild-bergamot':['Flower'],'goldenrod-flowers':['Flower'],'cattail-pollen':['Pollen'],'wild-hop-cones':['Flower'],'garlic-mustard':['Leaf'],'wild-mustard-greens':['Leaf'],'chickweed':['Leaf'],'wood-sorrel':['Leaf'],'wood-sorrel-yellow-woodsorrel':['Leaf'],'sweet-cicely':['Leaf'],'wild-carrot':['Leaf'],'nettles':['Leaf'],'plantain-broadleaf':['Leaf'],'jerusalem-artichoke':['Leaf'],'wild-ginger':['Leaf'],'ramps-wild-onion':['Leaf'],'wild-leek-ramp':['Leaf'],'hazelnuts':['Seed / cone / nut'],'beech-nuts':['Seed / cone / nut'],'riverbank-grapes':['Fruit / berry'],'fox-grapes':['Fruit / berry'],'gooseberries':['Fruit / berry'],'red-currants':['Fruit / berry'],'black-currants':['Fruit / berry'],'huckleberries':['Fruit / berry'],'blueberries':['Fruit / berry'],'wintergreen-berries':['Fruit / berry'],'bearberries':['Fruit / berry'],'mulberries':['Fruit / berry'],'chokeberries':['Fruit / berry'],'staghorn-sumac-berries':['Fruit / berry'],'hawthorn-berries':['Fruit / berry'],'highbush-cranberries-viburnum':['Fruit / berry'],'american-persimmon':['Fruit / berry'],'pawpaw':['Fruit / berry'],'crabapples':['Fruit / berry'],'pine-needles-tea':['Leaf'],'pine-resin-gum':['Sap / resin'],'spruce-tips':['Leaf'],'hemlock-tips':['Leaf'],'sassafras-root-bark':['Root / rhizome / tuber'],'birch-sap':['Sap / resin'],'maple-sap':['Sap / resin'],'juneberries-serviceberries':['Fruit / berry'],'wild-strawberries':['Fruit / berry'],'thimbleberries':['Fruit / berry'],'chokeberry-aronia':['Fruit / berry'],'raspberries':['Fruit / berry'],'black-raspberries':['Fruit / berry'],'wild-blackberries':['Fruit / berry'],'chokecherries':['Fruit / berry'],'elderberries':['Fruit / berry'],'ground-cherries':['Fruit / berry'],'lowbush-cranberries':['Fruit / berry'],'burdock-root':['Root / rhizome / tuber'],'groundnut-tubers':['Root / rhizome / tuber'],'lamb-s-quarters':['Leaf'],'goosefoot-close-cousin-of-lamb-s-quarters':['Leaf'],'purslane':['Leaf'],'cattail-rhizomes':['Root / rhizome / tuber'],'acorns-leached':['Seed / cone / nut'],'cleavers':['Leaf','Stem / stalk']
};
const EXPLICIT_STEM_SURFACE_MAP = {
  'raspberries':['Prickly'],'black-raspberries':['Prickly'],'wild-blackberries':['Prickly'],'burdock-root':['Rough'],'gooseberries':['Prickly'],'hawthorn-berries':['Prickly'],'nettles':['Hairy'],'cleavers':['Rough']
};
const EXPLICIT_MUSHROOM_SUBSTRATE_MAP = {
  'pearl-oyster':['Hardwood wood / log / stump','Living hardwood tree'],'phoenix-oyster':['Hardwood wood / log / stump','Living hardwood tree'],'aspen-oyster':['Hardwood wood / log / stump'],'dryad-saddle-pheasant-back':['Hardwood wood / log / stump','Living hardwood tree'],'lobster-mushroom':['Soil','Leaf litter','Moss'],'birch-polypore':['Hardwood wood / log / stump','Living hardwood tree'],'chaga':['Living hardwood tree'],'artists-conk':['Hardwood wood / log / stump','Living hardwood tree'],'red-belted-conk':['Softwood / conifer wood','Hardwood wood / log / stump'],'honey-mushrooms':['Hardwood wood / log / stump','Softwood / conifer wood','Living hardwood tree'],'hemlock-varnish-shelf-reishi':['Softwood / conifer wood'],'jack-o-lantern':['Hardwood wood / log / stump'],'destroying-angel':['Soil','Leaf litter','Moss'],'yellow-fly-agaric-guessowii':['Soil','Moss'],'old-man-of-the-woods':['Soil','Moss']
};
const EXPLICIT_MUSHROOM_WOODTYPE_MAP = {
  'pearl-oyster':['Hardwood'],'phoenix-oyster':['Hardwood'],'aspen-oyster':['Hardwood'],'dryad-saddle-pheasant-back':['Hardwood'],'lobster-mushroom':['Hardwood','Conifer / softwood','Mixed / unknown wood'],'birch-polypore':['Hardwood'],'chaga':['Hardwood'],'artists-conk':['Hardwood'],'red-belted-conk':['Conifer / softwood','Mixed / unknown wood'],'honey-mushrooms':['Hardwood','Mixed / unknown wood'],'hemlock-varnish-shelf-reishi':['Conifer / softwood'],'jack-o-lantern':['Hardwood'],'destroying-angel':['Hardwood','Conifer / softwood','Mixed / unknown wood'],'yellow-fly-agaric-guessowii':['Hardwood','Conifer / softwood','Mixed / unknown wood'],'old-man-of-the-woods':['Hardwood','Conifer / softwood','Mixed / unknown wood']
};
const EXPLICIT_MUSHROOM_HOST_MAP = {
  'pearl-oyster':['Aspen','Maple','Beech','Willow'],'phoenix-oyster':['Elm','Beech','Maple'],'aspen-oyster':['Aspen','Cottonwood'],'dryad-saddle-pheasant-back':['Maple','Elm','Ash','Beech'],'lobster-mushroom':['Birch','Aspen','Maple','Oak','Pine','Spruce'],'birch-polypore':['Birch'],'chaga':['Birch'],'artists-conk':['Maple','Beech','Birch','Aspen'],'red-belted-conk':['Pine','Spruce','Hemlock','Birch'],'honey-mushrooms':['Maple','Oak','Birch','Aspen','Beech','Pine','Spruce'],'hemlock-varnish-shelf-reishi':['Hemlock'],'jack-o-lantern':['Oak','Maple','Beech'],'destroying-angel':['Birch','Aspen','Maple','Oak','Pine','Spruce'],'yellow-fly-agaric-guessowii':['Birch','Aspen','Pine','Spruce'],'old-man-of-the-woods':['Oak','Maple','Beech','Pine','Spruce']
};
const EXPLICIT_MUSHROOM_TEXTURE_MAP = {
  'pearl-oyster':['Smooth','Fleshy / firm'],'phoenix-oyster':['Smooth','Fleshy / firm'],'aspen-oyster':['Smooth','Fleshy / firm'],'dryad-saddle-pheasant-back':['Scaly','Fleshy / firm'],'lobster-mushroom':['Fleshy / firm'],'birch-polypore':['Leathery'],'chaga':['Leathery'],'artists-conk':['Leathery'],'red-belted-conk':['Leathery'],'honey-mushrooms':['Fleshy / firm'],'hemlock-varnish-shelf-reishi':['Leathery'],'jack-o-lantern':['Fleshy / firm'],'destroying-angel':['Smooth','Fleshy / firm'],'yellow-fly-agaric-guessowii':['Smooth','Fleshy / firm'],'old-man-of-the-woods':['Shaggy','Fleshy / firm']
};
const EXPLICIT_MUSHROOM_ODOR_MAP = {
  'pearl-oyster':['Mild / none'],'phoenix-oyster':['Mild / none'],'aspen-oyster':['Mild / none'],'dryad-saddle-pheasant-back':['Sweet'],'lobster-mushroom':['Earthy'],'birch-polypore':['Mild / none'],'chaga':['Mild / none'],'artists-conk':['Mild / none'],'red-belted-conk':['Mild / none'],'honey-mushrooms':['Mild / none'],'hemlock-varnish-shelf-reishi':['Earthy'],'jack-o-lantern':['Mild / none'],'destroying-angel':['Mild / none'],'yellow-fly-agaric-guessowii':['Mild / none'],'old-man-of-the-woods':['Earthy']
};
const EXPLICIT_MUSHROOM_STAINING_MAP = {
  'pearl-oyster':['No staining'],'phoenix-oyster':['No staining'],'aspen-oyster':['No staining'],'dryad-saddle-pheasant-back':['No staining'],'lobster-mushroom':['No staining'],'birch-polypore':['Brown staining'],'chaga':['Brown staining'],'artists-conk':['Brown staining'],'red-belted-conk':['Brown staining'],'honey-mushrooms':['No staining'],'hemlock-varnish-shelf-reishi':['Brown staining'],'jack-o-lantern':['No staining'],'destroying-angel':['No staining'],'yellow-fly-agaric-guessowii':['No staining'],'old-man-of-the-woods':['Black staining']
};

function inferMulti(text, entries) {
  const out = [];
  const lower = text.toLowerCase();
  for (const entry of entries) {
    const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
    if (terms.some(term => lower.includes(term))) out.push(entry.label);
  }
  return [...new Set(out)];
}
function canonicalizeList(values, entries, { keepUnknown = false } = {}) {
  const out = [];
  for (const raw of values || []) {
    const lower = String(raw || '').trim().toLowerCase();
    if (!lower) continue;
    let matched = false;
    for (const entry of entries) {
      const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
      if (terms.some(term => lower === term || lower.includes(term) || term.includes(lower))) { out.push(entry.label); matched = true; }
    }
    if (!matched && keepUnknown) out.push(String(raw).trim());
  }
  return [...new Set(out)];
}
function inferHostTrees(text) {
  const lower = text.toLowerCase();
  const matches = VOCAB.mushrooms.hostTrees.filter(entry => {
    const terms = [entry.label, ...(entry.synonyms || [])].filter(Boolean).map(term => term.toLowerCase());
    return terms.some(term => lower.includes(term));
  });
  return { labels: [...new Set(matches.map(entry => entry.label))], broadTypes: [...new Set(matches.map(entry => entry.broadType === 'hardwood' ? 'Hardwood' : entry.broadType === 'conifer' ? 'Conifer / softwood' : 'Mixed / unknown wood').filter(Boolean))] };
}
function inferMedicinalTerms(text) { return inferMulti(text, VOCAB.medicinal.symptoms); }
function mergeUnique(...lists) { return [...new Set(lists.flat().filter(Boolean))]; }
function explicitList(record, path, fallback = []) { const val = path.split('.').reduce((acc, key) => acc?.[key], record); if (Array.isArray(val)) return val.filter(Boolean); if (typeof val === 'string' && val.trim()) return [val.trim()]; return fallback; }
function inferSimpleLabels(text, labels) { const lower = text.toLowerCase(); return labels.filter(label => lower.includes(label.toLowerCase()) || lower.includes(label.toLowerCase().replace(/-/g,' '))); }
function inferLeafPointCounts(text) {
  const lower = text.toLowerCase(); const out = [];
  if (/(five-point|5 point|five lobed|five-lobed|five pointed)/.test(lower)) out.push('5-point');
  if (/(three-point|3 point|three lobed|three-lobed|three pointed)/.test(lower)) out.push('3-point');
  if (/(single point|one point|1 point|pointed leaf)/.test(lower)) out.push('1-point');
  if (/(many lobed|deeply lobed|several lobes)/.test(lower)) out.push('Many-lobed');
  return out;
}
function inferFlowerColors(record, text) {
  const lower = text.toLowerCase(); const out = []; out.push(...(EXPLICIT_FLOWER_COLOR_MAP[record.slug] || []));
  const cues = [['Yellow', /(yellow|golden|gold|daylily|dandelion|mustard|woodsorrel|goldenrod|linden)/],['Pink', /(pink|rose|clover|bee balm|bergamot|honeysuckle|groundnut|cranberr)/],['Blue', /(blue|azure|chicory|violet)/],['Purple', /(purple|violet|bergamot|bee balm|lavender|burdock)/],['White', /(white|elderflower|elderflowers|chickweed|wild carrot|queen anne|garlic mustard|basswood|juneberry|serviceberry|strawberry|aronia|elderberry|chokecherry|cleavers)/],['Red', /(red|scarlet|crimson|ginger flower|red sorrel)/],['Green', /(green flower|greenish|hop cones|catkin)/]];
  for (const [label, pattern] of cues) if (pattern.test(lower)) out.push(label);
  return [...new Set(out.filter(Boolean))];
}
function inferLeafArrangement(record, text) {
  const out = [...(EXPLICIT_LEAF_ARRANGEMENT_MAP[record.slug] || [])]; const lower = text.toLowerCase();
  if (/(opposite leaves|opposite leaf)/.test(lower)) out.push('Opposite');
  if (/(alternate leaves|alternate leaf)/.test(lower)) out.push('Alternate');
  if (/(basal rosette|rosette)/.test(lower)) out.push('Basal rosette');
  if (/(whorled leaves|whorl)/.test(lower)) out.push('Whorled');
  if (/(needle clusters|fascicles|needles in bundles)/.test(lower)) out.push('Needle clusters');
  return [...new Set(out.filter(Boolean))];
}
function inferLeafShapes(record, text) { return mergeUnique(EXPLICIT_LEAF_SHAPE_MAP[record.slug] || [], inferSimpleLabels(text, PLANT_ID.leafShapes)); }
function inferObservedParts(record, text, explicitObservedPart) { return mergeUnique(explicitObservedPart, EXPLICIT_OBSERVED_PART_MAP[record.slug] || [], inferMulti(text, VOCAB.common.observedParts)); }
function inferStemSurface(record, text) { return mergeUnique(EXPLICIT_STEM_SURFACE_MAP[record.slug] || [], inferSimpleLabels(text, PLANT_ID.stemSurfaces)); }

export function inferTraits(record) {
  const text = [record.slug,record.display_name,record.common_name,record.category,record.culinary_uses,record.medicinal_uses,record.notes,record.scientific_name,...(record.images || []),record.mushroom_profile?.summary,...(record.mushroom_profile?.research_notes || [])].join(' ').toLowerCase();
  const hostInfo = inferHostTrees(text);
  const explicitHabitat = canonicalizeList(explicitList(record,'habitat'), VOCAB.common.habitats, {keepUnknown:true});
  const explicitObservedPart = canonicalizeList(explicitList(record,'observedPart'), VOCAB.common.observedParts, {keepUnknown:true});
  const explicitSize = canonicalizeList(explicitList(record,'size'), VOCAB.common.sizes, {keepUnknown:true});
  const explicitTasteCommon = canonicalizeList(explicitList(record,'taste'), VOCAB.common.tastes, {keepUnknown:true});
  const explicitMedicinalAction = canonicalizeList(explicitList(record,'medicinalAction'), VOCAB.medicinal.actions, {keepUnknown:true});
  const explicitMedicinalSystem = canonicalizeList(explicitList(record,'medicinalSystem'), VOCAB.medicinal.bodySystems, {keepUnknown:true});
  const explicitMedicinalTerms = canonicalizeList(explicitList(record,'medicinalTerms'), VOCAB.medicinal.symptoms, {keepUnknown:true});
  const explicitHostTree = canonicalizeList(explicitList(record,'mushroom_profile.host_trees').filter(label => !['Hardwood (general)','Conifer (general)','Hardwood litter','Conifer litter'].includes(label)), VOCAB.mushrooms.hostTrees);
  const explicitWoodTypes = canonicalizeList(explicitList(record,'mushroom_profile.wood_type'), VOCAB.mushrooms.woodTypes);
  const explicitSubstrate = canonicalizeList(explicitList(record,'mushroom_profile.substrate'), VOCAB.mushrooms.substrates);
  const explicitRing = canonicalizeList(explicitList(record,'mushroom_profile.ring'), VOCAB.mushrooms.ringStates);
  const explicitUnderside = canonicalizeList(explicitList(record,'mushroom_profile.underside'), VOCAB.mushrooms.undersideTypes);
  const explicitTexture = canonicalizeList(explicitList(record,'mushroom_profile.texture'), VOCAB.mushrooms.textures);
  const explicitSmell = canonicalizeList(explicitList(record,'mushroom_profile.odor'), VOCAB.mushrooms.odors);
  const explicitStaining = canonicalizeList(explicitList(record,'mushroom_profile.staining'), VOCAB.mushrooms.stainingColors);
  const explicitTasteMushroom = canonicalizeList(explicitList(record,'mushroom_profile.taste'), VOCAB.common.tastes);

  const traits = {
    habitat: mergeUnique(explicitHabitat, inferMulti(text, VOCAB.common.habitats)),
    observedPart: inferObservedParts(record, text, explicitObservedPart),
    size: mergeUnique(explicitSize, inferMulti(text, VOCAB.common.sizes)),
    taste: mergeUnique(explicitTasteCommon, explicitTasteMushroom, inferMulti(text, VOCAB.common.tastes)),
    substrate: [], treeType: [], hostTree: [], ring: [], underside: [], texture: [], smell: [], staining: [],
    medicinalAction: mergeUnique(explicitMedicinalAction, inferMulti(text, VOCAB.medicinal.actions)),
    medicinalSystem: mergeUnique(explicitMedicinalSystem, inferMulti(text, VOCAB.medicinal.bodySystems)),
    medicinalTerms: mergeUnique(explicitMedicinalTerms, inferMedicinalTerms(text)),
    flowerColor: inferFlowerColors(record, text),
    leafShape: inferLeafShapes(record, text),
    leafArrangement: inferLeafArrangement(record, text),
    stemSurface: inferStemSurface(record, text),
    leafPointCount: inferLeafPointCounts(text)
  };
  if (record.category === 'Mushroom') {
    traits.substrate = mergeUnique(EXPLICIT_MUSHROOM_SUBSTRATE_MAP[record.slug] || [], explicitSubstrate, inferMulti(text, VOCAB.mushrooms.substrates));
    traits.treeType = mergeUnique(EXPLICIT_MUSHROOM_WOODTYPE_MAP[record.slug] || [], explicitWoodTypes, inferMulti(text, VOCAB.mushrooms.woodTypes), hostInfo.broadTypes);
    traits.hostTree = mergeUnique(EXPLICIT_MUSHROOM_HOST_MAP[record.slug] || [], explicitHostTree, hostInfo.labels);
    traits.ring = mergeUnique(explicitRing, inferMulti(text, VOCAB.mushrooms.ringStates));
    traits.underside = mergeUnique(explicitUnderside, inferMulti(text, VOCAB.mushrooms.undersideTypes));
    traits.texture = mergeUnique(EXPLICIT_MUSHROOM_TEXTURE_MAP[record.slug] || [], explicitTexture, inferMulti(text, VOCAB.mushrooms.textures));
    traits.smell = mergeUnique(EXPLICIT_MUSHROOM_ODOR_MAP[record.slug] || [], explicitSmell, inferMulti(text, VOCAB.mushrooms.odors));
    traits.staining = mergeUnique(EXPLICIT_MUSHROOM_STAINING_MAP[record.slug] || [], explicitStaining, inferMulti(text, VOCAB.mushrooms.stainingColors));
  }
  const reviewReasons = [];
  if (!record.images?.length) reviewReasons.push('missing image');
  if (!traits.habitat.length && record.category !== 'Mushroom') reviewReasons.push('habitat needs detail');
  if (record.category !== 'Mushroom' && !traits.observedPart.length) reviewReasons.push('plant trait detail needs review');
  if (record.category === 'Mushroom' && !traits.substrate.length) reviewReasons.push('substrate needs detail');
  return {...traits, reviewReasons:[...new Set(reviewReasons)], weekPrecision: record.weekPrecision || 'month-window-reviewed'};
}
