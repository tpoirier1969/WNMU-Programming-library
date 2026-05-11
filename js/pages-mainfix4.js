import { MONTHS } from "./constants-mainfix.js?v=2026-04-17-38";
import { medicinalRecords, isPlant, reviewRecords, avoidRecords, isForagingMushroom } from "./data-model-mainfix4.js?v=2026-04-17-37";
import { VOCAB } from "./vocabulary.js?v=v2.0";
import { renderResultCard } from "./renderers/cards-mainfix.js?v=2026-04-17-38";
import { renderInteractiveTimeline } from "./renderers/timeline.js?v=v3.2.0";
import { escapeHtml } from "./utils.js?v=v3.2.0";
import { state } from "./state.js";
import { renderRarePageHtml } from "./rare-watch.js";

const FLOWER_COLORS = ["White", "Purple", "Pink", "Yellow", "Blue", "Red", "Green"];
const LEAF_SHAPES = ["Round", "Oval", "Heart-shaped", "Lance-shaped", "Pointed", "Lobed", "Compound", "Needle-like"];
const LEAF_ARRANGEMENTS = ["Alternate", "Opposite", "Basal rosette", "Whorled", "Needle clusters"];
const STEM_SURFACES = ["Smooth", "Hairy", "Rough", "Fuzzy", "Prickly"];
const LEAF_POINT_COUNTS = ["1-point", "3-point", "5-point", "Many-lobed"];
const BOLETE_PORE_COLORS = ["White / cream","Yellow","Olive","Pinkish","Red / orange","Gray / black"];
const BOLETE_STEM_FEATURES = ["Smooth","Reticulate / netted","Scabers / rough dots","Glandular dots","Shaggy / scaly"];
const BOLETE_GROUP_LABELS = {
  "Brown / king allies": "Brown / king allies",
  "Red & staining boletes": "Red & staining boletes",
  "Suillus / slippery jacks": "Suillus / slippery jacks",
  "Leccinum / scaber stalks": "Leccinum / scaber stalks",
  "Tylopilus / bitter boletes": "Tylopilus / bitter boletes",
  "Oddballs / shaggy boletes": "Oddballs / shaggy boletes"
};
const SORT_OPTIONS = [
  { value: "", label: "Default sort" },
  { value: "food-quality-desc", label: "Choice foods first" },
  { value: "food-quality-asc", label: "Lower food quality first" },
  { value: "common-desc", label: "Most common first" },
  { value: "common-asc", label: "Least common first" }
];
const MEDICINAL_SORT_OPTIONS = [
  { value: "", label: "Default sort" },
  { value: "common-desc", label: "Most common first" },
  { value: "common-asc", label: "Least common first" }
];

