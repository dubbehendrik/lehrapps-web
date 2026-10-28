"""Positive smooth inverse projection, reproducible from extracted vector curves.
Run: python scripts/reconstruct-spray.py (numpy, scipy required).
No CFD or atomization calculation. A single radial kernel is assumed; fit error is
an in-sample reconstruction error, NOT an experimental predictive uncertainty.
"""
from pathlib import Path
import json
import numpy as np
from scipy.optimize import nnls
root=Path(__file__).resolve().parents[1]
source=json.loads((root/'docs/roboter-bahnplanung/data/single-pass.json').read_text())
x=np.arange(-400,401,5.)
r=np.arange(0,501,2.)
centres=np.arange(0,401,10.)
width=12.
def basis(radius):
    # Smooth, nonnegative radial basis, reflected at r=0 for zero radial derivative.
    return np.exp(-.5*((radius[...,None]-centres)/width)**2)+np.exp(-.5*((radius[...,None]+centres)/width)**2)
# Forward line integral in mm / reference speed (150 mm/s).
t=np.arange(-500,501,2.)
A=np.trapezoid(basis(np.hypot(x[:,None],t[None,:])),t,axis=1)/150
D=np.diff(np.eye(len(centres)),n=2,axis=0)
curves={}
for name,entry in source['curves'].items():
    raw=np.array(entry['xMm_yMicrometre']); raw=raw[np.argsort(raw[:,0])]
    observed=np.interp(x,raw[:,0],raw[:,1]); symmetric=(observed+observed[::-1])/2
    # Smoothness suppresses amplification of digitization noise; weak outer-tail penalty.
    coeff,_=nnls(np.vstack([A, .15*D, .02*np.eye(len(centres))]),np.r_[symmetric,np.zeros(len(D)+len(centres))])
    rates=basis(r)@coeff; fitted=A@coeff
    integral=float(np.trapezoid(2*np.pi*r*rates,r))
    wmape=float(np.sum(abs(fitted-symmetric))/np.sum(symmetric)*100)
    curves[name]={'radialRate':np.round(rates,8).tolist(),'integral':integral,'wmapePercent':wmape,'forward':np.round(fitted,5).tolist(),'observedSymmetric':np.round(symmetric,5).tolist()}
# 1 ml=1000 mm³; h in µm contributes 1000 µm/mm.
dry_rate=250*1000/60*.57
eta=curves['measured']['integral']/1000/dry_rate
assert 0<eta<1
out={'stepMm':2,'supportMm':500,'xMm':x.tolist(),'etaReference':eta,'curves':curves,'method':{'basisSpacingMm':10,'basisSigmaMm':12,'regularization':.15,'ridge':.02,'referenceSpeedMmS':150,'referenceFlowMlMin':250,'referenceSolids':.57,'boundary':'Gaussian tails resolved to 500 mm; source observed only within ±400 mm. No claim on unobserved tails.'}}
(root/'src/apps/roboter-bahnplanung/spray-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
for k,v in curves.items(): print(k,'wMAPE',round(v['wmapePercent'],2))
print('Reference eta',eta,'peak rate',max(curves['measured']['radialRate']))
