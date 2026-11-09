#!/usr/bin/env python3
"""Build the two v16 products from this one source tree (no source is forked):
   admin   -> <out>/admin/            School Admin web portal (GitHub Pages root)
   lessons -> <out>/lessons/docs/     IFR Lessons web build (GitHub Pages /docs) — also bundled into the iOS app
Usage: python3 tools/build_split.py <out_dir> [lessons_url]"""
import os, re, sys, shutil, json
SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(SRC, "dist"))
LESSONS_URL = sys.argv[2] if len(sys.argv) > 2 else "https://kylehudson1014-crypto.github.io/tes-ifr-lessons/"
COMMON = ["sched", "v14", "v15", "v16", "poh", "briefit", "help", "icon-180.png", "icon-192.png", "icon-512.png", "ppa-logo.png", "LOGO_NOTICE.txt"]
CFG = {
  "admin":   {"dir": os.path.join(OUT, "admin"), "extra": [], "title": "Patriot Pilot Academy · School Admin",
              "short": "PPA Admin", "name": "Patriot Pilot Academy School Admin", "cache": "tes-admin-v16"},
  "lessons": {"dir": os.path.join(OUT, "lessons", "docs"), "extra": ["a", "ocr"], "title": "Patriot Pilot Academy · IFR Lessons",
              "short": "PPA IFR", "name": "Patriot Pilot Academy IFR Lessons", "cache": "tes-lessons-v16"},
}
def cp(rel, dst):
    s = os.path.join(SRC, rel); d = os.path.join(dst, rel)
    if os.path.isdir(s): shutil.copytree(s, d, dirs_exist_ok=True)
    elif os.path.exists(s): os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copy2(s, d)
def build(kind):
    c = CFG[kind]; dst = c["dir"]
    if os.path.isdir(dst): shutil.rmtree(dst)
    os.makedirs(dst)
    for rel in COMMON + c["extra"]: cp(rel, dst)
    html = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
    flag = '<script>window.TES_BUILD="%s";window.TES_LESSONS_URL=%s;</script>' % (kind, json.dumps(LESSONS_URL))
    assert html.count("<head>") == 1
    html = html.replace("<head>", "<head>\n" + flag, 1)
    html = re.sub(r"<title>[^<]*</title>", "<title>%s</title>" % c["title"], html, count=1)
    h1 = {"admin": "Patriot Pilot Academy · School Admin", "lessons": "Patriot Pilot Academy · IFR Lessons"}[kind]
    assert html.count("<h1>Patriot Pilot Academy · IFR Ground School</h1>") == 1
    html = html.replace("<h1>Patriot Pilot Academy · IFR Ground School</h1>", "<h1>%s</h1>" % h1, 1)
    html = html.replace('content="PPA IFR"', 'content="%s"' % c["short"], 1)
    open(os.path.join(dst, "index.html"), "w", encoding="utf-8").write(html)
    man = json.load(open(os.path.join(SRC, "manifest.webmanifest")))
    man.update({"name": c["name"], "short_name": c["short"]})
    json.dump(man, open(os.path.join(dst, "manifest.webmanifest"), "w"))
    sw = open(os.path.join(SRC, "sw.js")).read()
    sw = re.sub(r"const C='[^']*'", "const C='%s'" % c["cache"], sw, count=1)
    if kind == "admin":   # the admin portal has no narration audio or on-device OCR
        sw = sw.replace("fetch('./a/index.json')", "Promise.reject('no audio in admin build')")
    open(os.path.join(dst, "sw.js"), "w").write(sw)
    open(os.path.join(dst, ".nojekyll"), "w").write("")
    # every precached file must exist, or the service worker will not install
    for f in re.findall(r"'\./([^']+)'", sw.split("addAll([")[1].split("])")[0]):
        assert os.path.exists(os.path.join(dst, f)), (kind, f)
    n = sum(len(fs) for _, _, fs in os.walk(dst))
    print(kind, dst, n, "files")
for k in ("admin", "lessons"): build(k)
# iOS wrapper project sits next to the lessons web build (its folder reference is ../docs)
shutil.copytree(os.path.join(SRC, "tools", "ios"), os.path.join(OUT, "lessons", "ios"), dirs_exist_ok=True)
shutil.copy2(os.path.join(SRC, "docs", "DATA-MODEL-v16.md"), os.path.join(OUT, "lessons", "DATA-MODEL-v16.md"))
shutil.copy2(os.path.join(SRC, "docs", "DATA-MODEL-v16.md"), os.path.join(OUT, "admin", "DATA-MODEL-v16.md"))
