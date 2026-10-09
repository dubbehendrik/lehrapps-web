"""Independent nodal finite-volume reference for 1-D Robin slabs.
Dimensionless full-length coordinate s in [0,1], time Fo=a*t/D².
Crank-Nicolson with half control volumes at the two surfaces.
Run: python docs/waermeleitung/reference.py > docs/waermeleitung/reference.json
Requires numpy and scipy; no production/runtime Python dependency.
"""
import json
import numpy as np
from scipy.linalg import solve_banded

def reference(b0,b1,time,n=401,dt=1e-5):
    dx=1/(n-1)
    mass=np.full(n,dx);mass[[0,-1]]=dx/2
    diagonal=np.full(n,2/dx);diagonal[0]=1/dx+b0;diagonal[-1]=1/dx+b1
    steps=round(time/dt);dt=time/steps
    band=np.zeros((3,n));band[1]=mass+dt/2*diagonal
    band[0,1:]=-dt/(2*dx);band[2,:-1]=-dt/(2*dx)
    value=np.ones(n)
    for _ in range(steps):
        rhs=(mass-dt/2*diagonal)*value
        rhs[:-1]+=dt/(2*dx)*value[1:];rhs[1:]+=dt/(2*dx)*value[:-1]
        value=solve_banded((1,1),band,rhs,check_finite=False)
    return [float(value[round(s*(n-1))]) for s in [0,.25,.5,.75,1]]

cases=[]
for b0,b1,t in [(.7,4,.03),(.7,4,.1),(.7,4,.3),(0,1,.3),(2,2,.25)]:
    cases.append(dict(b0=b0,b1=b1,fo=t,positions=[0,.25,.5,.75,1],temperatureFactors=reference(b0,b1,t)))
print(json.dumps(dict(method='Independent finite volume / Crank-Nicolson',nodes=401,timeStep=1e-5,cases=cases),indent=2))
