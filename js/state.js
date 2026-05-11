export const state = {
  loading: true,
  bootLog: [],
  route: "home",
  species: [],
  rareSpecies: [],
  references: [],
  filters: {
    search: "",
    sort: "alpha"
  },
  loadErrors: [],
  imageCache: new Map(),
  imageCredits: new Map(),
  imageFailures: new Set()
};

export function setRoute(route) {
  state.route = route || "home";
}

export function setSpecies(records) {
  state.species = Array.isArray(records) ? records : [];
}

export function setRareSpecies(records) {
  state.rareSpecies = Array.isArray(records) ? records : [];
}

export function setReferences(records) {
  state.references = Array.isArray(records) ? records : [];
}

export function logBoot(message) {
  state.bootLog.push(message);
}

export function rememberImageResult(slug, result) {
  if (!slug) return;
  state.imageCache.set(slug, result);
}

export function rememberImageCredit(slug, credit) {
  if (!slug || !credit) return;
  state.imageCredits.set(slug, credit);
}

export function rememberImageFailure(slug) {
  if (!slug) return;
  state.imageFailures.add(slug);
}
