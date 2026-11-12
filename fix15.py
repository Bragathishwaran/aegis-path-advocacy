import glob, re

files = glob.glob("*.html")
for f in files:
    s = open(f, encoding="utf-8").read()
    orig = s
    # Remove RTL/LTR icon SVGs
    s = re.sub(r'\s*<svg data-icon-rtl[^>]*>.*?</svg>', '', s, flags=re.S)
    s = re.sub(r'\s*<svg data-icon-ltr[^>]*>.*?</svg>', '', s, flags=re.S)
    # Make the dir label visible text instead of sr-only/visually-hidden
    s = s.replace('<span data-dir-label class="sr-only">RTL</span>', '<span data-dir-label class="text-xs font-semibold">RTL</span>')
    s = s.replace('<span data-dir-label class="visually-hidden">RTL</span>', '<span data-dir-label class="text-xs font-semibold">RTL</span>')
    open(f, "w", encoding="utf-8").write(s)
    if s != orig:
        print("updated", f)