# WNMU Quarterly Issues & Programming Report Builder — Standalone Prototype v3

This replaces the v2 handoff for now.

Do **not** wire this into the main app yet. This version is meant for testing and tightening the report logic on the standalone page first.

## Files

Copy these into the repo base:

```text
quarterly-issues.html
styles-quarterly-issues.css
js/quarterly-issues-report.js
```

Then open:

```text
quarterly-issues.html
```

## Changes from v2

### 1. All records are always included in the source scan

The active/archive selector is gone.

The source scan always reads all records from `programs_enriched`, including archived records.

### 2. Candidate selection is stricter

The old behavior was too liberal: if it aired, it became a candidate.

The new behavior is:

```text
aired in selected quarter
+
known local/Michigan public-affairs series
OR
description/topic/title proves local or regional issue impact
```

Generic national-only issue programs are rejected unless the description proves local/regional relevance.

### 3. Generic cooking/yoga/lifestyle programs are rejected

Examples now rejected unless the description proves regional issue impact:

- Outdoor Eats
- Wai Lana Yoga
- generic cooking shows
- generic exercise/fitness/yoga shows
- generic craft/lifestyle/home/garden shows

Rejected rows do not appear by default.

There is a checkbox:

```text
Show rejected audit rows
```

Use that only for debugging why something was excluded.

### 4. Off the Record is handled specially

`Off the Record` is included as a known Michigan public-affairs series.

Because the local library may not have episode descriptions, it is flagged:

```text
Needs External Detail
```

Reason:

```text
Known Michigan public-affairs series. Episode-specific issue details should be pulled from WKAR before final filing.
```

### 5. Why Dinosaurs / science classification

Science terms now map to:

```text
Educational Issues
```

The Arts/Humanities/Cultural bucket no longer uses generic “documentary” and does not grab science/natural-history programs merely because they have broad history language.

## Important

This page still does not write to Supabase.

There are no `.insert()`, `.update()`, `.delete()`, or `.rpc()` calls in the report script.

## Testing checklist

Run the standalone page and test Q2 2026:

- Confirm all records are scanned.
- Confirm Outdoor Eats is not in the included list.
- Confirm Wai Lana Yoga is not in the included list.
- Confirm rejected rows can be seen only when “Show rejected audit rows” is checked.
- Confirm Off the Record is included and marked Needs External Detail.
- Confirm Why Dinosaurs does not get Arts/Humanities/Cultural just because it is a documentary/science program.
- Confirm national-only programs are rejected unless the description proves regional impact.
