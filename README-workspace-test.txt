WNMU Programming Library — One-Page Workspace Test v7 / v1.5.115

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

This is still a test-only package. It does not include or change:

  config.js
  version.json
  index.html
  program-new.html
  SQL/schema files

Version:

- program-workspace-test.html declares and displays v1.5.115.
- js/program-workspace-test.js is loaded with cache-buster ?v=1.5.115.
- version.json is intentionally NOT included, because the default production page is still separate and should not be forced into a manifest mismatch.

Changes in v1.5.115:

- Adds responsive fallback for narrower windows.
- Wide windows keep the normal left/right split workspace.
- Medium-width windows switch to a stacked layout: Library on top, Details/Add below.
- Narrow windows switch to a single-panel layout with Library and Details/Add buttons.
- Clicking a program in narrow mode automatically switches to the Details/Add panel.
- Closing the Details/Add panel in narrow mode returns to Library instead of reopening the Add New Program form immediately.
- The draggable splitter is disabled/hidden in stacked and narrow layouts.

Previous test behavior retained:

- Library filters stay in the left Library pane only.
- The whole Library filter section can collapse and shows a summary of filters in use.
- Matching-program count is not duplicated in the filter summary.
- Search typing should filter results without making the filter layout jump rows.
- Low-use quick filters remain removed from the main quick-filter row.
- APT Check and Missing Info remain compact admin-only diagnostic chips.
- Aired on 13.1 and Aired on 13.3 remain visible in the Program List.
- Package type, Distributor, and Flags remain hidden in the split workspace table to preserve width.
- Rights End sorting/labeling uses rights_end.
- Saving a record auto-archives if Rights End is expired and restores it to active if Rights End is current/future.
