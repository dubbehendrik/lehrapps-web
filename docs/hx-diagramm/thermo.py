"""Moist-air model. Public units: °C, g/kg dry air, %, kg/m³, kJ/kg dry air, hPa.

ASHRAE 2017 / PsychroLib ideal-mixture relationships. Saturation always refers
to LIQUID water. Below 0 °C: Murphy & Koop (2005), eq. 10, joined continuously
to ASHRAE at 0 °C. No ice, liquid carryover, enhancement factor or coil model.
"""
from dataclasses import dataclass, asdict
from math import exp, log, tanh, isfinite
from itertools import combinations
import numpy as np
from scipy.optimize import brentq

T_MIN, T_MAX, X_MAX = -15.0, 40.0, 20.0
KEYS = ("T", "x", "phi", "rho", "h")
LABELS = {"T": "T · Temperatur [°C]", "x": "x · Wasserbeladung [g/kg tr. Luft]",
          "phi": "φ · Relative Feuchte [%]", "rho": "ρ · Dichte [kg/m³]",
          "h": "h · Enthalpie [kJ/kg tr. Luft]"}
PAIRS = list(combinations(KEYS, 2))
HEAT = "Erwärmen · x konstant"
COOL = "Kühlen · ggf. Kondensatabscheidung"
ISOTHERM = "Isotherme Be-/Entfeuchtung"
ISENTHALP = "Isenthalpe Befeuchtung (Näherung)"
FREE = "Freie Verbindung (kein Prozessmodell)"
PROCESSES = [FREE, HEAT, COOL, ISOTHERM, ISENTHALP]


def _ashrae_water(t):
    k = t + 273.15
    return exp(-5800.2206/k + 1.3914993 - .048640239*k + .000041764768*k*k
               - .000000014452093*k**3 + 6.5459673*log(k))


def _murphy_water(t):
    k = t + 273.15
    return exp(54.842763 - 6763.22/k - 4.210*log(k) + .000367*k
               + tanh(.0415*(k-218.8))*(53.878-1331.22/k-9.44523*log(k)+.014025*k))


def saturation_pressure(t):
    """Pa, water reference; valid here -100 to 80 °C."""
    if not isfinite(t) or not -100 <= t <= 80:
        raise ValueError("Temperatur außerhalb des Rechenbereichs −100 bis 80 °C.")
    if t >= 0:
        return _ashrae_water(t)
    return _murphy_water(t) * _ashrae_water(0) / _murphy_water(0)


def check_pressure(p):
    if not isfinite(p) or not 500 <= p <= 1200:
        raise ValueError("Der Luftdruck muss zwischen 500 und 1200 hPa liegen.")


def saturation_x(t, p):
    pv = saturation_pressure(t)
    if pv >= p*100:
        raise ValueError("Sättigungsdampfdruck muss kleiner als der Gesamtdruck sein.")
    return 1000 * .621945 * pv / (p*100-pv)


def properties(t, x, p):
    """Algebraic properties; may describe supersaturation for solver residuals."""
    w = x / 1000
    pv = p*100*w/(.621945+w)
    return {"T": t, "x": x, "phi": 100*pv/saturation_pressure(t),
            "h": 1.006*t+w*(2501+1.86*t),
            "rho": p*100*(1+w)/(287.042*(t+273.15)*(1+1.607858*w))}


@dataclass(frozen=True)
class State:
    T: float
    x: float
    phi: float
    rho: float
    h: float
    dew: float | None

    def values(self):
        return asdict(self)


def state(t, x, p=950, chart=True):
    check_pressure(p)
    if not all(isfinite(v) for v in [t, x]) or x < -1e-8:
        raise ValueError("Temperatur und Wasserbeladung müssen gültig sein; x darf nicht negativ sein.")
    if chart and not (T_MIN-1e-7 <= t <= T_MAX+1e-7 and x <= X_MAX+1e-7):
        raise ValueError("Der Zustand liegt außerhalb des festen Diagramms (−15 bis 40 °C, 0 bis 20 g/kg).")
    x = max(0.0, x)
    v = properties(t, x, p)
    if v["phi"] > 100 + 1e-5:
        raise ValueError("Dieser Zustand liegt jenseits der Sättigungslinie (φ > 100 %). Für Kühlung bitte einen Prozess mit Zieltemperatur anlegen.")
    v["phi"] = min(100., max(0., v["phi"]))
    pv = p*100*(x/1000)/(.621945+x/1000)
    dew = None if pv < saturation_pressure(-100) else brentq(lambda a: saturation_pressure(a)-pv, -100, 80)
    return State(**v, dew=dew)


def x_from(t, key, value, p):
    if key == "x":
        return value
    if key == "phi":
        pv = value/100*saturation_pressure(t)
        return 1000*.621945*pv/(p*100-pv)
    if key == "h":
        return 1000*(value-1.006*t)/(2501+1.86*t)
    if key == "rho":
        a = value*287.042*(t+273.15)/(p*100)
        return 1000*(1-a)/(1.607858*a-1)
    raise ValueError("Unbekannte Zustandsgröße.")


