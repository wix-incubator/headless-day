#!/usr/bin/env python3
"""
Encodes gallery_template.js into index.html as a Wix Headless __bundler/template payload.
Run after editing gallery_template.js, then deploy with: npx @wix/cli@latest release
"""
import json, pathlib

tpl = pathlib.Path('gallery_template.js').read_text()
encoded = json.dumps(tpl).replace('</', '<\\/')

skeleton = pathlib.Path('index.html').read_text()
start_tag = '<script type="__bundler/template">'
end_tag = '</script>'
start = skeleton.index(start_tag) + len(start_tag)
end = skeleton.index(end_tag, start)

pathlib.Path('index.html').write_text(skeleton[:start] + encoded + skeleton[end:])
print(f"Repacked. Template: {len(tpl):,} chars → index.html: {len(encoded):,} chars encoded")
