WNMU Programming Library — one-page workspace test

Upload these files into the repo root, preserving the js/ folder path:

- program-workspace-test.html
- js/program-workspace-test.js
- wnmu-programming-stacked-icon.svg
- wnmu-programming-stacked-icon-32.png
- wnmu-programming-stacked-icon-64.png
- wnmu-programming-stacked-icon-180.png
- wnmu-programming-stacked-icon-512.png
- wnmu-programming-stacked-icon.ico

Open: program-workspace-test.html

This is a test-only page. It does not replace index.html or program-new.html. It uses existing data structures and live data. Saving from this page still writes real program records.

Workspace behavior:
- Not signed in: Library only. The Add/Edit pane does not appear.
- Signed in/admin mode: Library + Add/Edit Program split appears on one page, no iframes.
- Add/Edit pane uses the existing app editor logic.
- Divider is draggable and remembers the left/right split width in localStorage.

Archive date logic in this test page:
- Rights End before today => saved as archived.
- Rights End today or in the future => saved as active.
- Missing Rights End => preserves existing archive status; new programs remain active.

No config.js, SQL, production version.json, or production pages are included.
