from pathlib import Path
from uuid import uuid4
import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
from thermo import (KEYS, LABELS, PROCESSES, FREE, HEAT, COOL, ISOTHERM, ISENTHALP,
                    solve, state, process_target, process_path, compatible, diagram_temperature)
from chart import svg_chart, png_chart
from exports import excel_export, WINTER_NOTE

ROOT = Path(__file__).parent
st.set_page_config(page_title="Mollier h,x | Lackierkabinen", page_icon="💧", layout="wide")
diagram = components.declare_component("mollier_diagram", path=str(ROOT / "component"))


def row(pair, values, name="", process=FREE):
    return {"id": str(uuid4()), "name": name, "pair": list(pair), "values": list(values), "process": process}


def changed():
    st.session_state.revision += 1
    st.session_state.export_bundle = None


def reset_pressure():
    st.session_state.pressure = 950.0
    changed()


def example(which):
    p = st.session_state.pressure
    if which == "Sommer":
        a = solve(("T", "phi"), (30., 60.), p)
        b = process_target(a, COOL, 10., p)
        c = process_target(b, HEAT, 22., p)
        st.session_state.rows = [row(("T", "phi"), (30., 60.), "Außenluft"),
            row(("T", "x"), (b.T, b.x), "Nach Kühler", COOL), row(("T", "x"), (c.T, c.x), "Zuluft", HEAT)]
    else:
        a = solve(("T", "phi"), (-10., 80.), p)
        b = process_target(a, HEAT, 30., p)
        c = process_target(b, ISENTHALP, 6., p)
        st.session_state.rows = [row(("T", "phi"), (-10., 80.), "Winterluft"),
            row(("T", "x"), (b.T, b.x), "Vorerwärmt", HEAT), row(("T", "x"), (c.T, c.x), "Befeuchtet", ISENTHALP)]
    changed()
    st.session_state.notice = f"Beispiel {which} geladen."


for key, default in {"rows": [], "pressure": 950., "revision": 0, "last_click": None, "export_bundle": None}.items():
    if key not in st.session_state:
        st.session_state[key] = default

st.markdown("""<style>
.block-container{padding-top:3.6rem;max-width:1600px}
h1{letter-spacing:-.035em}div[data-testid="stMetricValue"]{font-size:1.45rem}
</style>""", unsafe_allow_html=True)
head, logo = st.columns([5, 1])
with head:
    st.caption("ANLAGENTECHNIK · FEUCHTE LUFT")
    st.title("Mollier h,x-Diagramm")
    st.write("Luftzustände und Zustandsänderungen für die Planung von Lackierkabinen.")
with logo:
    if (ROOT / "HSE-Logo.jpg").exists():
        st.image(str(ROOT / "HSE-Logo.jpg"), width=160)

with st.expander("Hinweise zur Verwendung und Berechnungsgrundlagen"):
    st.markdown("""**So funktioniert die App:** Zwei Zustandsgrößen vorgeben oder einen Punkt im Diagramm anklicken.
Die übrigen Größen werden berechnet. Alternativ erzeugt eine Prozessart mit einer Zielgröße den nächsten Punkt.
Die Tabelle bestimmt die Reihenfolge **1 → 2 → 3 → …**. Prozessarten lassen sich darunter ändern.

**Einheiten:** Wasserbeladung **x** in g Wasserdampf/kg trockener Luft; Enthalpie **h** in kJ/kg trockener Luft;
Dichte **ρ** in kg feuchter Luft/m³. Die linke Temperaturskala gilt bei x = 0; die leicht geneigten Isothermen
führen zu den anderen Wasserbeladungen. Der feste Bereich entspricht der Vorlage: **−15 bis 40 °C, 0 bis 20 g/kg**.
""")
    st.markdown("**Winterliche Außenluft – verständlich erklärt**")
    st.write(WINTER_NOTE)
    st.markdown("""**Kühlen und Entfeuchten:** Zunächst bleibt x konstant. Ab dem Taupunkt folgt die Luft der
Sättigungslinie (φ = 100 %); ausfallendes Wasser wird sofort abgeschieden. Das ist ein ideales Prozessmodell,
kein Modell eines realen Kühlregisters mit Bypass, endlicher Oberfläche oder Druckverlust.

**Weitere Prozesse:** Isotherme Be-/Entfeuchtung setzt einen passenden Wärmeausgleich voraus.
Isenthalpe Befeuchtung beschreibt Verdunstung näherungsweise bei konstanter Luftenthalpie.
Eine gestrichelte freie Verbindung stellt nur zwei Zustände gegenüber und behauptet keinen physikalischen Prozessweg.

**Grenzen:** Kein Nebeltransport, keine Vereisung, kein Mischen. Unzulässige oder nicht eindeutige Eingaben
werden gemeldet. Eine Druckänderung erhält die beiden Vorgaben jedes Punkts; Prozesse werden erneut geprüft.
Δh bezeichnet die Enthalpieänderung der Luft, nicht automatisch die vollständige Kühlerwärmebilanz.
""")
    st.latex(r"p_v=\varphi\,p_{sat}(T),\quad w=0{,}621945\frac{p_v}{p-p_v},\quad h=1{,}006T+w(2501+1{,}86T)")
    st.caption("In diesen Gleichungen: φ als Anteil 0…1, w = x/1000 in kg/kg, Druck in Pa, T in °C, h in kJ/kg.")
    st.markdown("Stoffwerte: [ASHRAE/PsychroLib](https://psychrometrics.github.io/psychrolib/api_docs.html). "
                "Unter 0 °C: [Murphy & Koop (2005), Gl. 10](https://doi.org/10.1256/qj.04.94), "
                "stetig an die ASHRAE-Wasserkurve bei 0 °C angeschlossen.")

