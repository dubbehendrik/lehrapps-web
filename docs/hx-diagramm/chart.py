"""One shared drawing scene for interactive SVG and PNG export."""
from functools import lru_cache
from html import escape
from io import BytesIO
import numpy as np
from thermo import (T_MIN, T_MAX, X_MAX, saturation_x, properties, diagram_y,
                    process_path, FREE)

COLORS = {"x": "#557ee6", "T": "#67757b", "phi": "#1d333b", "h": "#df5561", "rho": "#398449"}
W, H = 800, 920
LEFT, TOP, WIDTH, HEIGHT = 65, 76, 645, 760
YMIN, YMAX = -17, 43


def pixel(x, y):
    return LEFT+x/X_MAX*WIDTH, TOP+(YMAX-y)/(YMAX-YMIN)*HEIGHT


@lru_cache(maxsize=24)
def grid(p):
    lines, labels = [], []
    def add(xs, ys, group, width=.6, text=None):
        coords = [(float(x), float(y)) for x, y in zip(xs, ys) if np.isfinite(y)]
        if coords:
            lines.append((coords, COLORS[group], width, False))
        return coords
    for x in np.arange(0, 20.01, .5):
        add([x, x], [YMIN, YMAX], "x", .55 if x % 2 == 0 else .25)
    xs = np.linspace(0, 20, 301)
    for t in range(-15, 41):
        valid = xs[xs <= saturation_x(t, p)]
        add(valid, [diagram_y(t, x) for x in valid], "T", .8 if t % 5 == 0 else .3)
    for h in range(-10, 101, 5):
        ys = (h-2.501*xs)/1.006
        valid = (ys >= YMIN) & (ys <= YMAX)
        coords = add(xs[valid], ys[valid], "h", .8 if h % 20 == 0 else .35)
        if coords and h % 20 == 0:
            # Label at saturation boundary, or right/bottom edge.
            best = min(coords, key=lambda xy: abs(properties(xy[1]*1.006/(1.006+1.86*xy[0]/1000), xy[0], p)["phi"]-110))
            labels.append((best[0], best[1]-.7, f"h = {h}", COLORS["h"], -43))
    ts = np.linspace(-15, 40, 401)
    for phi in [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100]:
        coords = []
        for t in ts:
            # Compute partial vapor pressure consistently from x_sat.
            sat = saturation_x(float(t), p)/1000
            pv = p*100*sat/(.621945+sat)*phi/100
            x = 1000*.621945*pv/(p*100-pv)
            if x <= 20:
                coords.append((x, diagram_y(t, x)))
        if coords:
            add(*zip(*coords), "phi", 1.8 if phi == 100 else .8)
            x, y = coords[-1]
            labels.append((x+.1, y+.7, f"{phi} %", COLORS["phi"], 0))
    for rho in np.arange(.95, 1.451, .05):
        coords = []
        for x in xs:
            w = x/1000
            t = p*100*(1+w)/(287.042*rho*(1+1.607858*w))-273.15
            if -15 <= t <= 40 and x <= saturation_x(t, p):
                coords.append((x, diagram_y(t, x)))
        if coords:
            add(*zip(*coords), "rho", 1.1)
            x, y = coords[0]
            labels.append((x+.12, y+.55, f"ρ = {rho:.2f}", COLORS["rho"], 0))
    return lines, labels


def scene(p, states, kinds):
    base, labels = grid(p)
    lines = list(base)
    arrows, messages = [], []
    for i in range(1, len(states)):
        a, b = states[i-1], states[i]
        if a is None or b is None:
            continue
        kind = kinds[i]
        try:
            path, _ = process_path(a, b, kind, p)
            coords = [(s.x, diagram_y(s.T, s.x)) for s in path]
            color, dashed = ("#7c8990", True) if kind == FREE else ("#007b83", False)
        except ValueError as exc:
            messages.append(f"{i} → {i+1}: {exc}")
            # Invalid selected physical processes are deliberately not drawn.
            continue
        lines.append((coords, color, 2.8, dashed))
        j = max(1, int((len(coords)-1)*.65))
        if len(coords) == 2:
            start = tuple(.55*np.array(coords[0])+.45*np.array(coords[1]))
            end = tuple(.40*np.array(coords[0])+.60*np.array(coords[1]))
        else:
            start, end = coords[max(0, j-5)], coords[j]
        arrows.append((start, end, color))
    return lines, labels, arrows, messages


