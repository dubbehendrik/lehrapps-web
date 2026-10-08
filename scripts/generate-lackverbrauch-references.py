"""Regenerate TypeScript comparison fixtures from the frozen original Python model."""
import importlib.util
import json
from pathlib import Path
import random
root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference', root / 'docs/lackverbrauchsrechnung/model-reference.py')
model = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model)
random.seed(42)
cases = []
for method in model.METHODS:
    for plan in model.PLANS:
        for period in model.PERIODS:
            for _ in range(3):
                p = {**model.DEFAULTS, 'method': method, 'plan': plan, 'period': period,
                     'area': random.uniform(.01, 10), 'thickness': random.uniform(1, 200),
                     'epsilon': random.uniform(10, 100), 'phi': random.uniform(10, 100),
                     'mng': random.uniform(5, 100), 'pause': 0, 'target': 100,
                     'price': random.uniform(0, 50)}
                cases.append({'params': p, 'result': model.calculate(p)})
cases.append({'params': model.DEFAULTS, 'result': model.calculate(model.DEFAULTS)})
(root / 'tests/lackverbrauch-references.json').write_text(json.dumps(cases, ensure_ascii=False, indent=2))
