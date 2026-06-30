# WNMU Programming Library — Clear All Reset Sync v1.0.1

This fixes the Clear All Filters bug where the results list clears but the visual checkbox/dropdown filters still look checked.

## Problem fixed

When clicking:

```text
Clear all filters
```

the real native filters may clear, so the program list shows all topics again. But the custom checkbox/dropdown layer can stay visually checked.

## Files

Copy into the repo:

```text
js/clear-all-reset-sync.js
tools/apply-clear-all-reset-sync.ps1
```

Then run from the repo base:

```powershell
.\tools\apply-clear-all-reset-sync.ps1
```

That inserts this script tag into `index.html`:

```html
<script defer src="js/clear-all-reset-sync.js?v=1.0.1"></script>
```

## What it clears

The module force-clears both the real controls and the visual checkbox layer for:

- Topics
- Secondary topics
- Lengths
- Uses
- Search text
- Search-in field
- Distributor
- Program / Series
- Status
- Rating
- Rights begin/end
- Episode min/max
- Titles Active/All/Archived scope, if that control is installed

## Safety

This is UI-only. It does not write to Supabase and does not modify program records.
