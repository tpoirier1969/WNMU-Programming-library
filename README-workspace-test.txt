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