bar = st.columns([1.4, 1.2, 1.2, 1])
with bar[0]:
    st.number_input("Luftdruck [hPa]", min_value=500., max_value=1200., step=1., key="pressure", on_change=changed)
    st.button("↺ 950 hPa", on_click=reset_pressure, help="Nur den Luftdruck zurücksetzen.")
with bar[1]:
    st.caption("Kühlen · Entfeuchten · Erwärmen")
    if st.button("Beispiel Sommer", width="stretch"):
        try:
            example("Sommer")
            st.rerun()
        except ValueError as exc:
            st.error(f"Beispiel bei diesem Druck nicht darstellbar: {exc}")
with bar[2]:
    st.caption("Außenluft · Erwärmen · Befeuchten")
    if st.button("Beispiel Winter", width="stretch"):
        try:
            example("Winter")
            st.rerun()
        except ValueError as exc:
            st.error(f"Beispiel bei diesem Druck nicht darstellbar: {exc}")
with bar[3]:
    st.caption("Neue Prozessfolge")
    if st.button("Punkte leeren", width="stretch"):
        st.session_state.rows = []
        changed()
        st.rerun()
if st.session_state.get("notice"):
    st.toast(st.session_state.pop("notice"))

p = st.session_state.pressure
rows = st.session_state.rows
states, errors = [], []
for i, item in enumerate(rows, 1):
    try:
        states.append(solve(item["pair"], item["values"], p))
    except ValueError as exc:
        states.append(None)
        errors.append(f"Punkt {i}: {exc}")

plot_col, input_col = st.columns([1.85, 1], gap="large")
with input_col:
    st.subheader("Punkt hinzufügen")
    mode = st.radio("Eingabeweg", ["Zustand vorgeben", "Prozess vorgeben"], horizontal=True)
    new_name = st.text_input("Bezeichnung (optional)", placeholder="z. B. Außenluft oder Zuluft")
    click_mode = st.toggle("Punkte per Diagrammklick hinzufügen", value=True)
    st.caption("Ein Klick fügt einen T/x-Punkt hinzu. Den Verbindungsprozess kannst du anschließend in der Prozesstabelle wählen.")
    if mode == "Zustand vorgeben":
        first = st.selectbox("Erste Vorgabe", KEYS, format_func=LABELS.get, key="first")
        others = [k for k in KEYS if k != first]
        second = st.selectbox("Zweite Vorgabe", others, index=others.index("phi") if "phi" in others else 0,
                              format_func=LABELS.get, key=f"second_{first}")
        defaults = {"T": 20., "x": 8., "phi": 50., "rho": 1.12, "h": 40.}
        va = st.number_input(LABELS[first], value=defaults[first], format="%.4f", key=f"a_{first}")
        vb = st.number_input(LABELS[second], value=defaults[second], format="%.4f", key=f"b_{second}")
        candidate = None
        try:
            candidate = solve((first, second), (va, vb), p)
        except ValueError as exc:
            st.warning(str(exc))
        choices = compatible(states[-1], candidate, p) if states and states[-1] and candidate else [FREE]
        kind = st.selectbox("Prozess vom vorherigen Punkt", choices,
                            index=len(choices)-1 if len(choices)>1 else 0, disabled=not rows)
        if st.button("＋ Zustand hinzufügen", type="primary", disabled=candidate is None, width="stretch"):
            rows.append(row((first, second), (va, vb), new_name, kind))
            changed()
            st.rerun()
    else:
        candidate = None
        if not states or states[-1] is None:
            st.info("Lege zuerst einen gültigen Startpunkt über „Zustand vorgeben“ an.")
        else:
            st.caption(f"Ausgangspunkt: Punkt {len(rows)} · {rows[-1]['name']}")
            kind = st.selectbox("Zustandsänderung", PROCESSES[1:])
            target_is_t = kind in (HEAT, COOL)
            target = st.number_input("Zieltemperatur [°C]" if target_is_t else "Ziel-Wasserbeladung [g/kg tr. Luft]",
                                     value=20. if target_is_t else 8., format="%.4f", key=f"target_{kind}")
            try:
                candidate = process_target(states[-1], kind, target, p)
            except ValueError as exc:
                st.warning(str(exc))
            if st.button("＋ Prozess und Zielpunkt hinzufügen", type="primary", disabled=candidate is None, width="stretch"):
                rows.append(row(("T", "x"), (candidate.T, candidate.x), new_name, kind))
                changed()
                st.rerun()
    if candidate:
        st.markdown("**Berechneter Zustand**")
        tiles = st.columns(2)
        for i, (name, val) in enumerate([( "T", f"{candidate.T:.2f} °C"), ("x", f"{candidate.x:.3f} g/kg"),
                                       ("φ", f"{candidate.phi:.2f} %"), ("h", f"{candidate.h:.2f} kJ/kg"),
                                       ("ρ", f"{candidate.rho:.4f} kg/m³"),
                                       ("Taupunkt (Wasser)", "—" if candidate.dew is None else f"{candidate.dew:.2f} °C")]):
            tiles[i%2].metric(name, val)

