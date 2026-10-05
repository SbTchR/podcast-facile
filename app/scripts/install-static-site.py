"""Publish one app at the repository root; retire the former /site/ entry."""
from pathlib import Path
import shutil

root = Path(__file__).resolve().parents[2]
dist = root / 'app/dist'
site = root / 'site'
index = (dist / 'index.html').read_text(encoding='utf-8')
# Keep generated resources in site/ without moving maintained source files.
# Relative fetches, CSS and modules resolve against this document base.
index = index.replace('<head>', '<head>\n    <base href="./site/" />\n    <link rel="canonical" href="https://sbtchr.github.io/podcast-facile/" />', 1)
shutil.rmtree(site, ignore_errors=True)
shutil.copytree(dist, site)
(site / '.nojekyll').touch()
(root / 'index.html').write_text(index, encoding='utf-8')
(site / 'index.html').write_text('''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Podcast Facile</title><meta http-equiv="refresh" content="0;url=../">
<link rel="canonical" href="https://sbtchr.github.io/podcast-facile/">
<script>location.replace(new URL('../', location.href).href)</script></head>
<body><a href="../">Ouvrir Podcast Facile</a></body></html>
''', encoding='utf-8')
print('Application publiée à /podcast-facile/ ; /site/ redirige vers cette adresse.')
