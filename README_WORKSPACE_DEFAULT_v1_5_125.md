# WNMU Programming Library — revised v1.5.125

This replacement package targets both split-workspace entry points:

- `index.html`
- `program-workspace-test.html`

## What changed

### One owner for filter layout

The filter controls are now placed statically in the HTML. `js/program-workspace-test.js` is the only module that assigns the workspace filter grid geometry.

- Shared layout routines in `js/library-workflow.js` and `js/library-main-ui-v15109.js` explicitly opt out of workspace geometry.
- `js/workspace-scope-clearall-v15119.js` now handles scope/reset behavior only.
- `js/workspace-topic-exclude-v15120.js` uses an explicit dropdown-render event instead of watching and redrawing the entire document.
- `js/workspace-rights-sort-v15121.js` is style-only. The static Rights Begin/End buttons use the normal shared sorting system.
- There are no competing retry loops moving Clear buttons around after load.

The resulting layout keeps:

- Episodes **Clear** beside Min/Max;
- Rights **Clear** beside Rights End;
- **Clear all filters** at the far right;
- **Active/Archived** at normal dropdown size;
- **Series / All / Pgm** visible at desktop and 1024-pixel widths; and
- the Topic, Secondary Topic, Lengths, and Uses action buttons compact and above their dropdowns.

### Search behavior

Search now applies automatically when both conditions are met:

1. At least four characters have been entered.
2. Typing has paused for two seconds.

Pressing Enter still applies immediately, but it is no longer required.

### Program opening and Admin editor behavior

- A title opens on the first click, including after the browser regains focus and after saving another title.
- After any successful new or existing-program save, Admin mode returns to a clean **Add New Program** form.
- Closing, deselecting, deleting, or filtering out the selected title also returns Admin mode to **Add New Program**.
- The **Select a program to see details** message is hidden in Admin mode and remains available only to read-only/non-admin users.

## Install

1. Unzip the package.
2. Copy the files into the repository root, preserving the `js` folder.
3. Overwrite the existing files.
4. Upload or commit, then hard-refresh the browser.

The package is not live until it is uploaded or committed.
