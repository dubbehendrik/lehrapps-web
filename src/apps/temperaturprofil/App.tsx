import type { ReactNode } from "react";
import { useRef, useState, useEffect, createElement } from "react";
import createPlotlyComponent from "react-plotly.js/factory";
import Plotly from "plotly.js-basic-dist-min";
import { readSheet } from "read-excel-file/browser";
import { SupportFooter } from "../../components/SupportFooter";
import { MathExpression, math } from "../../components/MathNotation";
import {
  defaults,
  validate,
  simulate,
  temperature,
  fitAlpha,
  parsePaste,
  importRows,
  measurementsFromRows,
} from "./logic";
import type { Parameters, Measurement, Fit, Curve } from "./types";
import { buildPlot } from "./plot";
import { exportData, exportImage } from "./exports";
import "./style.css";
const Plot = createPlotlyComponent(Plotly);
const palette = [
  "#0072B2",
  "#D55E00",
  "#009E73",
  "#CC79A7",
  "#8C6D00",
  "#6A3D9A",
];
const labels: Record<keyof Parameters, ReactNode> = {
  alpha: "Wärmeübergangskoeffizient α [W/(m² K)]",
  cp: "Spezifische Wärmekapazität cₚ [J/(kg K)]",
  area: "Oberfläche A [m²]",
  mass: "Masse m [kg]",
  referenceTime: <>Referenzzeit t<sub>ref</sub> [s]</>,
  referenceTemperature: <>Referenztemperatur T<sub>ref</sub> [°C]</>,
  ambientTemperature: <>Umgebungstemperatur T<sub>∞</sub> [°C]</>,
  endTime: "Endzeit [s]",
  step: "Abtastschritt Δt [s]",
};
const strings = (p: Parameters) =>
  Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, String(v)]),
  ) as Record<keyof Parameters, string>;
const numeric = (s: string) =>
  s.trim() === "" ? NaN : Number(s.replace(",", "."));
