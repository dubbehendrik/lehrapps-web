"""Independent SciPy reference: original Streamlit formulas, upstream data.
Run from repository root; requires numpy, scipy, pandas, openpyxl.
"""
import json
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.interpolate import UnivariateSpline, interp1d
import scipy

root = Path(__file__).resolve().parents[1]
examples=[]
cases=[]
for name in ['ideal','real1','real2']:
    file=f'Exp_Strahlbreite_Profil_{name}.xlsx'
    df=pd.read_excel(root/'public'/'strahlbreite'/file).iloc[:,:2].dropna()
    raw_x,raw_y=df.iloc[:,0].to_numpy(),df.iloc[:,1].to_numpy()
    points=[dict(position=float(x),thickness=float(y)) for x,y in zip(raw_x,raw_y)]
    examples.append(dict(name=name,file=file,points=points))
    for s in [0,0.5,5,20]:
        x=np.arange(raw_x.min(),raw_x.max(),1.0)
        spline=UnivariateSpline(raw_x,raw_y,s=s)
        y=spline(x)
        edge=(raw_x.max()-raw_x.min())*0.1
        envelope=np.ones_like(x)
        left=x<raw_x.min()+edge;right=x>raw_x.max()-edge
        envelope[left]=0.5*(1-np.cos(np.pi*(x[left]-raw_x.min())/edge))
        envelope[right]=0.5*(1-np.cos(np.pi*(raw_x.max()-x[right])/edge))
        y*=envelope
        indices=np.where(y>=y.max()/2)[0]
        width=float(x[indices[-1]]-x[indices[0]])
        for tracks,factor in [(15,2),(15,3),(1,2),(100,2)]:
            spacing=width/factor
            tx=np.arange(x.min(),x.max()+(tracks-1)*spacing,1.)
            ty=np.zeros_like(tx)
            for i in range(tracks):
                ty+=interp1d(x+i*spacing,y,bounds_error=False,fill_value=0)(tx)
            cases.append(dict(name=name,smoothing=s,tracks=tracks,spacing=spacing,
                maximum=float(y.max()),halfWidth=width,profileY=y.tolist(),
                totalMaximum=float(ty.max()),automaticThickness=float(np.mean(ty[ty>=0.95*ty.max()])),
                totalSamples=[dict(index=int(i),x=float(tx[i]),y=float(ty[i])) for i in np.linspace(0,len(tx)-1,31,dtype=int)],totalCount=len(tx)))
(root/'src/apps/strahlbreite/examples.json').write_text(json.dumps(examples,indent=2)+'\n')
(root/'tests/strahlbreite-references.json').write_text(json.dumps(dict(scipyVersion=scipy.__version__,cases=cases),indent=2)+'\n')
print(f'{len(cases)} reference cases generated')
# Additional independent spline checks for arbitrary uploaded data, including
# cases requiring the maximum knot count, shifted and nonuniform coordinates.
rng=np.random.default_rng(42)
spline_cases=[]
for count in [4,5,8,12,31,70]:
    x=np.cumsum(rng.uniform(0.2,10,count))-30
    y=rng.uniform(0,10,count)
    for s in [0,0.001,0.5,5,20]:
        spline=UnivariateSpline(x,y,s=s)
        sample=np.linspace(x[0],x[-1],101)
        spline_cases.append(dict(x=x.tolist(),y=y.tolist(),smoothing=s,sampleX=sample.tolist(),sampleY=spline(sample).tolist(),residual=spline.get_residual()))
(root/'tests/strahlbreite-spline-references.json').write_text(json.dumps(spline_cases,indent=2)+'\n')
