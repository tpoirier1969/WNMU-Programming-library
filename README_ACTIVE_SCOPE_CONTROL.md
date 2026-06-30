# Programming Library Active Scope Control

This handoff adds the missing Active/All/Archived title scope control to the Programming Library split-screen/filter layout.

## Files

Copy into the repo:

```text
js/active-scope-control.js
tools/apply-active-scope-control.ps1
```

Then run from the repo base:

```powershell
.\tools\apply-active-scope-control.ps1
```

That inserts this script tag into `index.html`:

```html
<script defer src="js/active-scope-control.js?v=1.0.0"></script>
```

## What it adds

A filter at the end of the compact filter cluster:

```text
Titles: Active only / All records / Archived
```

## Behavior

- **Active only** maps to the existing active library view.
- **Archived** maps to the existing archived view.
- **All records** patches the existing view-pool function to include both active and archived records.

## Safety

This module does not write to Supabase. It does not modify program records.

It only changes the visible list scope.