def svg_chart(p, states, kinds):
    lines, labels, arrows, messages = scene(p, states, kinds)
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" role="img" aria-label="Mollier h-x-Diagramm">',
           '<defs><clipPath id="plot"><rect x="65" y="76" width="645" height="760"/></clipPath></defs>',
           f'<rect width="{W}" height="{H}" rx="12" fill="white"/>',
           '<g font-family="Arial, sans-serif">',
           '<text x="65" y="27" fill="#17343c" font-size="19" font-weight="bold">Mollier h,x-Diagramm</text>',
           f'<text x="65" y="48" fill="#67757b" font-size="12">p = {p:g} hPa · Feuchte bezogen auf Wasser</text>',
           '<g clip-path="url(#plot)">']
    for coords, color, width, dashed in lines:
        pts = " ".join(f"{a:.2f},{b:.2f}" for a, b in map(lambda q: pixel(*q), coords))
        dash = ' stroke-dasharray="7 5"' if dashed else ''
        out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}"{dash}/>')
    for a, b, color in arrows:
        aa, bb = np.array(pixel(*a)), np.array(pixel(*b))
        d = bb-aa
        length = np.linalg.norm(d)
        if length > .01:
            d /= length
            n = np.array([-d[1], d[0]])
            verts = [bb, bb-10*d+4*n, bb-10*d-4*n]
            pts = " ".join(f"{v[0]:.2f},{v[1]:.2f}" for v in verts)
            out.append(f'<polygon points="{pts}" fill="{color}"/>')
    out.append('</g>')
    for x, y, text, color, rotation in labels:
        a, b = pixel(x, y)
        out.append(f'<text x="{a:.1f}" y="{b:.1f}" transform="rotate({-rotation} {a:.1f} {b:.1f})" fill="{color}" font-size="11" stroke="white" stroke-width="3" paint-order="stroke">{escape(text)}</text>')
    for x in range(0, 21, 2):
        a, _ = pixel(x, 0)
        out.append(f'<text x="{a}" y="69" text-anchor="middle" fill="{COLORS["x"]}" font-size="12">{x}</text>')
    out.append('<text x="710" y="48" text-anchor="end" fill="#557ee6" font-size="12">x [g/kg trockene Luft]</text>')
    for t in range(-15, 41, 5):
        _, b = pixel(0, t)
        out.append(f'<text x="53" y="{b+4}" text-anchor="end" fill="#17343c" font-size="12">{t}°</text>')
    out.append('<text x="15" y="77" fill="#17343c" font-size="12">T [°C]</text>')
    for i, s in enumerate(states, 1):
        if s is None:
            continue
        a, b = pixel(s.x, diagram_y(s.T, s.x))
        tip = f'Punkt {i}: T = {s.T:.2f} °C | x = {s.x:.3f} g/kg | φ = {s.phi:.2f} % | h = {s.h:.2f} kJ/kg | ρ = {s.rho:.4f} kg/m³'
        out.append(f'<g><title>{escape(tip)}</title><circle cx="{a}" cy="{b}" r="7" fill="#007b83" stroke="white" stroke-width="2"/><text x="{a+11}" y="{b-9}" fill="#00585e" font-size="15" font-weight="bold" stroke="white" stroke-width="3" paint-order="stroke">{i}</text></g>')
    out.append('<text x="65" y="866" fill="#67757b" font-size="12">T: Temperatur · x: Wasserdampfbeladung · φ: relative Feuchte</text>')
    out.append('<text x="65" y="887" fill="#67757b" font-size="12">h [kJ/kg trockene Luft] · ρ [kg/m³ feuchte Luft]</text></g></svg>')
    return "".join(out), messages


def png_chart(p, states, kinds):
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib.figure import Figure
    fig = Figure(figsize=(8, 9.2), dpi=180)
    ax = fig.add_axes([LEFT/W, 1-(TOP+HEIGHT)/H, WIDTH/W, HEIGHT/H])
    lines, labels, arrows, _ = scene(p, states, kinds)
    for coords, color, width, dashed in lines:
        ax.plot(*zip(*coords), color=color, linewidth=width*.65, linestyle="--" if dashed else "-")
    for x, y, text, color, rot in labels:
        ax.text(x, y, text, color=color, fontsize=7, rotation=rot, bbox={"facecolor":"white", "edgecolor":"none", "pad":.2}, clip_on=False)
    for a, b, color in arrows:
        ax.annotate("", xy=b, xytext=a, arrowprops={"arrowstyle":"-|>", "color":color, "lw":1.5})
    for i, s in enumerate(states, 1):
        if s:
            y = diagram_y(s.T, s.x)
            ax.plot(s.x, y, "o", color="#007b83", markersize=6, markeredgecolor="white")
            ax.annotate(str(i), (s.x, y), xytext=(7, 7), textcoords="offset points", color="#00585e", weight="bold")
    ax.set(xlim=(0, 20), ylim=(YMIN, YMAX), xticks=range(0,21,2), yticks=range(-15,41,5))
    ax.xaxis.tick_top()
    ax.tick_params(labelsize=8, length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    fig.text(.081, .969, "Mollier h,x-Diagramm", weight="bold", fontsize=15, color="#17343c")
    fig.text(.081, .944, f"p = {p:g} hPa · Feuchte bezogen auf Wasser", fontsize=9)
    fig.text(.69, .944, "x [g/kg tr. Luft]", fontsize=9, color=COLORS["x"])
    fig.text(.013, .918, "T [°C]", fontsize=9)
    fig.text(.081, .045, "h [kJ/kg trockene Luft] · ρ [kg/m³ feuchte Luft]", fontsize=9)
    fig.text(.081, .022, "Winterkonvention: Bezug auf unterkühltes Wasser; kein Vereisungsmodell.", fontsize=8)
    buf = BytesIO()
    fig.savefig(buf, format="png", facecolor="white")
    return buf.getvalue()
