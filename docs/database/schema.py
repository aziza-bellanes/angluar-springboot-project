"""Physical schema parsed from ordered Flyway CREATE and ALTER statements."""
from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[2]
files=sorted((ROOT/'backend/src/main/resources/db/migration').glob('V*__*.sql'), key=lambda p: int(re.match(r'V(\d+)',p.name).group(1)))
sql='\n'.join(p.read_text() for p in files)
tables=[]; fks=[]; checks=[]; uniques=[]
for m in re.finditer(r'CREATE TABLE (\w+) \((.*?)\n\) ENGINE',sql,re.S):
 name,body=m.groups(); cols=[]; constraints=[]; pk=[]
 for raw in body.splitlines():
  s=raw.strip().rstrip(',')
  if not s: continue
  if s.startswith(('CONSTRAINT','PRIMARY KEY')):
   constraints.append(s)
   if s.startswith('PRIMARY KEY'): pk=re.search(r'\(([^)]+)\)',s).group(1).split(', ')
   fm=re.search(r'CONSTRAINT (\w+) FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\)(?: ON DELETE (CASCADE|SET NULL|RESTRICT))?',s)
   if fm:
    cname,col,parent,pcol,delete=fm.groups(); fks.append(dict(name=cname,child=name,col=col,parent=parent,pcol=pcol,delete=delete or 'RESTRICT'))
   if ' CHECK ' in s: checks.append((name,s))
   if ' UNIQUE ' in s: uniques.append((name,s))
  else:
   cm=re.match(r'(\w+)\s+([A-Z]+(?:\([^)]*\))?)(.*)',s); col,typ,rest=cm.groups()
   if 'PRIMARY KEY' in rest: pk.append(col)
   dm=re.search(r'DEFAULT (CURRENT_TIMESTAMP\(6\)|TRUE|0|\x27[^\x27]+\x27)',rest)
   cols.append(dict(name=col,type=typ,nullable='NOT NULL' not in rest and 'PRIMARY KEY' not in rest,default=dm.group(1) if dm else ('AUTO_INCREMENT' if 'AUTO_INCREMENT' in rest else '-')))
 for c in cols:
  c['key']=' + '.join(filter(None,['PK' if c['name'] in pk else '', 'FK' if any(f['child']==name and f['col']==c['name'] for f in fks) else '', 'UQ' if any(t==name and re.search(r'\('+re.escape(c['name'])+r'\)',s) for t,s in uniques) else ''])) or '-'
 tables.append(dict(name=name,columns=cols,constraints=constraints,pk=pk))

# Apply schema ALTER statements in migration order. Data UPDATEs do not change the dictionary.
# Split only at top-level commas so DECIMAL(14,2) and CHECK expressions stay intact.
def clauses(body):
 depth=0; quote=False; start=0
 for i,ch in enumerate(body):
  if ch=="'": quote=not quote
  if not quote:
   if ch=='(': depth+=1
   elif ch==')': depth-=1
   elif ch==',' and depth==0:
    yield body[start:i].strip(); start=i+1
 yield body[start:].strip()

def column(definition):
 m=re.fullmatch(r'(\w+)\s+([A-Z]+(?:\([^)]*\))?)(.*)',definition.strip(),re.S)
 if not m: raise ValueError('Unsupported column DDL: '+definition)
 name,typ,rest=m.groups()
 dm=re.search(r"DEFAULT\s+(CURRENT_TIMESTAMP\(6\)|TRUE|FALSE|NULL|[-\d.]+|'[^']*')",rest)
 return dict(name=name,type=typ,nullable='NOT NULL' not in rest and 'PRIMARY KEY' not in rest,default=dm.group(1) if dm else ('AUTO_INCREMENT' if 'AUTO_INCREMENT' in rest else '-'))

for match in re.finditer(r'ALTER TABLE (\w+)\s+(.*?);',sql,re.S):
 name,body=match.groups(); target=next(t for t in tables if t['name']==name)
 for clause in clauses(body):
  m=re.match(r'(ADD|MODIFY) COLUMN\s+(.*)',clause,re.S)
  if m:
   action,definition=m.groups(); c=column(definition)
   if action=='ADD': target['columns'].append(c)
   else:
    i=next(i for i,old in enumerate(target['columns']) if old['name']==c['name']); target['columns'][i]=c
  elif clause.startswith('ADD CONSTRAINT '):
   constraint=clause.removeprefix('ADD ');target['constraints'].append(constraint)
   if ' UNIQUE ' in constraint: uniques.append((name,constraint))
   elif ' CHECK ' in constraint: checks.append((name,constraint))
   else: raise ValueError('Unsupported ALTER constraint: '+constraint)
  else: raise ValueError('Unsupported ALTER clause: '+clause)
# Recompute column key markers after ALTERs add unique constraints.
for t in tables:
 for c in t['columns']:
  c['key']=' + '.join(filter(None,['PK' if c['name'] in t['pk'] else '', 'FK' if any(f['child']==t['name'] and f['col']==c['name'] for f in fks) else '', 'UQ' if any(tt==t['name'] and re.search(r'\('+re.escape(c['name'])+r'\)',constraint) for tt,constraint in uniques) else ''])) or '-'

indexes=[dict(name=m[0],table=m[1],columns=m[2]) for m in re.findall(r'CREATE INDEX (\w+) ON (\w+) \(([^)]+)\)',sql)]
for f in fks:
 f['optional']=next(c['nullable'] for t in tables if t['name']==f['child'] for c in t['columns'] if c['name']==f['col'])
