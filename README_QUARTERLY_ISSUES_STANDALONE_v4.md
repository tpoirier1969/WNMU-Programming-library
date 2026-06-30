# Quarterly Issues Report Builder — Standalone v4 / v1.2.0

This is still standalone only. Do not wire it into the main app yet.

## What changed

- Added a visible version flag: `v1.2.0`.
- Replaced the hard include/exclude gate with scoring buckets.
- Default view is now **Review pool**, not strict final candidates.
- The summary quantifies:
  - aired rows scanned
  - recommended
  - review
  - weak / needs proof
  - rejected
  - missing descriptions
  - displayed rows

## Candidate views

```text
Review pool
Recommended only
Weak / needs proof
Rejected audit
All aired rows
```

This should fix the “only 3 titles” problem by exposing the middle ground instead of hiding it.

## Scoring idea

Rows gain points for:

- known local/Michigan public-affairs series
- regional/local proof
- issue-category matches in the description
- usable description

Rows lose points for:

- generic cooking/yoga/lifestyle/craft/home/garden patterns
- national-only series with no regional proof
- missing description

## Important behavior

- Outdoor Eats and Wai Lana Yoga should score into rejected unless the description proves regional issue impact.
- Off the Record should stay visible and be marked for external episode detail.
- Why Dinosaurs / science terms should point toward Educational Issues, not Arts/Humanities/Cultural.
- National issue programs without regional proof should be visible in review/audit views, not silently treated as final filing rows.

## Files

Copy into repo base for standalone testing:

```text
quarterly-issues.html
styles-quarterly-issues.css
js/quarterly-issues-report.js
```