const fmt = (v: number) => Number(v.toPrecision(6)).toLocaleString("de-DE");
export default function TemperatureApp() {
  const [compact, setCompact] = useState(window.innerWidth < 1100);
  useEffect(() => {
    const update = () => setCompact(window.innerWidth < 1100);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const [inputs, setInputs] = useState(strings(defaults)),
    [mode, setMode] = useState("fixed"),
    [source, setSource] = useState(""),
    [rows, setRows] = useState<string[][]>([]),
    [paste, setPaste] = useState(""),
    [edited, setEdited] = useState(false),
    [from, setFrom] = useState("0"),
    [to, setTo] = useState("600"),
    [fit, setFit] = useState<{
      result: Fit;
      signature: string;
      source: string;
    } | null>(null),
    [curves, setCurves] = useState<Curve[]>([]),
    [keep, setKeep] = useState(false),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [residuals, setResiduals] = useState(false),
    [unit, setUnit] = useState("s"),
    [height, setHeight] = useState(600),
    [full, setFull] = useState(false),
    [manual, setManual] = useState(false),
    [axes, setAxes] = useState(["0", "600", "0", "200"]),
    [revision, setRevision] = useState(0);
  const nextId = useRef(1),
    loadId = useRef(0);
  const params = Object.fromEntries(
    Object.entries(inputs).map(([k, v]) => [k, numeric(v)]),
  ) as unknown as Parameters;
  let problem = "",
    points: Measurement[] = [];
  try {
    validate(params);
    points = measurementsFromRows(rows);
  } catch (e) {
    problem = (e as Error).message;
  }
  const measurementSource =
    (source.trim() || "Unbenannte Messung") + (edited ? " (bearbeitet)" : "");
  const signature = JSON.stringify([
    rows,
    params.cp,
    params.area,
    params.mass,
    params.referenceTime,
    params.referenceTemperature,
    params.ambientTemperature,
    from,
    to,
  ]);
  const validFit = fit && fit.signature === signature ? fit : null;
  const effective = {
    ...params,
    alpha: mode === "fit" && validFit ? validFit.result.alpha : params.alpha,
  };
  const factor = unit === "min" ? 60 : 1;
  let ranges: number[][] | undefined,
    axisError = "";
  if (manual) {
    const a = axes.map(numeric);
    if (!a.every(Number.isFinite) || a[0] >= a[1] || a[2] >= a[3])
      axisError = "Achsenminimum muss kleiner als Maximum sein.";
    else ranges = [a.slice(0, 2), a.slice(2)];
  }
  const preview = !problem && (mode === "fixed" || validFit) ? effective : null;
  const plot = buildPlot(
    curves,
    points,
    measurementSource,
    preview,
    factor,
    mode === "fit" &&
      Number.isFinite(numeric(from)) &&
      numeric(from) < numeric(to)
      ? [numeric(from), numeric(to)]
      : null,
    height,
    ranges,
    compact,
  );
  async function run(action: () => void | Promise<void>) {
    setError("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function load(file: Blob, label: string) {
    const id = ++loadId.current;
    setBusy(true);
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024)
        throw Error("Datei darf höchstens 10 MB groß sein.");
      const data = importRows(await readSheet(file, 1));
      if (id !== loadId.current) return;
      setInputs(strings(data.params));
      setRows(
        data.measurements.map((v) => [String(v.time), String(v.temperature)]),
      );
      setSource(label);
      setEdited(false);
      setFit(null);
      setMode(data.measurements.length ? "fit" : "fixed");
      setFrom(String(Math.max(0, data.measurements[0]?.time ?? 0)));
      setTo(String(data.measurements.at(-1)?.time ?? 600));
      setPaste("");
      if (data.excludedRows)
        setError(
          `${data.excludedRows} unvollständige Excel-Zeilen wurden ausgeschlossen (z. B. vorbereitete Zeitwerte ohne Temperatur). Bitte die Messdaten prüfen.`,
        );
    } catch (e) {
      if (id === loadId.current) setError((e as Error).message);
    } finally {
      if (id === loadId.current) setBusy(false);
    }
  }
  function addCurve() {
    if (problem) throw Error(problem);
    if (mode === "fit" && !validFit)
      throw Error("Zuerst den Fit für die aktuellen Eingaben berechnen.");
    const id = nextId.current++;
    const origin =
      mode === "fit"
        ? `Fit aus ${measurementSource}`
        : fit
          ? `Vorgegeben (Fixed-Value); Ausgangsfit: ${fit.source}`
          : "Vorgegeben (Fixed-Value)";
    const entry: Curve = {
      id,
      name: name.trim() || `Kurve ${id}`,
      color: palette[(id - 1) % palette.length],
      params: { ...effective },
      source: origin,
      fit: mode === "fit" ? structuredClone(validFit!.result) : null,
      measurements: structuredClone(points),
      selected: true,
    };
    setCurves((old) => (keep ? [...old, entry] : [entry]));
  }
  return (
    <>
      <h1>Temperaturverläufe</h1>
      <p>
        Wärmeübergangskoeffizienten aus Messungen bestimmen und Erwärmung oder
        Abkühlung vergleichen.
      </p>
      <details>
        <summary>Modell und Bedienung</summary>
        <div className="normal-formula">
          <MathExpression label="Temperaturmodell mit Referenzzeit">
            {math.row(
              math.identifier("T"),
              math.operator("("),
              math.identifier("t"),
              math.operator(")"),
              math.operator("="),
              math.index("T", "∞"),
              math.operator("−"),
              math.operator("("),
              math.index("T", "∞"),
              math.operator("−"),
              math.index("T", "ref"),
              math.operator(")"),
              createElement(
                "msup",
                null,
                math.identifier("e"),
                math.row(
                  math.operator("−"),
                  math.fraction(
                    math.row(math.identifier("α"), math.identifier("A")),
                    math.row(math.identifier("m"), math.index("c", "p")),
                  ),
                  math.operator("("),
                  math.identifier("t"),
                  math.operator("−"),
                  math.index("t", "ref"),
                  math.operator(")"),
                ),
              ),
            )}
          </MathExpression>
        </div>
        <p>
          Räumlich einheitliche Körpertemperatur; α, A, m, cₚ und
          Umgebungstemperatur bleiben konstant. Strahlung, Phasenwechsel und
          innere Wärmequellen werden nicht separat abgebildet. Nur α wird
          gefittet, ungewichtet.
        </p>
        <p>
          Referenztemperatur gilt zur Referenzzeit. Fit-Grenzen verschieben
          diesen Bezug nicht. Das Modell wird ab der Referenzzeit dargestellt.
          Δt steuert ausschließlich die Abtastung der analytischen Lösung.
        </p>
        <p>
          Gestrichelt grau: Live-Vorschau. „Plot“ übernimmt den aktuellen
          Parametersatz. „Graph behalten“ ermöglicht Vergleiche. Ergebnisse
          bleiben bis zum Reset oder Verlassen der Seite erhalten.
        </p>
      </details>
      <fieldset>
        <legend>Herkunft von α</legend>
        <label className="radio-label">
          <input
            type="radio"
            checked={mode === "fixed"}
            onChange={() => setMode("fixed")}
          />
          α vorgeben – ohne Messdaten möglich
        </label>
        <label className="radio-label">
          <input
            type="radio"
            checked={mode === "fit"}
            onChange={() => setMode("fit")}
          />
          α aus Messdaten bestimmen
        </label>
      </fieldset>
      <details open={mode === "fit"}>
        <summary>Messdaten und Excel-Import</summary>
        <label>
          Excel-Vorlage laden (.xlsx)
          <input
            type="file"
            accept=".xlsx"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void load(file, file.name);
              e.target.value = "";
            }}
          />
        </label>
        <div className="button-row">
          {["ideal", "real"].map((v, i) => (
            <button
              key={v}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const response = await fetch(
                    `/temperaturprofil/Exp_Temperaturprofil_${v}.xlsx`,
                  );
                  if (!response.ok)
                    throw Error("Beispiel konnte nicht geladen werden.");
                  await load(
                    await response.blob(),
                    `Exp_Temperaturprofil_${v}.xlsx`,
                  );
                })
              }
            >
              Beispiel {i + 1}
            </button>
          ))}
          <a
            className="button-link"
            download
            href="/temperaturprofil/Exp_Temperaturprofil_ideal.xlsx"
          >
            Excel-Template
          </a>
        </div>
        <p>
          Erstes Tabellenblatt: Zeit und Temperatur in A/B; cₚ, A, m, T₀, T∞ in
          F2–F6. T₀ wird mit Referenzzeit 0 übernommen. Leere Messspalten
          ermöglichen reine Parameterdateien.
        </p>
        <label>
          Messungsbezeichnung
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="z. B. Abkühlversuch Aluminium"
          />
        </label>
        <label>
          Zwei Spalten aus Excel einfügen (Zeit [s], Temperatur [°C], ohne
          Kopfzeile)
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={"0\t20\n10\t25"}
          />
        </label>
        <button
          onClick={() =>
            void run(() => {
              const p = parsePaste(paste);
              if (!p.length) throw Error("Keine Messpunkte eingefügt.");
              setRows(p.map((v) => [String(v.time), String(v.temperature)]));
              setEdited(true);
              setFrom(String(Math.max(params.referenceTime, p[0].time)));
              setTo(String(p.at(-1)!.time));
            })
          }
        >
          Messdatentabelle ersetzen
        </button>
        <p>
          {rows.length} Zeilen ·{" "}
          {edited ? "Daten bearbeitet" : "Daten unverändert"}
          {busy ? " · Datei wird gelesen …" : ""}
        </p>
        <div className="temperature-table">
          <table>
            <thead>
              <tr>
                <th>Zeit [s]</th>
                <th>Temperatur [°C]</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {[0, 1].map((j) => (
                    <td key={j}>
                      <input
                        aria-label={`${j === 0 ? "Zeit" : "Temperatur"}, Zeile ${i + 1}`}
                        value={row[j]}
                        onChange={(e) => {
                          setEdited(true);
                          setRows((old) =>
                            old.map((r, k) =>
                              k === i
                                ? r.map((v, l) =>
                                    l === j ? e.target.value : v,
                                  )
                                : r,
                            ),
                          );
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <button
                      aria-label={`Zeile ${i + 1} löschen`}
                      onClick={() => {
                        setEdited(true);
                        setRows((old) => old.filter((_, k) => k !== i));
                      }}
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="button-row">
          <button
            disabled={rows.length >= 20001}
            onClick={() => {
              setRows((old) => [...old, ["", ""]]);
              setEdited(true);
            }}
          >
            Zeile hinzufügen
          </button>
          <button
            onClick={() => {
              setRows([]);
              setSource("");
              setEdited(false);
              setFit(null);
            }}
          >
            Messdaten entfernen
          </button>
        </div>
      </details>
      <div className={`temperature-layout ${full ? "full" : ""}`}>
        <section className="controls">
          <h2>Parameter</h2>
          {(Object.keys(labels) as (keyof Parameters)[]).map((key) => (
            <label key={key}>
              {labels[key]}
              <input
                type="number"
                step="any"
                value={
                  key === "alpha" && mode === "fit" && validFit
                    ? String(validFit.result.alpha)
                    : inputs[key]
                }
                disabled={key === "alpha" && mode === "fit"}
                onChange={(e) =>
                  setInputs((old) => ({ ...old, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          {mode === "fit" && (
            <fieldset>
              <legend>Fit-Zeitintervall</legend>
              <label>
                Fit von [s]
                <input
                  type="number"
                  step="any"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                Fit bis [s]
                <input
                  type="number"
                  step="any"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !!problem}
                onClick={() =>
                  void run(() => {
                    if (!source.trim())
                      throw Error("Bitte eine Messungsbezeichnung eingeben.");
                    const result = fitAlpha(
                      points,
                      params,
                      numeric(from),
                      numeric(to),
                    );
                    setFit({ result, signature, source: measurementSource });
                    setInputs((old) => ({
                      ...old,
                      alpha: String(result.alpha),
                    }));
                  })
                }
              >
                α bestimmen
              </button>
              {fit && !validFit && (
                <p role="status">Eingaben geändert: Fit bitte neu berechnen.</p>
              )}
            </fieldset>
          )}
          {validFit && (
            <div className="result">
              <strong>α = {fmt(validFit.result.alpha)} W/(m² K)</strong>
              <p>RMSE = {fmt(validFit.result.rmse)} °C</p>
              <p>
                R² ={" "}
                {validFit.result.rSquared === null
                  ? "nicht definiert (konstante Messwerte)"
                  : fmt(validFit.result.rSquared)}
              </p>
              <p>{validFit.result.count} Messpunkte im Fit</p>
            </div>
          )}
          {preview && (
            <p>
              Temperatur bei Endzeit:{" "}
              {fmt(temperature(preview.endTime, preview))} °C
              <br />
              Zeitkonstante τ:{" "}
              {preview.alpha === 0
                ? "∞ (kein Wärmeaustausch)"
                : `${fmt((preview.mass * preview.cp) / (preview.alpha * preview.area))} s`}
            </p>
          )}
          {problem && (
            <p className="error" role="alert">
              {problem}
            </p>
          )}
          <label>
            Kurvenname
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Automatischer Kurvenname"
            />
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={keep}
              onChange={(e) => setKeep(e.target.checked)}
            />
            Graph behalten
          </label>
          <div className="button-row">
            <button
              disabled={busy || !!problem || (mode === "fit" && !validFit)}
              onClick={() => void run(addCurve)}
            >
              Plot
            </button>
            <button
              onClick={() => {
                loadId.current++;
                setBusy(false);
                setInputs(strings(defaults));
                setMode("fixed");
                setRows([]);
                setSource("");
                setFit(null);
                setCurves([]);
                setError("");
                setPaste("");
                setEdited(false);
                setKeep(false);
                setName("");
                setFrom("0");
                setTo("600");
                setManual(false);
                setUnit("s");
                setHeight(600);
                setFull(false);
                setResiduals(false);
                setRevision((v) => v + 1);
              }}
            >
              Reset
            </button>
          </div>
        </section>
        <section className="temperature-chart">
          <details>
            <summary>Diagramm einstellen</summary>
            <label>
              Zeiteinheit
              <select
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setManual(false);
                }}
              >
                <option value="s">Sekunden</option>
                <option value="min">Minuten</option>
              </select>
            </label>
            <label>
              Diagrammhöhe [px]
              <input
                type="number"
                min="450"
                max="1200"
                value={height}
                onChange={(e) =>
                  setHeight(
                    Math.min(1200, Math.max(450, Number(e.target.value))),
                  )
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={full}
                onChange={(e) => setFull(e.target.checked)}
              />
              Diagramm über gesamte Breite
            </label>
            <label>
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
              />
              Achsengrenzen manuell
            </label>
            {manual && (
              <div className="input-grid">
                {[
                  `Zeit von [${unit}]`,
                  `Zeit bis [${unit}]`,
                  "Temperatur von [°C]",
                  "Temperatur bis [°C]",
                ].map((v, i) => (
                  <label key={v}>
                    {v}
                    <input
                      type="number"
                      step="any"
                      value={axes[i]}
                      onChange={(e) =>
                        setAxes((old) =>
                          old.map((a, j) => (j === i ? e.target.value : a)),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
            )}
            {axisError && <p className="error">{axisError}</p>}
            <button
              onClick={() => {
                setManual(false);
                setRevision((v) => v + 1);
              }}
            >
              Ansicht zurücksetzen
            </button>
          </details>
          <figure aria-label="Temperaturverläufe">
            <figcaption>
              <h2>Temperaturverläufe</h2>
              <p>
                Messpunkte, übernommene Kurven und gestrichelte Vorschau.
                Schattierung: aktuelles Fit-Intervall.
              </p>
            </figcaption>
            <Plot
              data={plot.data}
              layout={{
                ...plot.layout,
                uirevision: JSON.stringify([revision, factor, ranges]),
              }}
              config={{
                responsive: true,
                displaylogo: false,
                scrollZoom: true,
                modeBarButtonsToRemove: ["toImage"],
              }}
              useResizeHandler
              style={{ width: "100%", height: plot.layout.height }}
            />
          </figure>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={residuals}
              onChange={(e) => setResiduals(e.target.checked)}
            />
            Residuen anzeigen (Messung − Modell)
          </label>
          {residuals && (
            <figure>
              <figcaption>
                <h2>Residuen im jeweiligen Fit-Intervall</h2>
                <p>
                  Systematische Abweichungen können auf unpassende
                  Modellannahmen hinweisen.
                </p>
              </figcaption>
              <Plot
                data={[
                  ...curves
                    .filter((c) => c.fit)
                    .map((c) => ({
                      x: c.fit!.residuals.map((v) => v.time / factor),
                      y: c.fit!.residuals.map((v) => v.temperature),
                      mode: "markers" as const,
                      type: "scatter" as const,
                      name: c.name,
                      marker: { color: c.color },
                    })),
                  ...(validFit
                    ? [
                        {
                          x: validFit.result.residuals.map(
                            (v) => v.time / factor,
                          ),
                          y: validFit.result.residuals.map(
                            (v) => v.temperature,
                          ),
                          mode: "markers" as const,
                          type: "scatter" as const,
                          name: "Aktueller Fit",
                        },
                      ]
                    : []),
                ]}
                layout={{
                  height: 370,
                  margin: { l: 65, r: 20, t: 30, b: 70 },
                  xaxis: { title: { text: `Zeit [${unit}]` } },
                  yaxis: { title: { text: "Residuum [°C]" }, zeroline: true },
                }}
                config={{ responsive: true, displaylogo: false }}
                useResizeHandler
                style={{ width: "100%", height: 370 }}
              />
            </figure>
          )}
        </section>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <section className="controls">
        <h2>Übernommene Kurven und Export</h2>
        {!curves.length ? (
          <p>
            Mit „Plot“ eine Kurve übernehmen. Die Vorschau wird nicht
            exportiert.
          </p>
        ) : (
          <>
            <p>
              Häkchen wählen die zu exportierenden Kurven. Diagrammexporte
              enthalten Parameter und Herkunft; die numerisch eingestellten
              Achsengrenzen werden übernommen.
            </p>
            {curves.map((c) => (
              <div className="temperature-curve" key={c.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={c.selected}
                    onChange={(e) =>
                      setCurves((old) =>
                        old.map((v) =>
                          v.id === c.id
                            ? { ...v, selected: e.target.checked }
                            : v,
                        ),
                      )
                    }
                  />
                  {c.name} · α = {fmt(c.params.alpha)} · {c.source}
                  {c.fit ? ` · Fit ${c.fit.from}–${c.fit.to} s` : ""}
                </label>
                <button
                  onClick={() =>
                    setCurves((old) => old.filter((v) => v.id !== c.id))
                  }
                >
                  Kurve löschen
                </button>
              </div>
            ))}
            <div className="button-row">
              {["CSV", "Excel", "PNG", "SVG"].map((format) => (
                <button
                  key={format}
                  disabled={!curves.some((c) => c.selected)}
                  onClick={() =>
                    void run(async () => {
                      const selected = curves.filter((c) => c.selected);
                      if (format === "CSV" || format === "Excel")
                        await exportData(selected, format === "Excel");
                      else {
                        const image = buildPlot(
                          selected,
                          [],
                          "",
                          null,
                          factor,
                          null,
                          height,
                          ranges,
                        );
                        await exportImage(
                          image.data,
                          image.layout,
                          format === "PNG" ? "png" : "svg",
                        );
                      }
                    })
                  }
                >
                  {format} herunterladen
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <SupportFooter appName="Temperaturverläufe" />
    </>
  );
}
