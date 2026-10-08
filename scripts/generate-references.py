"""Execute the unchanged upstream script with a headless Streamlit adapter.
The adapter exercises number/slider callbacks and captures actual ndtr calls.
Requires numpy, scipy, matplotlib; never contacts or writes upstream GitHub.
"""
import json, sys, types, pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import scipy.special
import numpy as np
root = pathlib.Path(__file__).resolve().parents[1]
class State(dict):
    def __getattr__(self, key): return self[key]
    def __setattr__(self, key, value): self[key] = value
class Context:
    def __enter__(self): return self
    def __exit__(self, *args): return False
original_ndtr = scipy.special.ndtr
results = []
for a, b in [(-1.96,1.96),(-1,1),(0,1),(-6,6),(-6,0),(0,6),(0,0),(2,2),(1,1.01),(5.99,6),(-6,-5.99)]:
    for mode in ['number', 'slider']:
        st = types.ModuleType('streamlit')
        st.session_state = State(a_input=a, b_input=b)
        calls = []
        def capture(x):
            value = original_ndtr(x)
            if np.isscalar(x): calls.append(float(value))
            return value
        def number_input(*args, **kwargs):
            if mode == 'number': kwargs['on_change']()
        def slider(*args, **kwargs):
            st.session_state.slider_vals = (a,b)
            if mode == 'slider': kwargs['on_change']()
        st.number_input = number_input
        st.slider = slider
        st.columns = lambda *args, **kwargs: [Context(),Context()]
        st.expander = lambda *args, **kwargs: Context()
        for name in ['set_page_config','image','title','markdown','pyplot','latex','subheader']:
            setattr(st,name,lambda *args, **kwargs: None)
        sys.modules['streamlit'] = st
        scipy.special.ndtr = capture
        scope = {}
        exec(compile((root/'docs/streamlit-reference.py').read_text(), 'streamlit-reference.py','exec'),scope)
        assert st.session_state.a == a and st.session_state.b == b
        results.append({'a':a,'b':b,'mode':mode,'cdfA':calls[-2],'cdfB':calls[-1], 'probability': float(scope['prob'])})
        plt.close('all')
scipy.special.ndtr = original_ndtr
(root/'tests/references.json').write_text(json.dumps(results,indent=2)+'\n')
print(f'{len(results)} reference cases executed from unchanged Python source.')
