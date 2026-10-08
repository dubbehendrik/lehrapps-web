import { useState, type ReactNode } from "react";
import { Chart } from "../../components/Chart";
import { SupportFooter } from "../../components/SupportFooter";
import {
  IndexedSymbol,
  MathExpression,
  math as m,
} from "../../components/MathNotation";
import {
  calculate,
  DEFAULTS,
  METHODS,
  PLANS,
  PERIODS,
  CHARTS,
  traces,
  type Parameters,
  type Period,
  type Scenario,
} from "./logic";
import { exportData, exportImage } from "./exports";
const fmt = (v: unknown) =>
  typeof v === "number"
    ? v.toLocaleString("de-DE", { maximumFractionDigits: 4 })
    : String(v ?? "–");
const colors = [
  "#0072B2",
  "#D55E00",
  "#009E73",
  "#CC79A7",
  "#8C6D00",
  "#6A3D9A",
];
function Table({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;
  return (
    <div className="lack-table">
      <table>
        <thead>
          <tr>
            {Object.keys(rows[0]).map((k) => (
              <th key={k} scope="col">
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Object.entries(row).map(([k, v]) => (
                <td key={k}>{String(fmt(v))}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function App() {
  const [p, setP] = useState({ ...DEFAULTS }),
    [saved, setSaved] = useState<Scenario[]>([]),
    [name, setName] = useState(""),
    [keep, setKeep] = useState(true),
    [chart, setChart] = useState<string>(CHARTS[0]),
    [period, setPeriod] = useState<Period>("Jahr"),
    [reference, setReference] = useState(""),
    [exportError, setExportError] = useState("");
  let r: ReturnType<typeof calculate> | undefined,
    error = "";
  try {
    r = calculate(p);
  } catch (e) {
    error = (e as Error).message;
  }
  const update = (k: keyof Parameters, v: number | string) =>
    setP((old) => ({ ...old, [k]: v }));
  const number = (
    k: keyof Parameters,
    label: ReactNode,
    max?: number,
    step = 1,
  ) => (
    <label>
      {label}
      <input
        type="number"
        value={Number.isNaN(Number(p[k])) ? "" : p[k]}
        min={k === "price" || k === "pause" ? 0 : undefined}
        max={max}
        step={step}
        onChange={(e) =>
          update(k, e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
    </label>
  );
  const select = (
    k: keyof Parameters,
    label: string,
    options: readonly string[],
  ) => (
    <label>
      {label}
      <select value={String(p[k])} onChange={(e) => update(k, e.target.value)}>
        {options.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );
  const entries = [...saved];
  if (r && !saved.some((s) => JSON.stringify(s.params) === JSON.stringify(p)))
    entries.push({
      name: "Vorschau",
      params: p,
      color: "#666666",
      preview: true,
    });
  const comparison = saved.map((s) => ({
    Szenario: s.name,
    Rechenweg: s.params.method,
    "MNG [%]": s.params.mng,
    "Festkörperdichte [kg/m³]": calculate(s.params).rho_fk,
    ...calculate(s.params).periods.find((v) => v.Zeitraum === period)!,
  }));
  const base =
    comparison.find((v) => v.Szenario === reference) ?? comparison[0];
  const deviations = comparison.map((row) => {
    const out: Record<string, unknown> = { Szenario: row.Szenario };
    for (const [key, label, unit] of [
      ["Lackverbrauch [L]", "Verbrauch", "L"],
      ["Lackverlust [L]", "Verlust", "L"],
      ["Lackkosten [€]", "Kosten", "€"],
    ]) {
      const b = Number(base[key as keyof typeof base]),
        delta = Number(row[key as keyof typeof row]) - b;
      out[`Δ ${label} [${unit}]`] = delta;
      out[`Δ ${label} [%]`] = b ? (100 * delta) / b : null;
    }
    return out;
  });
  const action = async (fn: () => Promise<unknown>) => {
    setExportError("");
    try {
      await fn();
    } catch (e) {
      setExportError(`Export fehlgeschlagen: ${(e as Error).message}`);
    }
  };
  return (
    <>
      <h1>Lackverbrauchs&shy;rechnung</h1>
      <p>Bauteil → Produktion → Lackmenge, Verluste und Kosten</p>
      <details>
        <summary>Modell, Einheiten und Bedienung</summary>
        <p>
          Abschätzung für eine einheitliche Beschichtung mit
          verarbeitungsfertigem Lack. Materialangaben und Literpreis beziehen
          sich auf denselben Produktzustand. Kein Reserveaufschlag, keine
          Mehrschicht-, Verdünnungs- oder Mischungsrechnung.
        </p>
        <p>
          Die Taktzeit umfasst Spritzzeit und Werkstückpause. Schichtpausen und
          Stillstände reduzieren die verfügbare Produktionszeit; Werkstückpausen
          werden dort nicht erneut abgezogen. Während der Spritzzeit wird
          gleichmäßig appliziert.
        </p>
        <p>
          Lackverlust bezeichnet Flüssiglack, der nicht zur vorgesehenen
          Beschichtung beiträgt. Bestimmungsgemäße Lösemittelverdunstung zählt
          nicht dazu. Verlustkosten sind in den Gesamtkosten enthalten.
        </p>
        <p>
          „Szenario übernehmen“ speichert die Parameter. „Szenario behalten“
          ergänzt weitere Szenarien. Exporte enthalten ausschließlich
          gespeicherte Szenarien; Reset löscht sie.
        </p>
      </details>
      <div className="lack-layout">
        <section className="controls">
          <h2>1 · Bauteil und Lack</h2>
          {number(
            "area",
            "Beschichtete Bauteilfläche A [m²/Stück]",
            undefined,
            0.1,
          )}
          {number(
            "thickness",
            "Mittlere Trockenschichtdicke h̄ [µm]",
            undefined,
            5,
          )}
          {select("method", "Berechnung der Lackmenge", METHODS)}
          {p.method !== METHODS[2] &&
            number(
              "epsilon",
              <>
                Festkörpermassenanteil <IndexedSymbol base="ε" index="FK" />{" "}
                [Gew.-%]
              </>,
              100,
            )}
          {p.method === METHODS[0]
            ? number(
                "rho_fk",
                <>
                  Festkörperdichte <IndexedSymbol base="ρ" index="FK" /> [kg/m³]
                </>,
                undefined,
                50,
              )
            : number(
                "phi",
                <>
                  Festkörpervolumenanteil <IndexedSymbol base="φ" index="FK" />{" "}
                  [Vol.-%]
                </>,
                100,
              )}
          {number(
            "rho_lk",
            <>
              Flüssiglackdichte <IndexedSymbol base="ρ" index="LK" /> [kg/L]
            </>,
            undefined,
            0.01,
          )}
          <p>
            1 g/mL = 1 kg/L. Die TDS-Dichte bezeichnet üblicherweise den
            flüssigen Lack.
          </p>
          {number("mng", "Materialnutzungsgrad MNG [%]", 100, 5)}
          {number("price", "Literpreis [€/L]")}
          <details>
            <summary>Formeln und TDS-Werte</summary>
            <div className="formula-list">
              <MathExpression label="Lackmassenstrom gleich Fläche mal mittlere Dicke mal Festkörperdichte geteilt durch Zeit mal Festkörpermassenanteil mal Materialnutzungsgrad">
                {m.row(
                  m.index("ṁ", "LK"),
                  m.operator("="),
                  m.fraction(
                    m.row(
                      m.identifier("A"),
                      m.identifier("h̄"),
                      m.index("ρ", "FK"),
                    ),
                    m.row(
                      m.identifier("t"),
                      m.index("ε", "FK"),
                      m.identifier("MNG"),
                    ),
                  ),
                )}
              </MathExpression>
              <MathExpression label="Festkörperdichte ungefähr Flüssiglackdichte mal Festkörpermassenanteil geteilt durch Festkörpervolumenanteil">
                {m.row(
                  m.index("ρ", "FK"),
                  m.operator("≈"),
                  m.index("ρ", "LK"),
                  m.fraction(m.index("ε", "FK"), m.index("φ", "FK")),
                )}
              </MathExpression>
              <MathExpression label="Lackvolumen je Stück gleich Fläche mal mittlere Dicke geteilt durch Festkörpervolumenanteil mal Materialnutzungsgrad">
                {m.row(
                  m.index("V", "LK, Stück"),
                  m.operator("="),
                  m.fraction(
                    m.row(m.identifier("A"), m.identifier("h̄")),
                    m.row(m.index("φ", "FK"), m.identifier("MNG")),
                  ),
                )}
              </MathExpression>
            </div>
            <p>
              Prozentgrößen stehen in den Formeln als dimensionslose Anteile;
              Einheiten müssen konsistent sein. ε bezeichnet Festkörpermasse /
              Flüssiglackmasse, φ trockenes Festkörpervolumen /
              Flüssiglackvolumen. t ist die Spritzzeit für den Spritzstrom bzw.
              die Taktzeit für den Taktmittelwert.
            </p>
            <p>
              Alle TDS-Werte müssen denselben Produktzustand betreffen.
              Dichteschätzung und direkter Volumenweg liefern aus denselben
              TDS-Werten identische Mengen. Die Schätzung bildet die mittlere
              Dichte der trockenen Schicht ab. Bei Wertebereichen bewusst einen
              Einzelwert wählen und die Schätzgüte mit einer unabhängig
              bekannten Dichte prüfen.
            </p>
          </details>
          <h2>2 · Produktion</h2>
          {select("plan", "Produktionsvorgabe", PLANS)}
          {p.plan === PLANS[0] ? (
            number("takt", "Taktzeit [min/Stück]", undefined, 0.000001)
          ) : p.plan === PLANS[1] ? (
            number("rate", "Produktionsrate [Stück/h]", undefined, 10)
          ) : (
            <>
              {select("period", "Zeitraum für Zielstückzahl", PERIODS)}
              {number("target", "Zielstückzahl [Stück/Zeitraum]")}
            </>
          )}
          {number("pause", "Pause zwischen Spritzvorgängen [s]")}
          <h2>3 · Schichtmodell</h2>
          {number("shifts", "Schichten je Produktionstag", 3)}
          {number("shift_hours", "Schichtdauer [h/Schicht]", 24, 0.5)}
          {number(
            "net_hours",
            "Verfügbare Produktionszeit [h/Schicht]",
            24,
            0.5,
          )}
          {number("days", "Arbeitstage [Tage/Woche]", 7)}
          {number("weeks", "Produktionswochen [Wochen/Jahr]", 52, 0.1)}
          <p>
            Monat (Ø) = Jahresproduktionszeit / 12. Keine Kalender- oder
            Feiertagsberechnung.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <label>
            Szenarioname (optional)
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
            />{" "}
            Szenario behalten
          </label>
          <div className="button-row">
            <button
              disabled={!r}
              onClick={() => {
                const items = keep ? saved : [];
                const original = name.trim() || `Szenario ${items.length + 1}`;
                let unique = original,
                  i = 2;
                while (items.some((s) => s.name === unique))
                  unique = `${original} (${i++})`;
                setSaved([
                  ...items,
                  {
                    name: unique,
                    params: { ...p },
                    color: colors[items.length % colors.length],
                  },
                ]);
              }}
            >
              Szenario übernehmen
            </button>
            <button
              onClick={() => {
                setP({ ...DEFAULTS });
                setSaved([]);
                setName("");
                setKeep(true);
                setChart(CHARTS[0]);
                setPeriod("Jahr");
                setReference("");
                setExportError("");
              }}
            >
              Reset
            </button>
          </div>
        </section>
        <section>
          <h2>Aktuelle Vorschau</h2>
          {r && (
            <>
              {p.method === METHODS[1] && (
                <p>Geschätzte Festkörperdichte: {fmt(r.rho_fk)} kg/m³</p>
              )}
              <div className="input-grid result">
                {[
                  ["Lack je Bauteil", r.litres_piece * 1000, "mL"],
                  ["Lackmasse je Bauteil", r.mass_piece * 1000, "g"],
                  ["Lackkosten je Bauteil", r.cost_piece, "€"],
                  ["Produktionsrate", r.rate, "Stück/h"],
                  ["Flächenleistung (Taktmittel)", r.area_min, "m²/min"],
                  ["Taktzeit", r.takt, "min/Stück"],
                  ["Spritzzeit", r.spray, "min/Stück"],
                  [
                    "Lackstrom während des Spritzens",
                    r.spray_litres_min * 1000,
                    "mL/min",
                  ],
                  ["Lackstrom im Taktmittel", r.litres_min * 1000, "mL/min"],
                ].map(([label, value, unit]) => (
                  <div key={String(label)}>
                    {label}
                    <br />
                    <strong>
                      {fmt(value)} {unit}
                    </strong>
                  </div>
                ))}
              </div>
              <p>
                Während des Spritzens: {fmt(r.spray_litres_min)} L/min ·{" "}
                {fmt(r.spray_kg_min)} kg/min. Taktmittel: {fmt(r.litres_h)} L/h
                · {fmt(r.kg_h)} kg/h.
              </p>
              <h2>Verbrauch, Verluste und Kosten je Zeitraum</h2>
              <Table rows={r.periods} />
              <h2>Summen · {period}</h2>
              <div className="input-grid result">
                {[
                  ["Lackverbrauch [L]", "Lackverbrauch", "L"],
                  ["Lackverlust [L]", "Darin Lackverlust", "L"],
                  ["Lackkosten [€]", "Lackkosten insgesamt", "€"],
                  ["Verlustkosten [€]", "Darin Verlustkosten", "€"],
                ].map(([key, label, unit]) => (
                  <div key={key}>
                    {label}
                    <br />
                    <strong>
                      {fmt(r.periods.find((v) => v.Zeitraum === period)![key])}{" "}
                      {unit}
                    </strong>
                  </div>
                ))}
              </div>
              <p>
                Rechnerische Stückzahlen sind kontinuierliche Planungswerte.
                Vollständige Stücke werden abgerundet. Verlustkosten sind in den
                Lackkosten enthalten.
              </p>
            </>
          )}
          <div className="input-grid">
            <label>
              Darstellung
              <select value={chart} onChange={(e) => setChart(e.target.value)}>
                {CHARTS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Betrachtungszeitraum
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
              >
                {PERIODS.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </div>
          {entries.length > 0 && (
            <Chart
              title={`${chart} · ${period}`}
              description={
                chart === CHARTS[2]
                  ? "Nur MNG wird verändert; Stückzahl und übrige Parameter bleiben konstant."
                  : "Zeitachse: verfügbare Produktionsstunden einschließlich Werkstückpausen; über die Takte gemittelt."
              }
              data={traces(entries, chart, period)}
              layout={{
                xaxis: {
                  title: {
                    text:
                      chart === CHARTS[2]
                        ? "Materialnutzungsgrad MNG [%]"
                        : "Verfügbare Produktionszeit [h]",
                  },
                },
                yaxis: {
                  title: {
                    text:
                      chart === CHARTS[1]
                        ? "Kumulierte Lackkosten [€]"
                        : "Lackmenge [L]",
                  },
                  rangemode: "tozero",
                },
                legend: { orientation: "h" },
              }}
            />
          )}
          {saved.length > 0 ? (
            <>
              <h2>Gespeicherte Szenarien vergleichen</h2>
              <Table rows={comparison} />
              {saved.length > 1 && (
                <>
                  <label>
                    Referenzszenario
                    <select
                      value={base.Szenario}
                      onChange={(e) => setReference(e.target.value)}
                    >
                      {saved.map((s) => (
                        <option key={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                  <Table rows={deviations} />
                  <p>
                    Bei Referenzwert 0 ist die prozentuale Abweichung nicht
                    definiert (–).
                  </p>
                </>
              )}
              <details>
                <summary>Gespeicherte Parameter anzeigen</summary>
                <Table
                  rows={saved.map((s) => ({
                    Szenario: s.name,
                    ...s.params,
                    ...Object.fromEntries(
                      Object.entries(calculate(s.params)).filter(
                        ([k]) => k !== "periods",
                      ),
                    ),
                  }))}
                />
              </details>
              <h2>Export der gespeicherten Szenarien</h2>
              <div className="button-row">
                {(["CSV", "Excel"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => action(() => exportData(saved, v))}
                  >
                    {v}
                  </button>
                ))}
                {(["png", "svg"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() =>
                      action(() => exportImage(saved, chart, period, v))
                    }
                  >
                    {v.toUpperCase()}
                  </button>
                ))}
              </div>
              <p>
                CSV: Zeitraum-Ergebnisse. Excel: Ergebnisse, Parameter, Verläufe
                und Einheiten. PNG/SVG: gewählte Darstellung ohne Vorschau.
              </p>
            </>
          ) : (
            <p>
              Ein Szenario übernehmen, um Vergleich und Export freizuschalten.
            </p>
          )}
          {exportError && (
            <p role="alert" className="error">
              {exportError}
            </p>
          )}
        </section>
      </div>
      <SupportFooter appName="Lackverbrauchsrechnung" />
    </>
  );
}
