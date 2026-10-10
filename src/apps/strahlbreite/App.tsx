import { SupportFooter } from "../../components/SupportFooter";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  IndexedSymbol,
  MathExpression,
  math,
} from "../../components/MathNotation";
import { readSheet } from "read-excel-file/browser";
import type { Data, Shape } from "plotly.js";
import { Chart } from "../../components/Chart";
import examples from "./examples.json";
import {
  buildCoating,
  buildSingleProfile,
  measurementsFromRows,
  referenceSpeedFromRows,
  speedFactor,
  evaluateInterior,
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
  exclusiveMin = false,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  exclusiveMin?: boolean;
}) {
  const number = numeric(value),
    valid = Number.isFinite(number) && (exclusiveMin ? number > min : number >= min) && number <= max;
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
  const [referenceSpeed, setReferenceSpeed] = useState("");
  const [speed, setSpeed] = useState("");
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
  const scaling = referenceSpeed === "" && speed === "" ? null : calculate(() => speedFactor(numeric(referenceSpeed), numeric(speed === "" ? referenceSpeed : speed)));
  const factor = scaling?.value ?? 1;
  const total = coating?.value && !scaling?.error ? { ...coating.value, y: coating.value.y.map((v) => v * factor), maximum: coating.value.maximum * factor } : null;
  const interior = total && profile ? evaluateInterior(total, profile, numeric(tracks), delta) : null;
  const referenceTotal = coating?.value;
  const referenceInterior = referenceTotal && profile ? evaluateInterior(referenceTotal, profile, numeric(tracks), delta) : null;
  const displayInterior = interior ?? referenceInterior;
  const varied = !!total && !!scaling && !scaling.error && factor !== 1;
  function selectData(next: Measurement[] | null, label: string, reference: number | null = null) {
    loadId.current++;
    setLoading(false);
    setPoints(next);
    setSource(label);
    setFileError("");
    setSmoothing("0");
    setTracks("15");
    setSpacing("");
    setReferenceSpeed(reference === null ? "" : String(reference));
    setSpeed("");
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
      const reference = referenceSpeedFromRows(rows);
      if (id !== loadId.current) return;
      selectData(data, file.name, reference);
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
  async function downloadTemplate() {
    try {
      const { default: write } = await import("write-excel-file/browser");
      const data = points ?? examples[0].points;
      if (referenceSpeed !== "" && !(numeric(referenceSpeed) > 0 && numeric(referenceSpeed) <= 800)) throw new Error("Ungültige Messgeschwindigkeit");
      const validReference = Number.isFinite(numeric(referenceSpeed)) && numeric(referenceSpeed) > 0 && numeric(referenceSpeed) <= 800;
      const rows = [
        [{ value: "Ort [mm]" }, { value: "Schichtdicke [µm]" }, null, { value: "Bahngeschwindigkeit [mm/s]" }, validReference ? { value: numeric(referenceSpeed) } : null],
        ...data.map((p) => [{ value: p.position }, { value: p.thickness }]),
      ];
      await write([{ sheet: "Einzelstrahl", data: rows }]).toFile("Strahlbreite_Vorlage.xlsx");
    } catch { setFileError("Die Excel-Vorlage konnte nicht erstellt werden."); }
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
    profile && referenceTotal
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
  if (referenceTotal)
    totalData.push({
      x: referenceTotal.x,
      y: referenceTotal.y,
      type: "scatter",
      mode: "lines",
      name: referenceSpeed === "" ? "Totalbeschichtung bei Messbedingungen" : `Referenz: ${referenceSpeed} mm/s`,
      line: { color: "#164a87", width: 3 },
    });
  if (referenceInterior)
    totalData.push({
      x: [referenceInterior.start, referenceInterior.end],
      y: [referenceInterior.mean, referenceInterior.mean],
      type: "scatter",
      mode: "lines",
      name: `Referenzmittelwert = ${format(referenceInterior.mean)} µm`,
      line: { color: "#164a87", dash: "dash", width: 2 },
    });
  if (varied && total) totalData.push({ x: total.x, y: total.y, type: "scatter", mode: "lines", name: `Variation: ${format(numeric(speed))} mm/s`, line: { color: "#747474", width: 3 } });
  if (varied && interior) totalData.push({ x: [interior.start, interior.end], y: [interior.mean, interior.mean], type: "scatter", mode: "lines", name: `Variierter Mittelwert = ${format(interior.mean)} µm`, line: { color: "#747474", dash: "dash", width: 2 } });
  const rectangles: Partial<Shape>[] =
    profile && referenceTotal
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
          Auswertung im 1-mm-Raster: <IndexedSymbol base="h" index="max" /> ist
          das Profilmaximum; <IndexedSymbol base="Sb" index="50" /> ist der
          Abstand zwischen dem ersten und letzten Rasterpunkt mit mindestens
          halber Maximalhöhe. Bei mehreren Spitzen umfasst diese Breite auch die
          dazwischenliegenden Bereiche.
        </p>
        <div className="formula-list">
          <MathExpression label="Überlappungsgrad in Prozent: eins minus Bahnversatz geteilt durch Halbhöhenbreite, mal hundert">
            {math.row(
              math.text("ÜL [%]"),
              math.operator("="),
              math.operator("("),
              math.number("1"),
              math.operator("−"),
              math.fraction(math.identifier("Δy"), math.index("Sb", "50")),
              math.operator(")"),
              math.operator("·"),
              math.number("100"),
            )}
          </MathExpression>
          <MathExpression label="Dimensionsloser Überlappungsgrad: Halbhöhenbreite geteilt durch Bahnversatz">
            {math.row(
              math.text("ÜL [−]"),
              math.operator("="),
              math.fraction(math.index("Sb", "50"), math.identifier("Δy")),
            )}
          </MathExpression>
        </div>
        <p>
          Die Totalbeschichtung ist die Summe der verschobenen Einzelstrahlen.
          Zwischen Rasterpunkten wird linear interpoliert, außerhalb des
          Messbereichs wird null angesetzt.
        </p>
        <p>Die Geschwindigkeit skaliert die Schichtdicke mit Messgeschwindigkeit / aktueller Geschwindigkeit. Das Modell setzt konstanten Materialstrom und ein unverändertes Strahlprofil voraus; Beschleunigung und Bahnenden werden nicht modelliert.</p>
        <p>Der innere Auswertebereich schließt Randzonen aus, in denen fehlende Nachbarbahnen beitragen könnten. Er muss mindestens einen vollständigen Bahnabstand umfassen. Der Mittelwert ist das Integral des linear interpolierten Verlaufs geteilt durch die Bereichsbreite. Relative Welligkeit: (Maximum − Minimum) / Mittelwert × 100 %, jeweils im selben Bereich.</p>
        <p>Excel: Spalten A/B enthalten Messwerte. In D1 steht „Bahngeschwindigkeit [mm/s]“, E1 enthält die positive Messgeschwindigkeit. Alte Dateien bleiben ohne Geschwindigkeitsangabe lesbar.</p>
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
                  e.referenceSpeed,
                )
              }
            >
              Beispiel {i + 1}
            </button>
          ))}
          <button onClick={() => void downloadTemplate()}>Excel-Vorlage herunterladen</button>
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
      <section className="controls" aria-label="Messgeschwindigkeit">
        <label>Bahngeschwindigkeit bei der Messung [mm/s]
          <input type="number" min="0" max="800" step="any" value={referenceSpeed} onChange={(e) => { setReferenceSpeed(e.target.value); setSpeed(""); }} aria-invalid={referenceSpeed !== "" && !(numeric(referenceSpeed) > 0 && numeric(referenceSpeed) <= 800)} />
        </label>
        <p>Keine dokumentierte Geschwindigkeit? Feld leer lassen. Das gemessene Profil bleibt auswertbar; die Geschwindigkeitsskalierung ist erst nach Eingabe verfügbar.</p>
        {scaling?.error && <p className="error" role="alert">{scaling.error}</p>}
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
                <strong>
                  <IndexedSymbol base="h" index="max" /> ={" "}
                  {format(profile.maximum)} µm
                </strong>
                <p>
                  <IndexedSymbol base="Sb" index="50" /> ={" "}
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
                description={
                  <>
                    Messpunkte als Rauten; interpoliertes Profil als Linie.
                    Gestrichelte Linien markieren die halbe Maximalhöhe und{" "}
                    <IndexedSymbol base="Sb" index="50" />.
                  </>
                }
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
                {Number.isFinite(numeric(referenceSpeed)) && numeric(referenceSpeed) > 0 && numeric(referenceSpeed) <= 800 && <>
                  <NumericControl label="Bahngeschwindigkeit der Totalbeschichtung [mm/s]" value={speed === "" ? referenceSpeed : speed} onChange={setSpeed} min={0} exclusiveMin max={800} step={1} />
                  <button onClick={() => setSpeed("")}>Auf Messgeschwindigkeit zurücksetzen</button>
                  <p>Messgeschwindigkeit: {format(numeric(referenceSpeed))} mm/s · Schichtdickenfaktor: {format(factor, 3)}. Zulässig: größer als 0 bis einschließlich 800 mm/s. Referenzkurven blau; Variation grau. Beide Mittelwerte verwenden denselben Auswertebereich.</p>
                </>}
              </section>
              {referenceTotal && (
                <>
                  <section className="result" aria-live="polite">
                    <strong>
                      Überlappungsgrad: {format(referenceTotal.overlapPercent)} %
                    </strong>
                    <p>ÜL [−] = {format(referenceTotal.overlapFactor)}</p>
                    {referenceInterior && <p>Referenzmittelwert bei Messgeschwindigkeit: {format(referenceInterior.mean)} µm</p>}
                    {interior ? <>
                      <p>{varied ? "Variierte mittlere Schichtdicke" : "Mittlere Schichtdicke"} <IndexedSymbol base="h" index="ges" /> = {format(interior.mean)} µm</p>
                      <p>Relative Welligkeit: {interior.waviness === null ? "nicht bestimmbar" : format(interior.waviness) + " %"} · Minimum / Maximum: {format(interior.minimum)} / {format(interior.maximum)} µm</p>
                      <p>Auswertebereich: {format(interior.start)} bis {format(interior.end)} mm</p>
                      <p>Breite: {format(interior.end - interior.start)} mm. Beginn = rechter Profilrand − Bahnversatz; Ende = linker Profilrand + Bahnanzahl × Bahnversatz. Die volle Messprofilbreite wird berücksichtigt, auch sehr kleine Randbeiträge. Deshalb kann der Bereich schmal sein; für einen breiteren randfreien Bereich sind mehr Bahnen erforderlich.</p>
                    </> : referenceInterior ? <p>Geschwindigkeitsvariation wegen ungültiger Eingabe nicht verfügbar. Die Referenzkurven bleiben sichtbar.</p> : <p>Kein ausreichend breiter innerer Auswertebereich vorhanden. Mittelwert und Welligkeit werden nicht ausgewiesen. Mehr Bahnen oder größeren Bahnversatz wählen.</p>}
                  </section>
                  <Chart
                    title="Totalbeschichtung"
                    description={
                      <>
                        Dünne Linien: Einzelstrahlen; dicke Linie:
                        Totalbeschichtung. Rechtecke verdeutlichen{" "}
                        <IndexedSymbol base="Sb" index="50" /> der ersten beiden
                        Bahnen. Die hinterlegte Fläche markiert den Auswertebereich; die gestrichelte Linie zeigt dessen Mittelwert.
                      </>
                    }
                    data={totalData}
                    layout={{ ...axes, shapes: [...rectangles, ...(displayInterior ? [{ type: "rect" as const, x0: displayInterior.start, x1: displayInterior.end, yref: "paper" as const, y0: 0, y1: 1, fillcolor: "rgba(0,112,83,.08)", line: { width: 0 }, layer: "below" as const }] : [])] }}
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