with plot_col:
    svg, process_errors = svg_chart(p, states, [r["process"] for r in rows])
    event = diagram(svg=svg, enabled=click_mode, generation=st.session_state.revision, key="diagram", default=None)
    if event and event.get("id") != st.session_state.last_click:
        st.session_state.last_click = event.get("id")
        if click_mode and event.get("generation") == st.session_state.revision:
            try:
                x = float(event["x"])
                t = diagram_temperature(float(event["y"]), x)
                clicked = state(t, x, p)
                rows.append(row(("T", "x"), (clicked.T, clicked.x)))
                changed()
                st.session_state.notice = f"Punkt {len(rows)} hinzugefügt. Prozess unten wählbar."
                st.rerun()
            except (ValueError, KeyError, TypeError) as exc:
                st.warning(str(exc))
    st.caption("Blau: x · Grau: T · Schwarz: φ · Rot: h · Grün: ρ · Türkis: Zustandsänderung")
    for message in errors+process_errors:
        st.warning(message)

st.divider()
st.subheader("Zustandspunkte")
st.caption("Vorgaben direkt bearbeiten. Zum Tauschen die Reihenfolgenummern ändern; zum Entfernen „Löschen“ markieren. Anschließend Änderungen übernehmen.")
if rows:
    records = []
    for i, (r, s) in enumerate(zip(rows, states), 1):
        records.append({"Reihenfolge": i, "Name": r["name"], "Größe 1": r["pair"][0], "Wert 1": r["values"][0],
                        "Größe 2": r["pair"][1], "Wert 2": r["values"][1],
                        "T [°C]": s.T if s else None, "x [g/kg]": s.x if s else None,
                        "φ [%]": s.phi if s else None, "ρ [kg/m³]": s.rho if s else None,
                        "h [kJ/kg]": s.h if s else None, "Löschen": False})
    configs = {"Größe 1": st.column_config.SelectboxColumn(options=list(KEYS), required=True),
               "Größe 2": st.column_config.SelectboxColumn(options=list(KEYS), required=True),
               "Reihenfolge": st.column_config.NumberColumn(min_value=1, step=1, required=True)}
    for name in ["Wert 1", "Wert 2", "T [°C]", "x [g/kg]", "φ [%]", "ρ [kg/m³]", "h [kJ/kg]"]:
        configs[name] = st.column_config.NumberColumn(format="%.4f", required=name.startswith("Wert"))
    edited = st.data_editor(pd.DataFrame(records), hide_index=True, width="stretch",
                            disabled=["T [°C]", "x [g/kg]", "φ [%]", "ρ [kg/m³]", "h [kJ/kg]"],
                            column_config=configs, key=f"points_{st.session_state.revision}")
    st.caption("Vorgabewerte: T in °C · x in g/kg trockene Luft · φ in % · ρ in kg/m³ · h in kJ/kg trockene Luft.")
    if st.button("Tabellenänderungen übernehmen"):
        try:
            keep = edited[~edited["Löschen"]]
            if keep["Reihenfolge"].isna().any() or keep["Reihenfolge"].duplicated().any():
                raise ValueError("Bitte eindeutige Reihenfolgenummern vergeben.")
            updated = []
            for idx, e in keep.sort_values("Reihenfolge").iterrows():
                pair, vals = [e["Größe 1"], e["Größe 2"]], [float(e["Wert 1"]), float(e["Wert 2"])]
                solve(pair, vals, p)
                updated.append({**rows[idx], "name": str(e["Name"] or ""), "pair": pair, "values": vals})
            st.session_state.rows = updated
            changed()
            st.rerun()
        except (ValueError, TypeError) as exc:
            st.error(f"Änderungen noch nicht übernommen: {exc}")
