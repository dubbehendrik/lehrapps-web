"""Interactive teaching app; calculations live in model.py."""
from copy import deepcopy
from io import BytesIO
from pathlib import Path
import html

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from matplotlib.figure import Figure

from model import DEFAULTS, METHODS, PLANS, PERIODS, UNITS, calculate

REPO = "https://github.com/dubbehendrik/Lackverbrauch-Rechner"
COLORS = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#8C6D00", "#6A3D9A"]
CHARTS = ("Kumulierter Lackverbrauch", "Kumulierte Lackkosten", "Materialnutzungsgrad")


def fmt(x, decimals=2):
    return f"{x:,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def reset():
    for key, value in DEFAULTS.items():
        st.session_state[key] = value
    st.session_state.scenarios = []
    st.session_state.scenario_name = ""
    st.session_state.keep = True
    st.session_state.chart = CHARTS[0]
    st.session_state.chart_period = "Jahr"


def period_row(result, period):
    return next(row for row in result["periods"] if row["Zeitraum"] == period)


def traces(entries, chart, period):
    for entry in entries:
        p = entry["params"]
        r = calculate(p)
        row = period_row(r, period)
        if chart == CHARTS[2]:
            x = np.linspace(1, 100, 200)
            ideal = row["Lackverbrauch [L]"] * p["mng"] / 100
            series = [("Verbrauch", ideal / (x / 100)),
                      ("Verlust", ideal / (x / 100) - ideal)]
            x_label, y_label = "Materialnutzungsgrad MNG [%]", f"Lackmenge im Zeitraum {period} [L]"
        else:
            x = np.linspace(0, row["Produktionszeit [h]"], 101)
            fraction = x / row["Produktionszeit [h]"]
            if chart == CHARTS[0]:
                series = [("Verbrauch", fraction * row["Lackverbrauch [L]"]),
                          ("Verlust", fraction * row["Lackverlust [L]"])]
                y_label = "Kumulierte Lackmenge [L]"
            else:
                series = [("Gesamtkosten", fraction * row["Lackkosten [€]"]),
                          ("Verlustkosten", fraction * row["Verlustkosten [€]"])]
                y_label = "Kumulierte Lackkosten [€]"
            x_label = "Verfügbare Produktionszeit [h]"
        yield entry, x, series, x_label, y_label


def plot(entries, chart, period):
    fig = go.Figure()
    for entry, x, series, xlabel, ylabel in traces(entries, chart, period):
        for index, (name, y) in enumerate(series):
            fig.add_trace(go.Scatter(x=x, y=y, mode="lines",
                                    name=f"{html.escape(entry['name'])} · {name}",
                                    line=dict(color=entry["color"], width=3,
                                              dash="dot" if index else ("dash" if entry.get("preview") else "solid")),
                                    hovertemplate="%{x:.3f}<br>%{y:.3f}<extra>%{fullData.name}</extra>"))
    fig.update_layout(template="plotly_white", height=480,
                      xaxis_title=xlabel, yaxis_title=ylabel, margin=dict(l=30, r=20, t=20, b=30),
                      legend=dict(orientation="h", y=-0.22), font=dict(size=14))
    fig.update_yaxes(rangemode="tozero")
    return fig


def export_frames(entries):
    summary, parameters, timeline = [], [], []
    for entry in entries:
        p = entry["params"]
        r = calculate(p)
        derived = {k: v for k, v in r.items() if k != "periods"}
        for row in r["periods"]:
            summary.append({"Szenario": entry["name"], "Rechenweg": p["method"], **row})
        parameters.append({"Szenario": entry["name"], **p, **derived})
        for period in PERIODS:
            row = period_row(r, period)
            for fraction in np.linspace(0, 1, 101):
                timeline.append({"Szenario": entry["name"], "Zeitraum": period,
                                 "Produktionszeit [h]": fraction * row["Produktionszeit [h]"],
                                 "Stückzahl (rechnerisch)": fraction * row["Stückzahl (rechnerisch)"],
                                 "Lackverbrauch [L]": fraction * row["Lackverbrauch [L]"],
                                 "Lackverlust [L]": fraction * row["Lackverlust [L]"],
                                 "Lackkosten [€]": fraction * row["Lackkosten [€]"],
                                 "Verlustkosten [€]": fraction * row["Verlustkosten [€]"]})
    return pd.DataFrame(summary), pd.DataFrame(parameters), pd.DataFrame(timeline)


