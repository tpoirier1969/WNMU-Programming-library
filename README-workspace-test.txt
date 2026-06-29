WNMU Programming Library — One-Page Workspace Test v9 / v1.5.117

Upload these files to the repo root, preserving the js folder:

- program-workspace-test.html
- js/program-workspace-test.js
- wnmu-programming-stacked-icon.svg
- wnmu-programming-stacked-icon.ico
- wnmu-programming-stacked-icon-32.png
- wnmu-programming-stacked-icon-64.png
- wnmu-programming-stacked-icon-180.png
- wnmu-programming-stacked-icon-512.png

Open:
https://tpoirier1969.github.io/WNMU-Programming-library/program-workspace-test.html

This is still a test-only package. It does not include config.js, SQL, version.json, production index.html, or production program-new.html.

v1.5.117 test changes:

- Program List selection is now handled by one workspace selection path.
- A single click on a program row/title should open details/edit immediately.
- Clicking the already-selected program again clears the selection.
- The old window/reactivation click guard is disabled on the workspace page so the first click back into the Program List is not swallowed.
- Close / Escape now go through the same clear-selection path.
- Clear All Filters now clears both filters and the selected program.
- If unsaved edits exist, Clear All Filters, Close, row deselect, switching to another program, or filters removing the selected program now show a warning with:
  - Continue editing
  - Discard edits
- If filters remove the selected program and there are no unsaved edits, the right panel clears immediately.
- If filters remove the selected program and there are unsaved edits, Continue editing keeps the details panel open; Discard edits clears it.
- Copy details from existing, Import PBS offer, and Lookup online were moved below the bottom Save/Duplicate/Delete action row.

Carried forward from v1.5.116:

- The right Program Work Panel is always present.
- Non-admin users can click a program and view the full details in read-only mode.
- Non-admin users do not see a usable Add New Program form when nothing is selected; they see a Select a program message.
- Admin users get Add New Program by default when nothing is selected, and Edit Program Details when a program is selected.
- The Add New Program form defaults Aired on 13.1 and Aired on 13.3 to No. Admin users can override either field.
- The workspace does not write archive state on save and disables the old auto-archive RPC in this test page.
- In-rights / out-of-rights list behavior is derived from Rights End:
  - In rights = Rights End is today or later.
  - Out of rights = Rights End is before today.
  - All programs = all titles regardless of Rights End.
- The stored is_archived database flag remains untouched by this test page.
- The old Active quick filter is relabeled In rights.
- The old Archived quick filter is relabeled Out of rights.
