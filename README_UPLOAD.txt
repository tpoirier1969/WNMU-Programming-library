WNMU Programming Library v1.5.51 upload package

Purpose:
- Add main Library episode-count range filter: Min / Max episodes, series only.
- Open New Program in a reusable standalone tab.
- Let the Add Program page notify the original Library tab after each successful save using BroadcastChannel.
- Return to Library tries to focus the original Library tab and close the Add Program tab; if not possible, it navigates to index.html.

Files included:
- js/library-workflow.js
- js/program-new-bridge.js
- apply_v1_5_51_patch.ps1
- apply_v1_5_51_patch.bat
- README_UPLOAD.txt
- NEW_CHAT_HANDOFF.txt

How to use:
1. Unzip this package into the root of your WNMU-Programming-library site folder.
2. Run apply_v1_5_51_patch.bat from that root folder.
3. Upload/commit these four changed/new site files:
   - index.html
   - program-new.html
   - js/library-workflow.js
   - js/program-new-bridge.js

Do NOT upload/change config.js.
Do NOT touch WNMU-monthly-schedules for this change.

Expected visible version after patch:
- Main Library page: v1.5.51
- Add New Program page: v1.5.51

Quick tests:
1. Main Library loads normally.
2. Episodes filter appears near Rating.
3. Max Episodes = 6 shows only series with 6 or fewer readable episodes.
4. Min = 4 and Max = 6 shows series with 4 to 6 episodes.
5. New program button opens program-new.html in a separate reusable tab.
6. Saving from Add Program keeps you on the Add Program page for batch entry.
7. Library tab receives the saved program notice without polling/reloading in a loop.
8. Back/Open library from Add Program focuses the original Library tab and closes the Add tab when the browser allows it.
