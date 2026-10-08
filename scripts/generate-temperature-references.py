import json
import numpy as np
from scipy.optimize import curve_fit
from openpyxl import load_workbook
from pathlib import Path
cases=[]
for name in ['ideal','real']:
 rows=list(load_workbook(f'public/temperaturprofil/Exp_Temperaturprofil_{name}.xlsx',data_only=True).active.values)
 points=np.array([(r[0],r[1]) for r in rows[1:] if isinstance(r[0],(float,int)) and isinstance(r[1],(float,int))])
 cp,A,m,T0,Tinf=[rows[i][5] for i in range(1,6)]
 p=dict(alpha=10,cp=cp,area=A,mass=m,referenceTime=0,referenceTemperature=T0,ambientTemperature=Tinf,endTime=max(600,float(points[:,0].max())),step=1)
 for start,end in [(float(points[:,0].min()),float(points[:,0].max())),(float(points[:,0].min()),float(points[:,0].max()/2))]:
  cut=points[(points[:,0]>=start)&(points[:,0]<=end)]
  model=lambda t,alpha:Tinf-(Tinf-T0)*np.exp(-alpha*A*t/(m*cp))
  alpha=float(curve_fit(model,cut[:,0],cut[:,1],p0=[10],bounds=(0,np.inf))[0][0])
  residual=cut[:,1]-model(cut[:,0],alpha)
  cases.append(dict(name=name,params=p,points=points.tolist(),start=start,end=end,alpha=alpha,rmse=float(np.sqrt(np.mean(residual**2))),r2=float(1-np.sum(residual**2)/np.sum((cut[:,1]-cut[:,1].mean())**2))))
forward=[]
for alpha,T0,Tinf,ref in [(10,20,100,0),(50,180,20,10),(0,20,100,0)]:
 p=dict(alpha=alpha,cp=900,area=.1,mass=1,referenceTime=ref,referenceTemperature=T0,ambientTemperature=Tinf,endTime=600+ref,step=7)
 t=np.append(np.arange(ref,600+ref,7),600+ref)
 values=T0+(Tinf-T0)*(-np.expm1(-alpha*.1/900*(t-ref)))
 forward.append(dict(params=p,points=np.array([t,values]).T.tolist()))
Path('tests/temperature-references.json').write_text(json.dumps(dict(fits=cases,forward=forward)))
