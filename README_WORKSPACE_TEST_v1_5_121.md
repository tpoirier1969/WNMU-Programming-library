# WNMU Programming Workspace Test v1.5.121 — Rights Begin / End Sort

This package is for the **split-window test page only**:

```text
program-workspace-test.html
```

It does not change the regular `index.html` page.

## Files to copy

Copy these into the repo base:

```text
program-workspace-test.html
js/workspace-scope-clearall-v15119.js
js/workspace-topic-exclude-v15120.js
js/workspace-rights-sort-v15121.js
```

## What changed

### Version

The split-window test page now advertises:

```text
v1.5.121
```

### Rights column sort is no longer ambiguous

The Rights column still displays both dates in the same column, but the header now has two explicit sort buttons:

```text
Rights
[Begin] [End]
```

- **Begin** sorts by `rights_begin`
- **End** sorts by `rights_end`

This makes it clear which date is driving the sort while keeping the table narrow.

## Includes prior v1.5.119 / v1.5.120 test fixes

This package also includes the existing split-window test support files:

- Active / All records / Archived scope and Clear All visual sync
- Topic / Secondary topic exclude checkboxes

## Safety

This is UI/sorting/filter behavior only.

It does not write to Supabase and does not modify program records.