def solve(pair, values, p=950):
    """Solve any independent pair within the chart, rejecting ambiguity."""
    check_pressure(p)
    a, b = pair
    va, vb = map(float, values)
    if a == b or a not in KEYS or b not in KEYS or not all(map(isfinite, [va, vb])):
        raise ValueError("Bitte zwei unterschiedliche Größen mit endlichen Zahlen vorgeben.")
    given = {a: va, b: vb}
    if "phi" in given and not 0 <= given["phi"] <= 100:
        raise ValueError("Die relative Feuchte muss zwischen 0 und 100 % liegen.")
    if "x" in given and given["x"] < 0:
        raise ValueError("Die Wasserbeladung darf nicht negativ sein.")
    if "rho" in given and given["rho"] <= 0:
        raise ValueError("Die Dichte muss positiv sein.")
    if "T" in given:
        other = b if a == "T" else a
        return state(given["T"], x_from(given["T"], other, given[other], p), p)
    if set(pair) == {"x", "phi"} and (given["x"] == 0 or given["phi"] == 0):
        raise ValueError("x = 0 und φ = 0 bestimmen keine Temperatur. Bitte eine andere Größenkombination wählen.")
    def residual(t):
        x = x_from(t, a, va, p)
        return properties(t, x, p)[b]-vb
    grid = np.linspace(T_MIN, T_MAX, 441)
    roots = []
    for lo, hi in zip(grid[:-1], grid[1:]):
        try:
            f0, f1 = residual(lo), residual(hi)
            if abs(f0) < 1e-10:
                roots.append(lo)
            if f0*f1 < 0:
                roots.append(brentq(residual, lo, hi, xtol=1e-11))
            if hi == T_MAX and abs(f1) < 1e-10:
                roots.append(hi)
        except (ValueError, ZeroDivisionError, OverflowError):
            continue
    candidates = []
    for t in roots:
        try:
            s = state(t, x_from(t, a, va, p), p)
            if abs(s.values()[b]-vb) > 1e-6*max(1, abs(vb)):
                continue  # Discontinuous residual / pole is not a root.
            if not any(abs(s.T-c.T) < 1e-5 for c in candidates):
                candidates.append(s)
        except ValueError:
            continue
    if not candidates:
        raise ValueError("Für diese beiden Werte gibt es keinen zulässigen Zustand im festen Diagrammbereich.")
    if len(candidates) != 1:
        raise ValueError("Diese Kombination ist nicht eindeutig. Bitte z. B. T und φ vorgeben.")
    return candidates[0]


def process_target(start, kind, target, p):
    """Target is T for heating/cooling, x for iso-T/iso-h."""
    if kind == HEAT:
        if target < start.T-1e-8:
            raise ValueError("Beim Erwärmen muss die Zieltemperatur mindestens der Starttemperatur entsprechen.")
        return state(target, start.x, p)
    if kind == COOL:
        if target > start.T+1e-8:
            raise ValueError("Beim Kühlen darf die Zieltemperatur nicht höher als die Starttemperatur sein.")
        x = min(start.x, saturation_x(target, p))
        if target < 0 and x < start.x-1e-7:
            raise ValueError("Wasserabscheidung unter 0 °C erfordert ein Vereisungsmodell und wird hier nicht berechnet.")
        return state(target, x, p)
    if kind == ISOTHERM:
        return state(start.T, target, p)
    if kind == ISENTHALP:
        if target < start.x-1e-8:
            raise ValueError("Bei der Befeuchtung muss die Wasserbeladung zunehmen.")
        return state((start.h-2501*target/1000)/(1.006+1.86*target/1000), target, p)
    raise ValueError("Eine freie Verbindung benötigt zwei vorgegebene Zustände.")


def process_path(start, end, kind, p):
    """Return coordinate states + separated water in g/kg dry air."""
    if kind == FREE:
        return [start, end], None
    goal = end.T if kind in (HEAT, COOL) else end.x
    expected = process_target(start, kind, goal, p)
    if abs(expected.T-end.T) > .005 or abs(expected.x-end.x) > .005:
        raise ValueError("Endpunkte passen nicht zur Prozessart. Zielpunkt neu berechnen oder eine andere Prozessart wählen.")
    if kind in (HEAT, COOL):
        ts = list(np.linspace(start.T, end.T, 101))
        if kind == COOL and start.dew is not None and end.T < start.dew < start.T:
            ts.append(start.dew)
            ts.sort(reverse=True)
        points = [process_target(start, kind, float(t), p) for t in ts]
    else:
        points = [process_target(start, kind, float(x), p) for x in np.linspace(start.x, end.x, 101)]
    return points, max(0.0, start.x-end.x) if kind == COOL else None


def compatible(start, end, p):
    result = [FREE]
    for kind in PROCESSES[1:]:
        try:
            process_path(start, end, kind, p)
            result.append(kind)
        except ValueError:
            pass
    return result


def diagram_y(t, x):
    """Shear h by latent heat: y = h - 2501*w, scaled by dry-air cp."""
    return t*(1.006+1.86*x/1000)/1.006


def diagram_temperature(y, x):
    return y*1.006/(1.006+1.86*x/1000)
