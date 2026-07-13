# WNMU Programming Library v1.5.124

This replacement package targets both the default split workspace (`index.html`) and the workspace alias (`program-workspace-test.html`).

## Changes

- After a successful new-program save in Admin mode, the right panel is reset directly to a clean **Add New Program** form.
- Validation failures and save errors keep the entered form intact.
- Saving an existing program closes its details instead of incorrectly forcing the create form.
- The Episodes **Clear** button now sits beside the Min/Max fields.
- **Clear all filters** is moved to the far right of the lower filter row.
- **Titles** is renamed **Active/Archived** and uses the same standard control sizing as neighboring dropdowns.
- The visible version badge now follows the app manifest instead of being pinned to v1.5.122.
- The Series / All / Program segmented control is tightened so Program remains visible; All is narrower and less heavy.
- Select all / Clear buttons above Topics, Secondary Topics, Lengths, and Uses are raised slightly and narrowed.

## Install

1. Unzip the package.
2. Copy the files into the repository root, preserving the `js` folder.
3. Overwrite the existing files.
4. Upload/commit, then hard-refresh the browser.

The retired `js/workspace-admin-new-blank-v15123.js` file may remain in the repository, but v1.5.124 no longer loads it. The successful-create reset is integrated into `js/program-workspace-test.js` to avoid wrapper timing problems.
