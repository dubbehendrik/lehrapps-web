"""Generate fixture from frozen, unmodified Python reference; requires numpy/scipy."""
import sys,json,itertools
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'docs/hx-diagramm'))
from thermo import solve,process_target,process_path,KEYS,HEAT,COOL,ISOTHERM,ISENTHALP
states=[]
for t,phi,p in [(20,50,950),(30,60,1013.25),(-10,80,950),(0,50,900),(40,20,1100),(-15,100,950),(40,20,500),(20,0,1200)]:
 s=solve(('T','phi'),(t,phi),p)
 for pair in itertools.combinations(KEYS,2):
  values=[s.values()[k] for k in pair]
  try:r=solve(pair,values,p).values();error=None
  except ValueError as e:r=None;error=str(e)
  states.append(dict(pair=pair,values=values,p=p,state=r,error=error))
processes=[]
for t,phi,p,kind,goal in [(30,60,950,COOL,10),(-10,80,950,HEAT,30),(30,10,950,ISENTHALP,6),(20,50,950,ISOTHERM,5),(0,10,950,COOL,-10)]:
 a=solve(('T','phi'),(t,phi),p);b=process_target(a,kind,goal,p);path,water=process_path(a,b,kind,p)
 processes.append(dict(start=a.values(),end=b.values(),kind=kind,p=p,goal=goal,path=[s.values() for s in path],water=water))
(root/'tests/hx-references.json').write_text(json.dumps(dict(states=states,processes=processes),ensure_ascii=False,indent=2)+'\n')