else:
    st.info("Noch keine Punkte. Nutze die Eingabe rechts, einen Diagrammklick oder eines der Beispiele.")

if len(rows) > 1:
    st.subheader("Prozesse zwischen den Punkten")
    st.caption("Der Wechsel einer Prozessart erhält die Endpunkte. „Zielpunkt neu berechnen“ passt nur den jeweiligen Zielpunkt an; folgende Verbindungen werden erneut geprüft.")
    for i in range(1, len(rows)):
        with st.container(border=True):
            cols = st.columns([.7, 2.5, 2.5, 1.5])
            cols[0].markdown(f"**{i} → {i+1}**")
            kind = cols[1].selectbox("Prozessart", PROCESSES, index=PROCESSES.index(rows[i]["process"]),
                                    key=f"process_{rows[i]['id']}_{st.session_state.revision}", label_visibility="collapsed")
            if kind != rows[i]["process"]:
                rows[i]["process"] = kind
                changed()
                st.rerun()
            a, b = states[i-1], states[i]
            if a and b:
                try:
                    _, water = process_path(a, b, kind, p)
                    if kind == FREE:
                        cols[2].caption("Geometrische Verbindung, kein Prozessmodell.")
                    else:
                        cols[2].write(f"ΔT = {b.T-a.T:+.2f} K · Δh = {b.h-a.h:+.2f} kJ/kg")
                        if water is not None:
                            cols[2].caption(f"Kondensat: {water:.3f} g/kg trockene Luft")
                except ValueError as exc:
                    cols[2].warning(str(exc))
            else:
                cols[2].warning("Mindestens ein Endpunkt ist ungültig.")
            if kind != FREE:
                target_key = "T" if kind in (HEAT, COOL) else "x"
                # Even an invalid T/x state can be repaired after changing pressure.
                stored = dict(zip(rows[i]["pair"], rows[i]["values"]))
                target_val = b.values()[target_key] if b else stored.get(target_key)
                cols[3].caption(f"Ziel: {target_key} beibehalten")
                if cols[3].button("Zielpunkt neu berechnen", key=f"recalc_{i}", disabled=a is None or target_val is None):
                    try:
                        new = process_target(a, kind, target_val, p)
                        rows[i].update(pair=["T", "x"], values=[new.T, new.x])
                        changed()
                        st.rerun()
                    except ValueError as exc:
                        st.error(str(exc))

st.divider()
st.subheader("Ergebnisse exportieren")
st.caption("Exportiert werden die übernommenen Tabellenwerte. Excel enthält zusätzlich Vorgaben, Prozessprüfung und Modellbeschreibung.")
if st.button("Bild und Excel vorbereiten", disabled=bool(errors or process_errors) or not rows):
    with st.spinner("Exporte werden erstellt …"):
        st.session_state.export_bundle = (png_chart(p, states, [r["process"] for r in rows]),
                                         excel_export(rows, states, p), svg)
if st.session_state.export_bundle:
    png, excel, exported_svg = st.session_state.export_bundle
    dl = st.columns(3)
    dl[0].download_button("↓ Diagramm als PNG", png, "Mollier-h-x.png", "image/png", width="stretch")
    dl[1].download_button("↓ Zustände und Prozesse als Excel", excel, "Mollier-h-x.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", width="stretch")
    dl[2].download_button("↓ Diagramm als SVG", exported_svg, "Mollier-h-x.svg", "image/svg+xml", width="stretch")
st.divider()
st.markdown("**Feedback & Support** · [Fehler melden oder Erweiterung vorschlagen](https://github.com/dubbehendrik/Mollier-h-x/issues/new)")
st.caption("Prof. Dr.-Ing. Hendrik Dubbe · Hochschule Esslingen · Lehr- und Demonstrationsanwendung. "
           "Idealisierte Zustandsänderungen; keine vollständige Auslegung eines realen Luftbehandlungsgeräts.")
