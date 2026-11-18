"""Build an ER diagram and data dictionary directly from the Flyway SQL files."""
from pathlib import Path
import html
import re
import subprocess

root = Path(__file__).resolve().parents[2]
out = root / "docs/diagrams"
out.mkdir(exist_ok=True)
import sys
sys.path.insert(0,str(root / 'docs/database'))
from schema import tables as schema_tables, fks
tables={t['name']:[(c['name'],c['type'],not c['nullable'],c['name'] in t['pk'],any(f['child']==t['name'] and f['col']==c['name'] for f in fks)) for c in t['columns']] for t in schema_tables}
edges=[(f['parent'],f['child'],f['col'],not f['optional'],f['delete']) for f in fks]

def dot_for(names, audit=True):
    lines = ['digraph Database {', 'graph [rankdir=LR, bgcolor="white", nodesep=0.5, ranksep=1.0, pad=0.3, splines=polyline];',
             'node [shape=plain, fontname="DejaVu Sans"];', 'edge [fontname="DejaVu Sans", fontsize=10, color="#315c91"];']
    for name in names:
        rows = ''.join(f'<TR><TD ALIGN="LEFT">{("PK " if pk else "") + ("FK " if fk else "")}{html.escape(col)}</TD><TD ALIGN="LEFT">{html.escape(typ)}{("" if required else " ?")}</TD></TR>' for col, typ, required, pk, fk in tables[name])
        lines.append(f'{name} [label=<<TABLE BORDER="1" COLOR="#b5c5cc" CELLBORDER="0" CELLSPACING="0" CELLPADDING="5"><TR><TD COLSPAN="2" BGCOLOR="#101d35"><FONT COLOR="#f4edde"><B>{name}</B></FONT></TD></TR>{rows}</TABLE>>];')
    for parent, child, col, required, action in edges:
        if parent not in names or child not in names or (not audit and col == "created_by_id"):
            continue
        color = "#315c91" if col != "created_by_id" else "#a2b3b8"
        lines.append(f'{parent} -> {child} [dir=none, taillabel="{("1" if required else "0..1")}", headlabel="0..*", label="{col}", color="{color}"];')
    return '\n'.join(lines + ['}'])

for stem, names, audit in [("database", list(tables), True), ("cdc", ["users", "roles", "user_roles", "artists", "exhibitions"], False)]:
    source = out / f"{stem}.dot"
    source.write_text(dot_for(names, audit))
    for fmt in ["svg", "png"]:
        subprocess.run(["dot", f"-T{fmt}", "-Gdpi=160", str(source), "-o", str(out / f"{stem}.{fmt}")], check=True)

print(f'{len(tables)} application tables, {len(edges)} foreign keys')
