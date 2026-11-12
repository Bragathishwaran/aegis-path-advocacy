import glob

files = glob.glob("*.html")
for f in files:
    s = open(f, encoding="utf-8").read()
    orig = s
    s = s.replace("\u2212", "-")
    open(f, "w", encoding="utf-8").write(s)
    if s != orig:
        print("updated", f)