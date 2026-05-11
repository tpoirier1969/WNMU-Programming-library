from pathlib import Path

root = Path.cwd()
index_path = root / 'index.html'
new_path = root / 'program-new.html'
required = [index_path, new_path, root / 'js' / 'library-workflow.js', root / 'js' / 'program-new-bridge.js']
for path in required:
    if not path.exists():
        raise SystemExit(f'Required file not found: {path}. Run this from the WNMU-Programming-library site root.')

(index_path.with_name('index.html.bak-v1.5.50')).write_text(index_path.read_text(encoding='utf-8'), encoding='utf-8')
(new_path.with_name('program-new.html.bak-v1.5.50')).write_text(new_path.read_text(encoding='utf-8'), encoding='utf-8')

index = index_path.read_text(encoding='utf-8')
index = index.replace('styles.css?v=1.5.50', 'styles.css?v=1.5.51')
index = index.replace('<span id="appVersion" class="version-pill">v1.5.50</span>', '<span id="appVersion" class="version-pill">v1.5.51</span>')
insert = '  <script defer src="js/library-workflow.js?v=1.5.51"></script>'
needle = '  <script defer src="js/events.js?v=1.5.47"></script>'
if insert not in index:
    if needle not in index:
        raise SystemExit('Could not find expected events.js script line in index.html.')
    index = index.replace(needle, f'{needle}\n{insert}')
index_path.write_text(index, encoding='utf-8')

new_html = new_path.read_text(encoding='utf-8')
new_html = new_html.replace('WNMU TV Programming Library v1.5.50 · Add Program', 'WNMU TV Programming Library v1.5.51 · Add Program')
new_html = new_html.replace('styles.css?v=1.5.50', 'styles.css?v=1.5.51')
new_html = new_html.replace('<span class="version-pill">v1.5.50</span>', '<span class="version-pill">v1.5.51</span>')
insert = '  <script defer src="js/program-new-bridge.js?v=1.5.51"></script>'
needle = '  <script defer src="js/program-new.js?v=1.5.47"></script>'
if insert not in new_html:
    if needle not in new_html:
        raise SystemExit('Could not find expected program-new.js script line in program-new.html.')
    new_html = new_html.replace(needle, f'{needle}\n{insert}')
new_path.write_text(new_html, encoding='utf-8')

print('v1.5.51 patch applied.')
print('Backups created: index.html.bak-v1.5.50 and program-new.html.bak-v1.5.50')
print('Upload/commit: index.html, program-new.html, js/library-workflow.js, js/program-new-bridge.js')
