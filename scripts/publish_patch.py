#!/usr/bin/env python3
"""Publish the web/ folder as an over-the-air patch WITHOUT GitHub Actions.

Writes web/ + manifest.json (version + sha1 of every file) to the `gh-pages` branch and pushes it.
GitHub Pages serves that branch (Settings > Pages > Source: "Deploy from a branch", gh-pages, /(root))
at https://sunantongsan.github.io/molt/ — the address the Android app already checks.

Usage:  python3 scripts/publish_patch.py            (version = last published + 1)
        python3 scripts/publish_patch.py --min 75   (never publish below 75)
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
web = os.path.join(root, 'web')
def git(*a, cwd=root, check=True): return subprocess.run(['git', *a], cwd=cwd, check=check, capture_output=True, text=True)

min_v = int(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0
git('fetch', '--depth=1', 'origin', 'gh-pages', check=False)
prev = 0
r = git('show', 'origin/gh-pages:manifest.json', check=False)
if r.returncode == 0:
    try: prev = int(json.loads(r.stdout).get('version', 0))
    except Exception: pass
version = max(prev + 1, min_v)

files = {}
for d, _, names in os.walk(web):
    for n in names:
        p = os.path.join(d, n); rel = os.path.relpath(p, web).replace(os.sep, '/')
        if rel == 'manifest.json': continue
        files[rel] = hashlib.sha1(open(p, 'rb').read()).hexdigest()

tmp = tempfile.mkdtemp(prefix='molt-pages-')
try:
    shutil.copytree(web, tmp, dirs_exist_ok=True)
    json.dump({'version': version, 'files': files}, open(os.path.join(tmp, 'manifest.json'), 'w'))
    open(os.path.join(tmp, '.nojekyll'), 'w').close()
    git('init', '-q', '-b', 'gh-pages', cwd=tmp)
    git('add', '-A', cwd=tmp)
    git('-c', 'user.name=MOLT patch', '-c', 'user.email=noreply@anthropic.com', 'commit', '-q', '-m', f'MOLT patch {version}', cwd=tmp)
    # a fresh one-commit branch each time keeps the repo small (his GitHub storage is limited)
    out = git('push', '-f', 'https://github.com/sunantongsan/molt', 'gh-pages:gh-pages', cwd=tmp, check=False)
    if out.returncode: sys.exit('push failed: ' + out.stderr)
finally:
    shutil.rmtree(tmp, ignore_errors=True)
print(f'published patch {version} ({len(files)} files) to gh-pages')
