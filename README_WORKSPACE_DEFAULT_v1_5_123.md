# WNMU Programming Library v1.5.123 — Admin Returns to Blank New Program Form

This package keeps the promoted workspace layout as the default page and changes the admin workflow after creating a new program.

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
js/workspace-admin-new-blank-v15123.js
```

## What changed

### Admin-only post-create behavior

After an admin successfully creates a new program, the right/details panel now returns to a blank **Add New Program** form.

This replaces the current behavior where the panel falls back to:

```text
Select a program to see details
The Library list controls what appears here. Admin users can also add or edit programs in this panel.
```

### Read-only behavior unchanged

If the user is not signed in as admin, the empty details message still appears.

### Existing-program behavior protected

This only targets successful **new program creation**.

It does not force a blank form after simply selecting, closing, or editing an existing program.

## Version

The app/version manifest now advertises:

```text
v1.5.123
```

## Safety

This is front-end workflow behavior only.

It does not write to Supabase beyond the normal save action already performed by the app, and it does not change program records itself.
