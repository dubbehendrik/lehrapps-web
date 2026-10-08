import { SupportFooter } from "../../components/SupportFooter";
import { useMemo, useRef, useState } from "react";
import { readSheet } from "read-excel-file/browser";
import type { Data, Shape } from "plotly.js";
import { Chart } from "../../components/Chart";
import examples from "./examples.json";
import {
  buildCoating,
  buildSingleProfile,
  measurementsFromRows,
} from "./logic";
import type { Measurement } from "./types";
const format = (v: number, digits = 2) =>
  v.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
const numeric = (text: string) => (text.trim() === "" ? NaN : Number(text));
function calculate<T>(
  run: () => T,
): { value: T; error: null } | { value: null; error: string } {
  try {
    return { value: run(), error: null };
  } catch (error) {
    return {
      value: null,
      error:
        error instanceof Error
          ? error.message
          : "Die Berechnung ist fehlgeschlagen.",
    };
  }
}
function NumericControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
}) {
  const number = numeric(value),
    valid = Number.isFinite(number) && number >= min && number <= max;
  return (
    <div className="numeric-control">
      <label>
        {label}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!valid}
        />
      </label>
      <label className="slider-label">
        {label} – Schieberegler
        <input
          type="range"
          min={min}
          max={max}
          step="any"
          value={valid ? number : min}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
export default function StrahlbreiteApp() {
  const [points, setPoints] = useState<Measurement[] | null>(null),
    [source, setSource] = useState("");
  const [smoothing, setSmoothing] = useState("0"),
    [tracks, setTracks] = useState("15"),
    [spacing, setSpacing] = useState("");
  const [method, setMethod] = useState("automatic"),
    [manual, setManual] = useState<string | null>(null);
  const [fileError, setFileError] = useState(""),
    [loading, setLoading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null),
    loadId = useRef(0);
  const single = useMemo(
    () =>
      points
        ? calculate(() => buildSingleProfile(points, numeric(smoothing)))
        : null,
    [points, smoothing],
  );
  const profile = single?.value;
  // Blank spacing means the Python default: Sb50/2. Preserve chosen spacing
  // across smoothing changes, clipping only when the new half-width is smaller.
  const width = profile?.halfWidth ?? 0;
  const delta = spacing === "" ? width / 2 : Math.min(numeric(spacing), width);
  const coating = useMemo(
    () =>
      profile
        ? calculate(() => buildCoating(profile, numeric(tracks), delta))
        : null,
    [profile, tracks, delta],
  );
  const total = coating?.value;
  const manualValue =
    manual === null
      ? (total?.automaticThickness ?? 0)
      : Math.min(numeric(manual), total?.maximum ?? 0);
  const manualError =
    method === "manual" && (!Number.isFinite(manualValue) || manualValue < 0)
      ? "Die manuelle Schichtdicke muss zwischen 0 und dem Maximum der Totalbeschichtung liegen."
      : null;
  const h =
    method === "manual" ? manualValue : (total?.automaticThickness ?? 0);
  function selectData(next: Measurement[] | null, label: string) {
    loadId.current++;
    setLoading(false);
    setPoints(next);
    setSource(label);
    setFileError("");
    setSmoothing("0");
    setTracks("15");
    setSpacing("");
    setMethod("automatic");
    setManual(null);
    if (fileInput.current) fileInput.current.value = "";
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    const id = ++loadId.current;
    setLoading(true);
    setFileError("");
    try {
      if (!file.name.toLowerCase().endsWith(".xlsx"))
        throw new Error("Bitte eine Excel-Datei im Format .xlsx wählen.");
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Die Excel-Datei darf höchstens 10 MB groß sein.");
      const rows = await readSheet(file, 1).catch(() => {
        throw new Error(
          "Die Excel-Datei konnte nicht gelesen werden. Bitte eine gültige, unverschlüsselte .xlsx-Datei wählen.",
        );
      });
      const data = measurementsFromRows(rows);
      if (id !== loadId.current) return;
      selectData(data, file.name);
    } catch (error) {
      if (id !== loadId.current) return;
      setFileError(
        error instanceof Error
          ? error.message
          : "Die Excel-Datei konnte nicht gelesen werden.",
      );
      setLoading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  const axes = {
    xaxis: { title: { text: "Position [mm]" } },
    yaxis: { title: { text: "Schichtdicke [µm]" } },
    legend: { orientation: "h" as const, y: -0.4 },
    margin: { l: 65, r: 20, t: 20, b: 120 },
  };
  const singleShapes: Partial<Shape>[] = profile
    ? [
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          y0: profile.maximum / 2,
          y1: profile.maximum / 2,
          line: { color: "#526674", dash: "dash" },
        },
        ...(profile.halfBounds ?? []).map((v) => ({
          type: "line" as const,
          x0: v,
          x1: v,
          y0: 0,
          y1: profile.maximum / 2,
          line: { color: "#164a87", dash: "dash" as const },
        })),
      ]
    : [];
  const trackCount = numeric(tracks);
  const totalData: Data[] =
    profile && total
      ? Array.from({ length: trackCount }, (_, i) => ({
          x: profile.x.map((v) => v + i * delta),
          y: profile.y,
          type: "scatter",
          mode: "lines",
          name: `Einzelstrahl ${i + 1}`,
          showlegend: false,
          line: { color: `hsl(${(i * 360) / trackCount},65%,38%)`, width: 1 },
        }))
      : [];
  if (total)
    totalData.push({
      x: total.x,
      y: total.y,
      type: "scatter",
      mode: "lines",
      name: "Totalbeschichtung",
      line: { color: "#162c3c", width: 3 },
    });
  if (total && !manualError)
    totalData.push({
      x: [total.x[0], total.x.at(-1)!],
      y: [h, h],
      type: "scatter",
      mode: "lines",
      name: `h_ges = ${format(h)} µm`,
      line: { color: "#526674", dash: "dash", width: 2 },
    });
  const rectangles: Partial<Shape>[] =
    profile && total
      ? Array.from({ length: Math.min(2, trackCount) }, (_, i) => ({
          type: "rect",
          x0: profile.peakPosition + i * delta - width / 2,
          x1: profile.peakPosition + i * delta + width / 2,
          y0: 0,
          y1: profile.maximum / 2,
          line: { color: i === 0 ? "#164a87" : "#007053", width: 1 },
          fillcolor: i === 0 ? "rgba(22,74,135,.15)" : "rgba(0,112,83,.15)",
          layer: "below",
        }))
      : [];
  return (
    <>
      <p className="eyebrow">
        Applikations- und Verfahrenstechnik · Strahlbreite
      </p>
      <h1>Vom Einzelstrahl zur Totalbeschichtung</h1>
      <details>
        <summary>Hinweise zur Verwendung und Berechnung</summary>
        <p>
          Lade ein Einzelstrahlprofil als Excel-Datei oder wähle eines der drei
          Beispiele. Die erste Zeile enthält Spaltenüberschriften, die ersten
          beiden Spalten Ort [mm] und Schichtdicke [µm]. Das erste Tabellenblatt
          wird verwendet; unvollständige Zeilen werden ausgelassen. Orte müssen
          streng aufsteigen.
        </p>
        <p>
          Der kubische Spline verwendet den Glättungsfaktor s als Grenze für die
          Summe der quadrierten Abweichungen an den Messpunkten. Bei s = 0
          werden die Messpunkte interpoliert. Beide Ränder werden über jeweils
          10 % des Messbereichs mit einer Kosinus-Hüllkurve gedämpft.
        </p>
        <p>
          Auswertung im 1-mm-Raster: h_max ist das Profilmaximum; Sb₅₀ ist der
          Abstand zwischen dem ersten und letzten Rasterpunkt mit mindestens
          halber Maximalhöhe. Bei mehreren Spitzen umfasst diese Breite auch die
          dazwischenliegenden Bereiche.
        </p>
        <p className="formula">
          ÜL [%] = (1 − Δy / Sb₅₀) · 100; ÜL [−] = Sb₅₀ / Δy
        </p>
        <p>
          Die Totalbeschichtung ist die Summe der verschobenen Einzelstrahlen.
          Zwischen Rasterpunkten wird linear interpoliert, außerhalb des
          Messbereichs wird null angesetzt.
        </p>
        <p>
          <strong>Automatisches h_ges:</strong> Mittelwert aller Rasterwerte mit
          mindestens 95 % des Maximums der Totalbeschichtung. Dieser Wert
          beschreibt den Bereich nahe dem Maximum. Er ist kein Mittelwert über
          die gesamte beschichtete Breite.
        </p>
        <p>
          Excel-Dateien werden ausschließlich im Browser verarbeitet. Grenzen:
          10 MB, 2.000 Messpunkte, höchstens 50.000 Rasterpunkte.
        </p>
      </details>
      <section className="controls" aria-label="Messdaten">
        <h2>1. Einzelstrahlprofil laden</h2>
        <label>
          Excel-Datei (.xlsx): Ort [mm], Schichtdicke [µm]
          <input
            ref={fileInput}
            type="file"
            accept=".xlsx"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
        <div className="button-row">
          {examples.map((e, i) => (
            <button
              key={e.name}
              onClick={() =>
                selectData(
                  e.points,
                  `Beispiel ${i + 1}${i === 0 ? " (ideal)" : " (real)"}`,
                )
              }
            >
              Beispiel {i + 1}
            </button>
          ))}
          <a
            className="button-link"
            href="/strahlbreite/Exp_Strahlbreite_Profil_ideal.xlsx"
            download
          >
            Excel-Vorlage herunterladen
          </a>
        </div>
        {loading && <p role="status">Excel-Datei wird gelesen …</p>}
        {fileError && (
          <p className="error" role="alert">
            {fileError}
          </p>
        )}
        {points ? (
          <div className="source-row">
            <p role="status">
              <strong>{source}</strong> · {points.length} Messpunkte
            </p>
            <button onClick={() => selectData(null, "")}>Entfernen</button>
          </div>
        ) : (
          <p>
            Wähle ein Beispiel oder lade eine Excel-Datei, um die Berechnung zu
            starten.
          </p>
        )}
      </section>
      {points && (
        <>
          <section className="controls" aria-label="Glättung">
            <NumericControl
              label="Glättungsfaktor s [µm²]"
              value={smoothing}
              onChange={setSmoothing}
              min={0}
              max={20}
              step={1}
            />
            {single?.error && (
              <p className="error" role="alert">
                {single.error}
              </p>
            )}
          </section>
          {profile && (
            <>
              <section className="result" aria-live="polite">
                <strong>h_max = {format(profile.maximum)} µm</strong>
                <p>
                  Sb₅₀ ={" "}
                  {profile.halfWidth === null
                    ? "nicht bestimmbar"
                    : `${format(profile.halfWidth)} mm`}
                </p>
                {profile.y.some((v) => v < 0) && (
                  <p>
                    Der Spline unterschreitet stellenweise null. Diese
                    Interpolationswerte bleiben wie in der Referenzberechnung
                    erhalten.
                  </p>
                )}
              </section>
              <Chart
                title="Einzelstrahlprofil mit Halbhöhenbreite"
                description="Messpunkte als Rauten; interpoliertes Profil als Linie. Gestrichelte Linien markieren die halbe Maximalhöhe und Sb₅₀."
                data={[
                  {
                    x: profile.x,
                    y: profile.y,
                    type: "scatter",
                    mode: "lines",
                    name: "Interpoliertes Profil",
                    line: { color: "#162c3c", width: 2 },
                  },
                  {
                    x: points.map((p) => p.position),
                    y: points.map((p) => p.thickness),
                    type: "scatter",
                    mode: "markers",
                    name: "Messpunkte",
                    marker: { color: "#b53625", symbol: "diamond", size: 7 },
                  },
                ]}
                layout={{ ...axes, shapes: singleShapes }}
              />
              <section className="controls" aria-label="Totalbeschichtung">
                <h2>2. Übergang zur Totalbeschichtung</h2>
                <div className="input-grid">
                  <label>
                    Anzahl der Einzelstrahlen
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={tracks}
                      onChange={(e) => setTracks(e.target.value)}
                      aria-invalid={
                        !Number.isInteger(trackCount) ||
                        trackCount < 1 ||
                        trackCount > 100
                      }
                    />
                  </label>
                  {width >= 0.1 && (
                    <NumericControl
                      label="Bahnversatz Δy [mm]"
                      value={
                        spacing === ""
                          ? String(delta)
                          : Number.isFinite(delta)
                            ? String(delta)
                            : spacing
                      }
                      onChange={setSpacing}
                      min={0.1}
                      max={width}
                      step={Math.max(
                        (points.at(-1)!.position - points[0].position) / 100,
                        0.01,
                      )}
                    />
                  )}
                </div>
                {width >= 0.1 && (
                  <div className="button-row">
                    <button onClick={() => setSpacing(String(width / 3))}>
                      ÜL = 3 (66,67 %) · {format(width / 3)} mm
                    </button>
                    <button onClick={() => setSpacing(String(width / 2))}>
                      ÜL = 2 (50 %) · {format(width / 2)} mm
                    </button>
                  </div>
                )}
                {coating?.error && (
                  <p className="error" role="alert">
                    {coating.error}
                  </p>
                )}
                {total && (
                  <>
                    <fieldset>
                      <legend>
                        Methode zur Ermittlung der Gesamtschichtdicke h_ges
                      </legend>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="method"
                          value="automatic"
                          checked={method === "automatic"}
                          onChange={() => setMethod("automatic")}
                        />{" "}
                        Automatisch: Mittelwert der Werte ≥ 95 % des Maximums
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="method"
                          value="manual"
                          checked={method === "manual"}
                          onChange={() => setMethod("manual")}
                        />{" "}
                        Manuell
                      </label>
                    </fieldset>
                    {method === "manual" && (
                      <NumericControl
                        label="Manuelle Gesamtschichtdicke h_ges [µm]"
                        value={
                          manual === null
                            ? String(manualValue)
                            : Number.isFinite(manualValue)
                              ? String(manualValue)
                              : manual
                        }
                        onChange={setManual}
                        min={0}
                        max={total.maximum}
                        step={total.maximum / 20}
                      />
                    )}
                    <p>
                      Die automatische Auswertung beschreibt den Bereich nahe
                      dem Maximum; sie ist kein Mittelwert über die gesamte
                      Fläche.
                    </p>
                    {manualError && (
                      <p className="error" role="alert">
                        {manualError}
                      </p>
                    )}
                  </>
                )}
              </section>
              {total && (
                <>
                  <section className="result" aria-live="polite">
                    <strong>
                      Überlappungsgrad: {format(total.overlapPercent)} %
                    </strong>
                    <p>ÜL [−] = {format(total.overlapFactor)}</p>
                    {!manualError && (
                      <p>
                        Gesamtschichtdicke h_ges = {format(h)} µm (
                        {method === "manual" ? "manuell" : "automatisch"})
                      </p>
                    )}
                  </section>
                  <Chart
                    title="Totalbeschichtung"
                    description="Dünne Linien: Einzelstrahlen; dicke Linie: Totalbeschichtung. Rechtecke verdeutlichen Sb₅₀ der ersten beiden Bahnen."
                    data={totalData}
                    layout={{ ...axes, shapes: rectangles }}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
      <SupportFooter appName="Strahlbreite" />
    </>
  );
}