@st.cache_data(show_spinner=False, max_entries=8)
def export_data(entries):
    summary, parameters, timeline = export_frames(entries)
    buffer = BytesIO()
    derived_units = dict(rho_fk="kg/m³ (berechnet/verwendet)", mass_piece="kg/Stück",
                         litres_piece="L/Stück", loss_piece="L/Stück", ideal_piece="L/Stück",
                         cost_piece="€/Stück", rate="Stück/h", takt="min/Stück", spray="min/Stück",
                         area_min="m²/min", kg_h="kg/h", litres_h="L/h", litres_min="L/min",
                         spray_litres_min="L/min", spray_kg_min="kg/min")
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        summary.to_excel(writer, sheet_name="Zeiträume", index=False)
        parameters.to_excel(writer, sheet_name="Parameter", index=False)
        timeline.to_excel(writer, sheet_name="Verläufe", index=False)
        pd.DataFrame([{"Parameter": key, "Einheit": unit} for key, unit in UNITS.items()] +
                     [{"Parameter": key, "Einheit": unit} for key, unit in derived_units.items()]).to_excel(
                         writer, sheet_name="Einheiten", index=False)
        for sheet in writer.sheets.values():
            sheet.freeze_panes = "A2"
            sheet.auto_filter.ref = sheet.dimensions
    return summary.to_csv(index=False, sep=";", decimal=",").encode("utf-8-sig"), buffer.getvalue()


@st.cache_data(show_spinner=False, max_entries=8)
def export_images(entries, chart, period):
    fig = Figure(figsize=(11, 6), layout="constrained")
    ax = fig.subplots()
    for entry, x, series, xlabel, ylabel in traces(entries, chart, period):
        for index, (name, y) in enumerate(series):
            ax.plot(x, y, color=entry["color"], linestyle=":" if index else "-",
                    label=f"{entry['name']} · {name}")
    ax.set(xlabel=xlabel, ylabel=ylabel, title=f"{chart} · {period}")
    ax.set_ylim(bottom=0)
    ax.grid(alpha=0.2)
    ax.legend(loc="best", fontsize=8)
    output = []
    for kind in ("png", "svg"):
        buffer = BytesIO()
        fig.savefig(buffer, format=kind, dpi=160)
        output.append(buffer.getvalue())
    return output


def number(key, label, step=1.0, minimum=0.0, maximum=None, decimals=3, help=None):
    st.number_input(label, key=key, step=step, min_value=minimum, max_value=maximum,
                    format=f"%.{decimals}f", help=help)