function optionHtml(values, current, label) { return [`<option value="">${label}</option>`].concat(values.map((v) => `<option value="${escapeHtml(v)}" ${current === v ? "selected" : ""}>${escapeHtml(v)}</option>`)).join(""); }
function vocabLabels(entries) { return (entries || []).map((entry) => entry.label); }
function hostTreeLabels(treeType) {
  const all = VOCAB.mushrooms.hostTrees || [];
  if (!treeType) return all.map((entry) => entry.label);
  if (treeType === "Hardwood") return all.filter((entry) => entry.broadType === "hardwood").map((entry) => entry.label);
  if (treeType === "Conifer / softwood") return all.filter((entry) => entry.broadType === "conifer").map((entry) => entry.label);
  return all.map((entry) => entry.label);
}
function formatLabelFromSlug(slug) { return String(slug || "").replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()); }
function renderResultList(records, context = "general") { return records.length ? records.map((record) => renderResultCard(record, context)).join("") : '<div class="panel empty-state"><h3>No matches</h3></div>'; }
function currentMonthName() { const d = new Date(); return MONTHS[d.getMonth()]; }
function canonicalImageKey(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const noQuery = raw.split('?')[0].split('#')[0];
  const decoded = decodeURIComponent(noQuery);
  const specialFile = decoded.match(/Special:FilePath\/(.+)$/i);
  const tail = specialFile ? specialFile[1] : decoded.split('/').pop();
  return String(tail || decoded).trim().toLowerCase();
}
function uniqueImages(images) {
  const seen = new Set();
  const out = [];
  for (const image of images || []) {
    const key = canonicalImageKey(image);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(image);
  }
  return out;
}
function recordImage(record) { const images = Array.isArray(record?.images) ? record.images : []; return images.find(Boolean) || ""; }
function resolvedHomeImageUrl(url, width = 260) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const decoded = decodeURIComponent(raw);
  const specialFile = decoded.match(/https?:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\/(.+)$/i);
  if (specialFile?.[1]) return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(specialFile[1])}?width=${width}`;
  return raw;
}
function serializeHomeFallbackSources(images, width = 260) {
  return uniqueImages(images).map((url) => encodeURIComponent(resolvedHomeImageUrl(url, width))).join('|');
}
function isEdibleMushroomRecord(record) {
  if (!isForagingMushroom(record)) return false;
  const nonEdible = String(record?.non_edible_severity || "").trim().toLowerCase();
  if (nonEdible) return false;
  const culinary = String(record?.culinary_uses || "").trim();
  const edibleStatus = String(record?.mushroom_profile?.edibility_status || "").trim().toLowerCase();
  if (culinary) return true;
  return ["choice", "excellent", "very good", "good", "edible", "edible_with_caution", "edible_mediocre", "edible_when_young", "edible_when_white_inside", "choice_cooked_only"].includes(edibleStatus);
}
function homeHub(allRecords) {
  const month = currentMonthName();
  const inedibleSlugs = new Set(avoidRecords(allRecords).map((record) => record.slug));
  const safeInSeasonPlants = allRecords.filter((record) => isPlant(record) && !inedibleSlugs.has(record.slug) && (record.months_available || []).includes(month));
  const safeInSeasonMushrooms = allRecords.filter((record) => isEdibleMushroomRecord(record) && !inedibleSlugs.has(record.slug) && (record.months_available || []).includes(month));
  const totalPlants = allRecords.filter((record) => isPlant(record) && !inedibleSlugs.has(record.slug)).length;
  const totalMushrooms = allRecords.filter((record) => isEdibleMushroomRecord(record) && !inedibleSlugs.has(record.slug)).length;
  const totalMedicinal = medicinalRecords(allRecords).filter((record) => !inedibleSlugs.has(record.slug)).length;
  const rareCount = (state.rareSpecies || []).length;
  const highlights = [...safeInSeasonMushrooms, ...safeInSeasonPlants].filter((record) => recordImage(record)).slice(0, 6);
  return `
    <section class="panel home-hub in-focus-feature">
      <div class="result-header compact-result-header"><div class="result-title-row"><h3>In Focus Right Now</h3><p class="results-meta">${escapeHtml(month)}</p></div></div>
      <section class="detail-card section-block safety-callout warning">
        <h3>Use this guide carefully</h3>
        <p>This guide was put together by an amateur forager, not a scientist. I made it to be a reminder of things I've known, it is not intended to be a one-stop-app for all things foraging.</p>
        <p>Treat all plants, especially mushrooms, as potentially inedible and dangerous, don't eat anything until you know the species and know how to prepare it. Foraging can be a fun and rewarding way to make some great meals, just do it wisely.</p>
        <p>The guide includes sections on plants, mushrooms, medicinals, and non-edible look alikes to be aware of. There's a timeline that will show you the different species you'll likely find in the woods each month, a sheet of reference materials, and as a bonus I added a section on Rare and Endangered species of Upper Michigan that also enables you to save your sightings.</p>
      </section>
      <div class="in-focus-layout">
        <div class="in-focus-stats">
          <div class="in-focus-stat-card"><strong>${safeInSeasonPlants.length}</strong><span>plants in season</span></div>
          <div class="in-focus-stat-card"><strong>${safeInSeasonMushrooms.length}</strong><span>mushrooms in season</span></div>
          <div class="in-focus-stat-card"><strong>${totalPlants}</strong><span>total plants</span></div>
          <div class="in-focus-stat-card"><strong>${totalMushrooms}</strong><span>total mushrooms</span></div>
          <div class="in-focus-stat-card"><strong>${totalMedicinal}</strong><span>medicinal species</span></div>
          <div class="in-focus-stat-card"><strong>${rareCount}</strong><span>rare / endangered entries</span></div>
        </div>
        <div class="in-focus-highlights">
          ${highlights.map((record) => {
            const allImages = uniqueImages(record.images || []);
            const image = resolvedHomeImageUrl(allImages[0], 260);
            const fallbackSources = serializeHomeFallbackSources(allImages, 260);
            return `<a class="in-focus-card" href="#/detail/${escapeHtml(record.slug)}"><div class="in-focus-caption in-focus-caption-top"><strong>${escapeHtml(record.display_name || record.common_name || "Untitled")}</strong></div><img src="${encodeURI(image)}" data-fallback-sources="${fallbackSources}" data-fallback-index="0" alt="${escapeHtml(record.display_name || record.common_name || "In-season species")}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`;
          }).join("")}
        </div>
      </div>
    </section>`;
}
function mushroomLaneNav(active = "all") {
  const cards = [
    { key: "gills", href: "#/mushrooms-gilled", title: "Gills", text: "Thin blade-like structures under the cap." },
    { key: "sponge", href: "#/boletes", title: "Sponge-like (boletes)", text: "Soft pores / sponge underside. Most of these are boletes." },
    { key: "other", href: "#/mushrooms-other", title: "Other", text: "Ridges, teeth, shelves, blobs, coral, jelly, and oddballs." }
  ];
  return `<section class="panel home-hub"><div class="result-header compact-result-header"><div class="result-title-row"><h3>Start here</h3><p class="results-meta">Choose a section</p></div></div><div class="mushroom-lane-grid">${cards.map((card) => `<a class="mushroom-lane-card ${active === card.key ? "active" : ""}" href="${card.href}"><strong>${card.title}</strong><span>${card.text}</span></a>`).join("")}</div></section>`;
}
function seasonToggleFilter(page, count, activeMonth = "") {
  const month = currentMonthName();
  const active = activeMonth === month;
  return `<div class="compact-filter season-filter-cell"><span>Season</span><button class="buttonish compact-quick-filter ${active ? "active" : ""}" type="button" data-action="toggle-in-season" data-page="${escapeHtml(page)}">In-season (${count})</button></div>`;
}
function selectFilter(label, key, values, current, blank) { return `<label class="compact-filter"><span>${escapeHtml(label)}</span><select data-filter="${escapeHtml(key)}">${optionHtml(values, current, blank)}</select></label>`; }
function searchFilter(key, current, placeholder) { return `<label class="compact-filter compact-search"><input type="search" data-filter="${escapeHtml(key)}" value="${escapeHtml(current || "")}" placeholder="${escapeHtml(placeholder)}"></label>`; }
function sortFilter(current, options = SORT_OPTIONS) { return `<label class="compact-filter"><span>Sort</span><select data-filter="sort">${options.map((opt) => `<option value="${escapeHtml(opt.value)}" ${current === opt.value ? "selected" : ""}>${escapeHtml(opt.label)}</option>`).join("")}</select></label>`; }
function filterBlock(extraFilters = [], allowClear = true) { const clear = allowClear ? `<div class="filter-actions"><button class="buttonish" type="button" data-action="clear-filters">Clear all filters</button></div>` : ""; return `<section class="panel filter-stack"><div class="tight-filter-grid">${extraFilters.join("")}</div>${clear}</section>`; }
function resultSection(title, records, context, filters = {}, metaText = "", sortOptions = SORT_OPTIONS) { const finalMeta = metaText || `${records.length} match${records.length === 1 ? "" : "es"}${filters.sort ? ` · ${escapeHtml(sortOptions.find((opt)=>opt.value===filters.sort)?.label || "")}` : ""}`; return `<section class="panel workspace-pane results-pane-card"><div class="result-header compact-result-header"><div class="result-title-row"><h3>${escapeHtml(title)}</h3><p class="results-meta">${finalMeta}</p></div></div><div class="result-list">${renderResultList(records, context)}</div></section>`; }
function yesNoButtons(key, value) { const yesActive = value === "yes"; const noActive = value === "no"; return `<div class="tag-row"><button type="button" class="buttonish ${yesActive ? "active" : ""}" data-action="set-quick-filter" data-key="${escapeHtml(key)}" data-value="yes">Yes</button><button type="button" class="buttonish ${noActive ? "active" : ""}" data-action="set-quick-filter" data-key="${escapeHtml(key)}" data-value="no">No</button></div>`; }
function quickCheckInlineFilters(filters) {
  return [
    `<div class="compact-filter quick-check-filter"><span>Blue stain when bruised or cut?</span>${yesNoButtons("quickBlueStain", filters.quickBlueStain)}</div>`,
    `<div class="compact-filter quick-check-filter"><span>Red cap or red / orange pores?</span>${yesNoButtons("quickRedCapPores", filters.quickRedCapPores)}</div>`,
    `<div class="compact-filter quick-check-filter"><span>Sticky / slimy cap?</span>${yesNoButtons("quickStickyCap", filters.quickStickyCap)}</div>`,
    `<div class="compact-filter quick-check-filter"><span>Rough dotted stalk (scabers)?</span>${yesNoButtons("quickRoughStalk", filters.quickRoughStalk)}</div>`,
    `<div class="compact-filter quick-check-filter"><span>Pinkish pores or bitter taste?</span>${yesNoButtons("quickPinkPoresBitter", filters.quickPinkPoresBitter)}</div>`,
    `<div class="compact-filter quick-check-filter"><span>Shaggy / dark oddball?</span>${yesNoButtons("quickShaggyOddball", filters.quickShaggyOddball)}</div>`
  ];
}
function renderMushroomLandingPage(allRecords) { const month = currentMonthName(); const inSeasonRecords = allRecords.filter((record) => isEdibleMushroomRecord(record) && (record.months_available || []).includes(month)); const metaText = `${inSeasonRecords.length} in season · ${escapeHtml(month)} · Use Gills, Sponge-like (boletes), or Other for full filtering`; return `${mushroomLaneNav("all")}${resultSection("MUSHROOMS IN SEASON NOW", inSeasonRecords, "mushrooms", {}, metaText)}`; }
function renderBoleteGuide(currentRecords, filters, allRecords) {
  const inSeasonCount = allRecords.filter((record) => isForagingMushroom(record) && (record.underside || []).includes("Pores") && (record.months_available || []).includes(currentMonthName())).length;
  const filterPanel = `${filterBlock([...quickCheckInlineFilters(filters),seasonToggleFilter("boletes", inSeasonCount, filters.month),sortFilter(filters.sort),selectFilter("Bolete group", "boleteGroup", Object.values(BOLETE_GROUP_LABELS), filters.boleteGroup, "Any bolete type"),selectFilter("Substrate", "substrate", vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, "Any substrate"),selectFilter("Tree type", "treeType", vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, "Any tree type"),selectFilter("Host tree", "hostTree", hostTreeLabels(filters.treeType), filters.hostTree, "Any host tree"),selectFilter("Pore color", "poreColor", BOLETE_PORE_COLORS, filters.poreColor, "Any pore color"),selectFilter("Stem feature", "stemFeature", BOLETE_STEM_FEATURES, filters.stemFeature, "Any stem feature"),selectFilter("Cap surface", "texture", vocabLabels(VOCAB.mushrooms.textures), filters.texture, "Any cap surface"),selectFilter("Staining", "staining", vocabLabels(VOCAB.mushrooms.stainingColors), filters.staining, "Any staining"),selectFilter("Ring", "ring", vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, "Any ring"),selectFilter("Taste", "taste", vocabLabels(VOCAB.common.tastes), filters.taste, "Any taste"),selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}`;
  const resultTitle = filters.boleteGroup || "Sponge-like mushrooms (boletes)";
  return `${mushroomLaneNav("sponge")}${filterPanel}${resultSection(resultTitle, currentRecords, "mushrooms", filters)}`;
}
function renderCreditsPage(allRecords, overridePayload) {
  const creditsBySlug = overridePayload?.creditsPayload?.credits || {};
  const photographerMap = new Map();
  Object.entries(creditsBySlug).forEach(([slug, items]) => { const record = allRecords.find((item) => item.slug === slug); const label = record?.display_name || formatLabelFromSlug(slug); (items || []).forEach((item) => { const creator = item.creator || "Unknown creator"; const bucket = photographerMap.get(creator) || []; bucket.push({ label, license: item.license || "", title: item.title || "" }); photographerMap.set(creator, bucket); }); });
  const grouped = [...photographerMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([creator, items]) => `<section class="credit-group"><h4>${escapeHtml(creator)}</h4><ul>${items.map((item) => `<li><strong>${escapeHtml(item.label)}</strong>${item.title ? ` — ${escapeHtml(item.title)}` : ""}${item.license ? ` — ${escapeHtml(item.license)}` : ""}</li>`).join("")}</ul></section>`).join("");
  return grouped ? `<section class="panel">${grouped}</section>` : '<section class="panel empty-state"><h3>No credits loaded</h3></section>';
}
function renderReferencesPage(references, search = "") {
  const query = String(search || "").trim().toLowerCase();
  const items = (Array.isArray(references) ? references : []).filter((item) => !query || [item.title, item.source, item.summary, ...(item.topics || [])].join(" ").toLowerCase().includes(query));
  if (!items.length) return `${filterBlock([searchFilter("search", search, "Search references")], false)}<section class="panel empty-state"><h3>No references loaded</h3></section>`;
  return `${filterBlock([searchFilter("search", search, "Search references")], false)}<section class="panel"><div class="result-header compact-result-header"><div class="result-title-row"><h3>References</h3><p class="results-meta">${items.length} entr${items.length === 1 ? "y" : "ies"}</p></div></div><div class="reference-list">${items.map((item) => `<article class="panel"><h3><a href="${escapeHtml(item.url || "#")}" target="_blank" rel="noreferrer">${escapeHtml(item.title || "Untitled reference")}</a></h3><p class="one-line muted-line">${escapeHtml([item.source, item.published, item.resourceType].filter(Boolean).join(" · "))}</p>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}${item.topics?.length ? `<div class="tag-row">${item.topics.map((topic) => `<span class="tag">${escapeHtml(topic)}</span>`).join("")}</div>` : ""}</article>`).join("")}</div></section>`;
}
export function renderDashboard({ page, allRecords, currentRecords, filters, selectedMonth, overridePayload, references = [] }) {
  if (page === "home") return homeHub(allRecords);
  if (page === "search") return `${filterBlock([searchFilter("search", filters.search, "Search all species"), sortFilter(filters.sort), `<div class="filter-hint">Press Enter to search</div>`])}${resultSection("Search", currentRecords, "general", filters)}`;
  if (page === "plants") { const inSeasonCount = allRecords.filter((record) => isPlant(record) && (record.months_available || []).includes(currentMonthName())).length; return `${filterBlock([seasonToggleFilter("plants", inSeasonCount, filters.month), sortFilter(filters.sort), selectFilter("Habitat", "habitat", vocabLabels(VOCAB.common.habitats), filters.habitat, "Any habitat"), selectFilter("Part / trait", "part", vocabLabels(VOCAB.common.observedParts), filters.part, "Any part / trait"), selectFilter("Flower color", "flowerColor", FLOWER_COLORS, filters.flowerColor, "Any flower color"), selectFilter("Leaf arrangement", "leafArrangement", LEAF_ARRANGEMENTS, filters.leafArrangement, "Any leaf arrangement"), selectFilter("Leaf shape", "leafShape", LEAF_SHAPES, filters.leafShape, "Any leaf shape"), selectFilter("Leaf points", "leafPointCount", LEAF_POINT_COUNTS, filters.leafPointCount, "Any leaf points"), selectFilter("Stem surface", "stemSurface", STEM_SURFACES, filters.stemSurface, "Any stem surface"), selectFilter("Size", "size", vocabLabels(VOCAB.common.sizes), filters.size, "Any size"), selectFilter("Taste", "taste", vocabLabels(VOCAB.common.tastes), filters.taste, "Any taste"), selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}${resultSection("Plants", currentRecords, "general", filters)}`; }
  if (page === "mushrooms") return renderMushroomLandingPage(allRecords);
  if (page === "mushrooms-gilled") { const inSeasonCount = allRecords.filter((record) => isForagingMushroom(record) && (record.underside || []).includes("Gills") && (record.months_available || []).includes(currentMonthName())).length; return `${mushroomLaneNav("gills")}${filterBlock([seasonToggleFilter("mushrooms-gilled", inSeasonCount, filters.month), sortFilter(filters.sort), selectFilter("Substrate", "substrate", vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, "Any substrate"), selectFilter("Tree type", "treeType", vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, "Any tree type"), selectFilter("Host tree", "hostTree", hostTreeLabels(filters.treeType), filters.hostTree, "Any host tree"), selectFilter("Ring", "ring", vocabLabels(VOCAB.mushrooms.ringStates), filters.ring, "Any ring"), selectFilter("Smell", "smell", vocabLabels(VOCAB.mushrooms.odors), filters.smell, "Any smell"), selectFilter("Taste", "taste", vocabLabels(VOCAB.common.tastes), filters.taste, "Any taste"), selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}${resultSection("Gilled mushrooms", currentRecords, "mushrooms", filters)}`; }
  if (page === "boletes") return renderBoleteGuide(currentRecords, filters, allRecords);
  if (page === "mushrooms-other") { const inSeasonCount = allRecords.filter((record) => isForagingMushroom(record) && !(record.underside || []).includes("Gills") && !(record.underside || []).includes("Pores") && (record.months_available || []).includes(currentMonthName())).length; return `${mushroomLaneNav("other")}${filterBlock([seasonToggleFilter("mushrooms-other", inSeasonCount, filters.month), sortFilter(filters.sort), selectFilter("Substrate", "substrate", vocabLabels(VOCAB.mushrooms.substrates), filters.substrate, "Any substrate"), selectFilter("Tree type", "treeType", vocabLabels(VOCAB.mushrooms.woodTypes), filters.treeType, "Any tree type"), selectFilter("Host tree", "hostTree", hostTreeLabels(filters.treeType), filters.hostTree, "Any host tree"), selectFilter("Texture", "texture", vocabLabels(VOCAB.mushrooms.textures), filters.texture, "Any texture"), selectFilter("Smell", "smell", vocabLabels(VOCAB.mushrooms.odors), filters.smell, "Any smell"), selectFilter("Taste", "taste", vocabLabels(VOCAB.common.tastes), filters.taste, "Any taste"), selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}${resultSection("Other non-gilled mushrooms", currentRecords, "mushrooms", filters)}`; }
  if (page === "medicinal") { const inSeasonCount = medicinalRecords(allRecords).filter((record) => (record.months_available || []).includes(currentMonthName())).length; return `${filterBlock([seasonToggleFilter("medicinal", inSeasonCount, filters.month), sortFilter(filters.sort, MEDICINAL_SORT_OPTIONS), selectFilter("Action", "medicinalAction", vocabLabels(VOCAB.medicinal.actions), filters.medicinalAction, "Any action"), selectFilter("Body system", "medicinalSystem", vocabLabels(VOCAB.medicinal.bodySystems), filters.medicinalSystem, "Any body system"), selectFilter("Medical term", "medicinalTerm", vocabLabels(VOCAB.medicinal.symptoms), filters.medicinalTerm, "Any medical term"), selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}${resultSection("Medicinal", currentRecords, "medicinal", filters, "", MEDICINAL_SORT_OPTIONS)}`; }
  if (page === "rare") return renderRarePageHtml(state.rareSpecies || [], state.rareSightings || []);
  if (page === "lookalikes") { const severities = [...new Set(allRecords.map((r) => r.non_edible_severity).filter(Boolean))].sort((a, b) => a.localeCompare(b)); const inSeasonCount = avoidRecords(allRecords).filter((record) => (record.months_available || []).includes(currentMonthName())).length; return `${filterBlock([seasonToggleFilter("lookalikes", inSeasonCount, filters.month), sortFilter(filters.sort), selectFilter("Severity", "severity", severities, filters.severity, "Any severity"), selectFilter("Month", "month", MONTHS, filters.month, "Any month")])}${resultSection("Non-edible species", currentRecords, "lookalikes", filters)}`; }
  if (page === "review") { const reviewReasons = [...new Set(allRecords.flatMap((record) => record.reviewReasons || []))].sort((a, b) => a.localeCompare(b)); return `${filterBlock([sortFilter(filters.sort), selectFilter("Review reason", "reviewReason", reviewReasons, filters.reviewReason, "Any review reason")])}${resultSection("Needs Review", currentRecords, "review", filters)}`; }
  if (page === "timeline") { const eligible = allRecords.filter((record) => !!String(record.medicinal_uses || "").trim() || isForagingMushroom(record) || (isPlant(record) && !!String(record.culinary_uses || "").trim())); return `${renderInteractiveTimeline(eligible, selectedMonth, "results")}`; }
  if (page === "credits") return renderCreditsPage(allRecords, overridePayload);
  if (page === "references") return renderReferencesPage(references, filters.search || "");
  return "";
}
