WNMU Programming Library — One-Page Workspace Test v2

Upload these files to the root of the WNMU-Programming-library repo, preserving the js/ folder:

  program-workspace-test.html
  js/program-workspace-test.js
  wnmu-programming-stacked-icon.svg
  wnmu-programming-stacked-icon.ico
  wnmu-programming-stacked-icon-32.png
  wnmu-programming-stacked-icon-64.png
  wnmu-programming-stacked-icon-180.png
  wnmu-programming-stacked-icon-512.png

Open:

  https://tpoirier1969.github.io/WNMU-Programming-library/program-workspace-test.html

Test-only package. It does not include config.js, SQL, version.json, index.html, or program-new.html.

Changes from one-page workspace test v1:

- Kept the Library filters inside the Library pane instead of stretching them across the Add/Edit Program area.
- Removed the visible One-Page Test pill from the top bar.
- Removed the visible top-bar matching-programs/status window; the Program List summary remains the visible count.
- Removed Undo View from the visible UI.
- Removed low-use quick filter cards: Michigan Programming, Ending in 90 Days, and Missing Rights.
- Kept All Programs, Active, New to 13.1, New to 13.3, Evergreens, and Archived as compact quick filters.
- Kept APT Check and Missing Info as compact admin-only diagnostic chips.
- Tightened the filter grid for small/split windows.
- Narrowed Topics, Secondary Topics, Lengths, and Uses.
- Replaced the Secondary Topics native multi-select with a synchronized checkbox list so long items can wrap with a hanging indent.
- Kept the hidden underlying Secondary Topics select so existing filter logic still works.
- Changed the table header from Rights window to Rights end to make the sort behavior clearer.
- The Rights End sort already uses rights_end/end date, not rights_begin.
- Retained the test-page save behavior that auto-archives expired Rights End dates and restores archived records to active when Rights End is current/future.


Version flag fix:
- program-workspace-test.html now declares and displays v1.5.112.
- version.json is intentionally NOT included, because changing the production manifest without updating production index.html would create a version-check mismatch for the default production page.


V1.5.111 notes:
- This package is still test-only and does not change production index.html, program-new.html, config.js, version.json, SQL, or schema.
- The workspace version flag/cache-buster is v1.5.112.
- The one-page workspace does NOT push the Library filter area across the full Add/Edit panel.
- Removed the old production filter-layout helper from this test page so typing in Search Text filters results without recalculating/wrapping the filter layout.
- Clear All Filters remains in normal layout flow under the Library filters instead of overlaying controls.


v1.5.112 notes:
- Keeps Library filters inside the left workspace pane.
- Adds a collapsible filter section that preserves active filters and shows a one-line summary of filters in use.
- Does not show a duplicate matching-program count in the filter summary.
