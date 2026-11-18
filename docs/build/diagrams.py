"""Build an ER diagram and data dictionary directly from the Flyway SQL files."""
from pathlib import Path
import html
import re
import subprocess

root = Path(__file__).resolve().parents[2]
out = root / "docs/diagrams"
out.mkdir(exist_ok=True)
sql = "\n".join(p.read_text() for p in sorted((root / "backend/src/main/resources/db/migration").glob("*.sql")))
tables = {}
edges = []
for name, body in re.findall(r"CREATE TABLE (\w+) \((.*?)\) ENGINE", sql, re.S):
    columns = []
    fks = {c: (t, tc) for c, t, tc in re.findall(r"FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\)", body)}
    composite = re.search(r"PRIMARY KEY \(([^)]+)\)", body)
    primary = composite.group(1).replace(" ", "").split(",") if composite else ["id"]
    for line in body.splitlines():
        m = re.match(r"\s*(\w+)\s+(BIGINT|VARCHAR\(\d+\)|DECIMAL\(\d+,\s*\d+\)|INT|BOOLEAN|TIMESTAMP\(\d+\)|DATE)(.*)", line)
        if not m:
            continue
        col, typ, rest = m.groups()
        required = "NOT NULL" in rest or col in primary
        columns.append((col, typ, required, col in primary, col in fks))
        if col in fks:
            parent, parent_col = fks[col]
            action = re.search(r"FOREIGN KEY \(" + col + r"\)[^\n]*?(ON DELETE (?:CASCADE|SET NULL))", body)
            edges.append((parent, name, col, required, action.group(1) if action else "RESTRICT"))
    tables[name] = columns

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