def main():
    st.set_page_config(page_title="Lackverbrauch-Rechner", layout="wide")
    st.markdown("""<style>
    [data-testid="stMetricValue"] {font-size:clamp(1rem, 2vw, 2rem); white-space:normal;}
    [data-testid="stMetricValue"] > div {white-space:normal; overflow:visible; text-overflow:clip;}
    [data-testid="stMetricLabel"] p {white-space:normal; overflow:visible; text-overflow:clip;}
    </style>""", unsafe_allow_html=True)
    for key, value in DEFAULTS.items():
        st.session_state.setdefault(key, value)
    for key, value in dict(scenarios=[], keep=True, scenario_name="", chart=CHARTS[0], chart_period="Jahr").items():
        st.session_state.setdefault(key, value)
    title, logo = st.columns([4, 1])
    with title:
        st.title("Lackverbrauch-Rechner")
        st.caption("Bauteil → Produktion → Lackmenge, Verluste und Kosten")
    with logo:
        st.image(str(Path(__file__).with_name("HSE-Logo.jpg")), width="stretch")
    with st.expander("ℹ️ Modell, Einheiten und Bedienung"):
        st.markdown("""Grobe Abschätzung für eine einheitliche Beschichtung mit verarbeitungsfertigem Lack.
Alle Materialangaben und der Literpreis beziehen sich auf denselben Produktzustand.
Die Eingabefelder zeigen die verlangten Einheiten; intern wird in konsistente Einheiten umgerechnet.

**Taktzeit:** Zeit von Spritzbeginn eines Teils bis zum Spritzbeginn des nächsten Teils.
Die Werkstückpause ist bereits enthalten. Während der verbleibenden Spritzzeit wird gleichmäßig appliziert.
Schichtpausen/Stillstände reduzieren die verfügbare Produktionszeit; Werkstückpausen werden dort nicht noch einmal abgezogen.

**Lackverlust:** Flüssiglackmenge, die durch den Materialnutzungsgrad nicht zur vorgesehenen Beschichtung beiträgt.
Bestimmungsgemäße Lösemittelverdunstung zählt nicht dazu. Verlustkosten sind in den Gesamtkosten enthalten.
Kein Reserveaufschlag, keine Mehrschichtsysteme, keine Verdünnungs- oder Mischungsrechnung.

**Szenarien:** Die Vorschau aktualisiert sich nach Enter bzw. Verlassen eines Eingabefeldes.
„Szenario übernehmen“ speichert alle Parameter und den Rechenweg. „Szenario behalten“ ergänzt statt zu ersetzen.
Die gespeicherten Szenarien bleiben bis Reset oder Sitzungsende unverändert. Exporte enthalten nur gespeicherte Szenarien.
""")
    inputs, results = st.columns([0.36, 0.64], gap="large")
    with inputs:
        st.subheader("1 · Bauteil und Lack")
        number("area", "Beschichtete Bauteilfläche A [m²/Stück]", 0.1, decimals=4)
        number("thickness", "Mittlere Trockenschichtdicke h̄ [µm]", 5.0)
        st.radio("Berechnung der Lackmenge", METHODS, key="method")
        method = st.session_state.method
        if method != METHODS[2]:
            number("epsilon", "Festkörpermassenanteil ε_FK [Gew.-%]", 1.0, maximum=100.0)
        if method == METHODS[0]:
            number("rho_fk", "Festkörperdichte ρ_FK [kg/m³]", 50.0)
        else:
            number("phi", "Festkörpervolumenanteil φ_FK [Vol.-%]", 1.0, maximum=100.0)
        number("rho_lk", "Flüssiglackdichte ρ_LK [kg/L]", 0.01, decimals=4,
               help="1 g/ml = 1 kg/L. Die Dichte im TDS bezeichnet üblicherweise den flüssigen Lack.")
        number("mng", "Materialnutzungsgrad MNG [%]", 5.0, maximum=100.0)
        number("price", "Literpreis des verarbeitungsfertigen Lacks [€/L]", 1.0, decimals=2)
        with st.expander("Formeln und Festkörperdichte aus TDS-Werten"):
            st.latex(r"\dot m_{LK}=\frac{A\,\bar h\,\rho_{FK}}{t\,\epsilon_{FK}\,MNG}")
            st.latex(r"\rho_{FK}\approx\rho_{LK}\frac{\epsilon_{FK}}{\varphi_{FK}}")
            st.latex(r"V_{LK,\mathrm{Stück}}=\frac{A\,\bar h}{\varphi_{FK}\,MNG}")
            st.markdown("""ε_FK = Festkörpermasse / Flüssiglackmasse; φ_FK = trockenes Festkörpervolumen / Flüssiglackvolumen.
In den Gleichungen sind Prozentgrößen dimensionslose Anteile und die Einheiten konsistent.
Alle TDS-Werte müssen denselben Produktzustand betreffen. Die Schätzung bildet die mittlere Dichte der trockenen Schicht ab.
Aus denselben TDS-Werten liefern die Dichteschätzung und der direkte Volumenweg identische Lackmengen.
Die Schätzgüte lässt sich mit einer unabhängig bekannten Festkörperdichte vergleichen.
Bei TDS-Wertebereichen wird ein bewusst gewählter Einzelwert eingegeben, beispielsweise der Mittelwert.
""")
        st.subheader("2 · Produktion")
        st.radio("Produktionsvorgabe", PLANS, key="plan")
        if st.session_state.plan == PLANS[0]:
            number("takt", "Taktzeit [min/Stück]", 0.1, decimals=6)
        elif st.session_state.plan == PLANS[1]:
            number("rate", "Produktionsrate [Stück/h]", 10.0)
        else:
            st.selectbox("Zeitraum für die Zielstückzahl", PERIODS, key="period")
            st.number_input("Zielstückzahl [Stück/Zeitraum]", min_value=1, step=1000, key="target")
        number("pause", "Pause zwischen Spritzvorgängen [s]", 1.0)
        st.subheader("3 · Schichtmodell")
        st.selectbox("Schichten je Produktionstag [Schichten/Tag]", (1, 2, 3), key="shifts")
        number("shift_hours", "Schichtdauer [h/Schicht]", 0.5, maximum=24.0)
        number("net_hours", "Verfügbare Produktionszeit [h/Schicht]", 0.5, maximum=24.0,
               help="Schichtdauer abzüglich Schichtpausen und Stillständen; Werkstückpausen sind im Takt enthalten.")
        st.number_input("Arbeitstage [Tage/Woche]", min_value=1, max_value=7, step=1, key="days")
        number("weeks", "Produktionswochen [Wochen/Jahr]", 1.0, maximum=52.0, decimals=2)
        st.caption("Monat (Ø) = Jahresproduktionszeit / 12. Keine Kalender-/Feiertagsberechnung.")
        p = {key: st.session_state[key] for key in DEFAULTS}
        try:
            r = calculate(p)
            problem = None
        except (ValueError, OverflowError, ZeroDivisionError) as exc:
            r, problem = None, str(exc)
            st.error(problem)
        st.text_input("Szenarioname (optional)", key="scenario_name")
        st.checkbox("Szenario behalten", key="keep")
        save, clear = st.columns(2)
        if save.button("Szenario übernehmen", type="primary", disabled=problem is not None):
            saved = st.session_state.scenarios if st.session_state.keep else []
            index = len(saved)
            name = st.session_state.scenario_name.strip() or f"Szenario {index + 1}"
            if any(item["name"] == name for item in saved):
                name += f" ({index + 1})"
            st.session_state.scenarios = saved + [dict(name=name, params=deepcopy(p), color=COLORS[index % len(COLORS)])]
        clear.button("Reset", on_click=reset)
    with results:
        st.subheader("Aktuelle Vorschau")
        if r is not None:
            if method == METHODS[1]:
                st.info(f"Festkörperdichte aus TDS-Werten geschätzt: **{fmt(r['rho_fk'], 1)} kg/m³**")
            a, b, c = st.columns(3)
            a.metric("Lack je Bauteil", f"{fmt(r['litres_piece'] * 1000)} mL")
            b.metric("Lackmasse je Bauteil", f"{fmt(r['mass_piece'] * 1000)} g")
            c.metric("Lackkosten je Bauteil", f"{fmt(r['cost_piece'])} €")
            a, b, c = st.columns(3)
            a.metric("Produktionsrate", f"{fmt(r['rate'])} Stück/h")
            b.metric("Flächenleistung (Taktmittel)", f"{fmt(r['area_min'], 3)} m²/min")
            c.metric("Takt / Spritzzeit [min/Stück]", f"{fmt(r['takt'], 3)} / {fmt(r['spray'], 3)}")
            a, b = st.columns(2)
            a.metric("Lackstrom während des Spritzens", f"{fmt(r['spray_litres_min'] * 1000)} mL/min")
            b.metric("Lackstrom im Taktmittel", f"{fmt(r['litres_min'] * 1000)} mL/min")
            st.caption(f"Während des Spritzens: {fmt(r['spray_litres_min'], 4)} L/min · {fmt(r['spray_kg_min'], 4)} kg/min. "
                       f"Taktmittel: {fmt(r['litres_h'])} L/h · {fmt(r['kg_h'])} kg/h.")
            st.subheader("Verbrauch, Verluste und Kosten je Zeitraum")
            display = pd.DataFrame(r["periods"]).set_index("Zeitraum")
            st.dataframe(display.style.format(precision=2, thousands=".", decimal=","), width="stretch")
            selected = period_row(r, st.session_state.chart_period)
            st.markdown(f"**Summen · {st.session_state.chart_period}**")
            a, b = st.columns(2)
            a.metric("Lackverbrauch", f"{fmt(selected['Lackverbrauch [L]'])} L")
            b.metric("Darin Lackverlust", f"{fmt(selected['Lackverlust [L]'])} L")
            a, b = st.columns(2)
            a.metric("Lackkosten insgesamt", f"{fmt(selected['Lackkosten [€]'])} €")
            b.metric("Darin Verlustkosten", f"{fmt(selected['Verlustkosten [€]'])} €")
            st.caption("Rechnerische Stückzahlen und Verbräuche sind kontinuierliche Planungswerte. Vollständige Stücke werden abgerundet. "
                       "Verlustkosten sind bereits in den Lackkosten enthalten.")
        saved = st.session_state.scenarios
        entries = list(saved)
        if r is not None and not any(item["params"] == p for item in saved):
            entries.append(dict(name="Vorschau", params=p, color="#666666", preview=True))
        if entries:
            st.subheader("Diagramme")
            chart_col, period_col = st.columns([2, 1])
            chart_col.selectbox("Darstellung", CHARTS, key="chart")
            period_col.selectbox("Betrachtungszeitraum", PERIODS, key="chart_period")
            st.plotly_chart(plot(entries, st.session_state.chart, st.session_state.chart_period), use_container_width=True)
            if st.session_state.chart == CHARTS[2]:
                st.caption("Nur MNG wird verändert; Stückzahl und alle übrigen Parameter des jeweiligen Szenarios bleiben konstant.")
            else:
                st.caption("Die Zeitachse zählt verfügbare Produktionsstunden, einschließlich Werkstückpausen. "
                           "Der Verlauf ist über die Takte gemittelt; Schichtpausen und Stillstände zählen nicht zur Zeitachse.")
        if saved:
            st.subheader("Gespeicherte Szenarien vergleichen")
            period = st.session_state.chart_period
            rows = []
            for item in saved:
                result = calculate(item["params"])
                row = period_row(result, period)
                rows.append({"Szenario": item["name"], "Rechenweg": item["params"]["method"],
                             "MNG [%]": item["params"]["mng"], "ρ_FK [kg/m³]": result["rho_fk"], **row})
            st.dataframe(pd.DataFrame(rows).set_index("Szenario").style.format(
                precision=2, thousands=".", decimal=",", na_rep="–"), width="stretch")
            if len(rows) > 1:
                reference = st.selectbox("Referenzszenario", [row["Szenario"] for row in rows])
                base = next(row for row in rows if row["Szenario"] == reference)
                deviations = []
                for row in rows:
                    out = {"Szenario": row["Szenario"]}
                    for key, label in (("Lackverbrauch [L]", "Verbrauch"), ("Lackverlust [L]", "Verlust"), ("Lackkosten [€]", "Kosten")):
                        difference = row[key] - base[key]
                        out[f"Δ {label} [{'€' if label == 'Kosten' else 'L'}]"] = difference
                        out[f"Δ {label} [%]"] = 100 * difference / base[key] if base[key] else None
                    deviations.append(out)
                st.dataframe(pd.DataFrame(deviations).set_index("Szenario").style.format(
                    precision=2, thousands=".", decimal=",", na_rep="–"), width="stretch")
                st.caption("Abweichungen beziehen sich auf die Gesamtmengen des gewählten Zeitraums. Bei Referenzwert 0 ist die prozentuale Abweichung nicht definiert.")
            with st.expander("Gespeicherte Parameter anzeigen"):
                st.dataframe(export_frames(saved)[1], width="stretch")
            st.subheader("Export der gespeicherten Szenarien")
            csv, xlsx = export_data(saved)
            png, svg = export_images(saved, st.session_state.chart, st.session_state.chart_period)
            buttons = st.columns(4)
            buttons[0].download_button("CSV", csv, "Lackverbrauch.csv", "text/csv")
            buttons[1].download_button("Excel", xlsx, "Lackverbrauch.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            buttons[2].download_button("PNG", png, "Lackverbrauch.png", "image/png")
            buttons[3].download_button("SVG", svg, "Lackverbrauch.svg", "image/svg+xml")
            st.caption("CSV: Zeitraum-Ergebnisse. Excel: Ergebnisse, Parameter, Verläufe und Einheiten. PNG/SVG: gewählte Darstellung und Zeitraum, ohne Vorschau.")
        else:
            st.info("Ein Szenario übernehmen, um Vergleiche und Exporte freizuschalten.")
    st.divider()
    st.caption("Demonstrations- und Lehrzwecke · Prof. Dr.-Ing. Hendrik Dubbe · Hochschule Esslingen")
    st.markdown(f"[Quellcode und Bedienhinweise]({REPO})")


if __name__ == "__main__":
    main()
