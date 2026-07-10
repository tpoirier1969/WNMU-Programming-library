# WNMU Programming Library v1.5.122 — Workspace Becomes Default

This package promotes the split workspace page to the default Programming Library page.

## Files to copy

Copy these into the repo base:

```text
index.html
program-workspace-test.html
version.json
js/workspace-scope-clearall-v15119.js
js/workspace-topic-exclude-v15120.js
js/workspace-rights-sort-v15121.js
js/workspace-default-main-v15122.js
```

## What changed

### `index.html` is now the workspace layout

The root app URL now opens the split workspace layout:

```text
https://tpoirier1969.github.io/WNMU-Programming-library/
```

The old test URL is kept as an alias and uses the same promoted workspace page:

```text
https://tpoirier1969.github.io/WNMU-Programming-library/program-workspace-test.html
```

### Add New Program topbar button removed

The `#newProgramBtn` element is kept in the DOM so existing event wiring does not break, but it is hidden, disabled, and removed from keyboard navigation.

This removes the topbar button without risking a JavaScript startup error.

### Version bump

The page and manifest now advertise:

```text
v1.5.122
```

### Prior workspace fixes included

This carries forward:

- Active only / All records / Archived title scope
- Clear All visual checkbox sync
- Topic and Secondary Topic exclude checkboxes
- Rights Begin and Rights End sort controls

## Safety

This package does not write to Supabase and does not modify program records.

It replaces front-end files only.
