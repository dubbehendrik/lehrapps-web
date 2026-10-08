import { useMemo, useRef, useState } from "react";
import { SupportFooter } from "../../components/SupportFooter";
import { MathExpression, math as m } from "../../components/MathNotation";
import {
  KEYS,
  LABELS,
  PROCESSES,
  FREE,
  HEAT,
  COOL,
  solve,
  state,
  processTarget,
  processPath,
  compatible,
  diagramTemperature,
  example,
  row,
  type Key,
  type Process,
  type State,
  type PointRow,
} from "./logic";
import { svgChart, coordinates, pixel } from "./diagram";
import { WINTER_NOTE, exportExcel, exportImage } from "./exports";
const defaults: Record<Key, number> = {
  T: 20,
  x: 8,
  phi: 50,
  rho: 1.12,
  h: 40,
};
type Draft = PointRow & { order: number; remove: boolean };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
function Metrics({ s }: { s: State }) {
  return (
    <dl className="hx-metrics">
      {[
        ["T", `${s.T.toFixed(2)} °C`],
        ["x", `${s.x.toFixed(3)} g/kg`],
        ["φ", `${s.phi.toFixed(2)} %`],
        ["h", `${s.h.toFixed(2)} kJ/kg`],
        ["ρ", `${s.rho.toFixed(4)} kg/m³`],
        ["Taupunkt (Wasser)", s.dew === null ? "—" : `${s.dew.toFixed(2)} °C`],
      ].map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function KeySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Key;
  onChange: (v: Key) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as Key)}>
        {KEYS.map((k) => (
          <option key={k} value={k}>
            {LABELS[k]}
          </option>
        ))}
      </select>
    </label>
  );
}
export default function App() {
  const [pressure, setPressure] = useState(950),
    [rows, setRows] = useState<PointRow[]>([]),
    [draft, setDraft] = useState<Draft[]>([]),
    [mode, setMode] = useState("state"),
    [name, setName] = useState(""),
    [first, setFirst] = useState<Key>("T"),
    [second, setSecond] = useState<Key>("phi"),
    [va, setVa] = useState(20),
    [vb, setVb] = useState(50),
    [kind, setKind] = useState<Process>(HEAT),
    [connection, setConnection] = useState<Process>(FREE),
    [target, setTarget] = useState(20),
    [clickEnabled, setClickEnabled] = useState(true),
    [cursor, setCursor] = useState({ x: 8, y: 20 }),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const commit = (next: PointRow[]) => {
    setRows(next);
    setDraft(
      next.map((r, i) => ({
        ...r,
        pair: [...r.pair],
        values: [...r.values],
        order: i + 1,
        remove: false,
      })),
    );
  };
  const solved = useMemo(() => {
    const errors: string[] = [];
    const states = rows.map((r, i) => {
      try {
        return solve(r.pair, r.values, pressure);
      } catch (e) {
        errors.push(`Punkt ${i + 1}: ${message(e)}`);
        return null;
      }
    });
    let chart = { svg: "", messages: [] as string[] };
    try {
      chart = svgChart(
        pressure,
        states,
        rows.map((r) => r.process),
      );
    } catch (e) {
      errors.push(message(e));
    }
    return { states, errors, ...chart };
  }, [rows, pressure]);
  const last = solved.states.at(-1);
  let candidate: State | null = null,
    candidateError = "";
  try {
    candidate =
      mode === "state"
        ? solve([first, second], [va, vb], pressure)
        : last
          ? processTarget(last, kind, target, pressure)
          : null;
  } catch (e) {
    candidateError = message(e);
  }
  const choices =
    last && candidate ? compatible(last, candidate, pressure) : [FREE];
  const selectedConnection = choices.includes(connection) ? connection : FREE;
  const run = (fn: () => void) => {
    try {
      fn();
      setNotice("");
    } catch (e) {
      setNotice(message(e));
    }
  };
  const addCoords = (q: { x: number; y: number }) => {
    if (!clickEnabled) return;
    run(() => {
      const s = state(diagramTemperature(q.y, q.x), q.x, pressure);
      commit([...rows, row(["T", "x"], [s.T, s.x], name)]);
    });
  };
  const pointer = (e: { clientX: number; clientY: number }) => {
    const svg = chartRef.current?.querySelector("svg"),
      matrix = svg?.getScreenCTM();
    if (!matrix) return null;
    const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(
        matrix.inverse(),
      ),
      c = coordinates(q.x, q.y);
    return c.x >= 0 && c.x <= 20 && c.y >= -17 && c.y <= 43 ? c : null;
  };
  const changeDraft = (id: string, change: Partial<Draft>) =>
    setDraft((old) => old.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const asyncRun = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setNotice("Export erstellt.");
    } catch (e) {
      setNotice(message(e));
    } finally {
      setBusy(false);
    }
  };
  const exportDisabled =
    busy || !rows.length || !!solved.errors.length || !!solved.messages.length;
  return (
    <article className="hx-app">
      <h1>Mollier h,x-Diagramm</h1>
      <p>
        Luftzustände und Zustandsänderungen für die Planung von Lackierkabinen.
      </p>
      <details>
        <summary>Hinweise zur Verwendung und Berechnungsgrundlagen</summary>
        <p>
          Zwei Zustandsgrößen vorgeben oder einen Punkt im Diagramm anklicken.
          Alternativ erzeugt eine Prozessart mit einer Zielgröße den nächsten
          Punkt. Die Tabelle bestimmt die Reihenfolge 1 → 2 → 3 → …
        </p>
        <p>
          x: g Wasserdampf/kg trockener Luft · h: kJ/kg trockener Luft · ρ: kg
          feuchter Luft/m³. Die linke Temperaturskala gilt bei x = 0; den leicht
          geneigten Isothermen folgen. Fester Bereich: −15 bis 40 °C und 0 bis
          20 g/kg.
        </p>
        <p>{WINTER_NOTE}</p>
        <p>
          Kühlung: x bleibt bis zum Taupunkt konstant, danach folgt die Luft der
          Sättigungslinie; ausfallendes Wasser wird sofort abgeschieden. Kein
          reales Kühlregister mit Bypass, Druckverlust oder endlicher
          Oberfläche. Isotherme Be-/Entfeuchtung benötigt Wärmeausgleich;
          isenthalpe Befeuchtung ist eine Näherung. Freie Verbindungen sind
          geometrisch. Kein Nebeltransport, kein Mischen. Δh ist die
          Enthalpieänderung der Luft; Kondensatenthalpie und Verluste sind nicht
          bilanziert.
        </p>
        <div className="formula-list">
          <MathExpression label="Dampfdruck gleich relative Feuchte mal Sättigungsdruck">
            {m.row(
              m.index("p", "v"),
              m.operator("="),
              m.identifier("φ"),
              m.index("p", "sat"),
              m.operator("("),
              m.identifier("T"),
              m.operator(")"),
            )}
          </MathExpression>
          <MathExpression label="Wasserbeladung w gleich 0,621945 mal Dampfdruck geteilt durch Gesamtdruck minus Dampfdruck">
            {m.row(
              m.identifier("w"),
              m.operator("="),
              m.number("0,621945"),
              m.fraction(
                m.index("p", "v"),
                m.row(m.identifier("p"), m.operator("−"), m.index("p", "v")),
              ),
            )}
          </MathExpression>
          <MathExpression label="Enthalpie gleich 1,006 T plus w mal Klammer 2501 plus 1,86 T">
            {m.row(
              m.identifier("h"),
              m.operator("="),
              m.number("1,006"),
              m.identifier("T"),
              m.operator("+"),
              m.identifier("w"),
              m.operator("("),
              m.number("2501"),
              m.operator("+"),
              m.number("1,86"),
              m.identifier("T"),
              m.operator(")"),
            )}
          </MathExpression>
        </div>
        <p>
          In den Gleichungen: φ als Anteil 0…1; w = x/1000 in kg/kg; Druck in
          Pa; T in °C; h in kJ/kg.
        </p>
        <p>
          Stoffwerte:{" "}
          <a href="https://psychrometrics.github.io/psychrolib/api_docs.html">
            ASHRAE/PsychroLib
          </a>
          ; unter 0 °C:{" "}
          <a href="https://doi.org/10.1256/qj.04.94">
            Murphy & Koop (2005), Gl. 10
          </a>
          , stetig angeschlossen bei 0 °C.
        </p>
      </details>
      <section className="controls hx-bar">
        <label>
          Luftdruck [hPa]
          <input
            type="number"
            min={500}
            max={1200}
            step={1}
            value={Number.isNaN(pressure) ? "" : pressure}
            onChange={(e) => setPressure(e.target.valueAsNumber)}
          />
        </label>
        <div className="button-row">
          <button onClick={() => setPressure(950)}>↺ 950 hPa</button>
          {(["Sommer", "Winter"] as const).map((which) => (
            <button
              key={which}
              onClick={() => run(() => commit(example(which, pressure)))}
            >
              Beispiel {which}
            </button>
          ))}
          <button onClick={() => commit([])}>Punkte leeren</button>
        </div>
      </section>
      {notice && (
        <p role="status" className="error">
          {notice}
        </p>
      )}
      <div className="hx-layout">
        <section>
          <div
            className="hx-diagram"
            ref={chartRef}
            tabIndex={0}
            role="button"
            aria-label="Diagramm: mit Pfeiltasten Position wählen, mit Enter Punkt hinzufügen"
            aria-disabled={!clickEnabled}
            onPointerMove={(e) => {
              const q = pointer(e);
              if (q) setCursor(q);
            }}
            onClick={(e) => {
              const q = pointer(e);
              if (q) addCoords(q);
            }}
            onKeyDown={(e) => {
              const delta = e.shiftKey ? 1 : 0.1;
              let q = { ...cursor };
              if (e.key === "ArrowLeft") q.x = Math.max(0, q.x - delta);
              else if (e.key === "ArrowRight") q.x = Math.min(20, q.x + delta);
              else if (e.key === "ArrowUp") q.y = Math.min(43, q.y + delta);
              else if (e.key === "ArrowDown") q.y = Math.max(-17, q.y - delta);
              else if (e.key === "Enter") {
                e.preventDefault();
                addCoords(q);
                return;
              } else return;
              e.preventDefault();
              setCursor(q);
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: solved.svg }} />
            {solved.svg && (
              <svg
                className="hx-cursor"
                viewBox="0 0 800 920"
                aria-hidden="true"
              >
                <circle
                  cx={pixel(cursor.x, cursor.y)[0]}
                  cy={pixel(cursor.x, cursor.y)[1]}
                  r="6"
                  fill="none"
                  stroke="#a34c00"
                  strokeWidth="2"
                />
              </svg>
            )}
          </div>
          <p className="hx-readout">
            T ≈ {diagramTemperature(cursor.y, cursor.x).toFixed(2)} °C · x ≈{" "}
            {cursor.x.toFixed(3)} g/kg
          </p>
          <p>
            Blau: x · Grau: T · Schwarz: φ · Rot: h · Grün: ρ · Türkis:
            Zustandsänderung
          </p>
          {[...solved.errors, ...solved.messages].map((err, i) => (
            <p className="error" role="alert" key={i}>
              {err}
            </p>
          ))}
        </section>
        <section className="controls hx-input">
          <h2>Punkt hinzufügen</h2>
          <label>
            Eingabeweg
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="state">Zustand vorgeben</option>
              <option value="process">Prozess vorgeben</option>
            </select>
          </label>
          <label>
            Bezeichnung (optional)
            <input
              value={name}
              placeholder="z. B. Außenluft oder Zuluft"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="radio-label">
            <input
              type="checkbox"
              checked={clickEnabled}
              onChange={(e) => setClickEnabled(e.target.checked)}
            />{" "}
            Punkte per Diagrammklick hinzufügen
          </label>
          <p>
            Ein Klick fügt einen T/x-Punkt hinzu. Den Verbindungsprozess
            anschließend unten wählen.
          </p>
          {mode === "state" ? (
            <>
              <KeySelect
                label="Erste Vorgabe"
                value={first}
                onChange={(k) => {
                  setFirst(k);
                  setVa(defaults[k]);
                  if (k === second) {
                    const other = KEYS.find((v) => v !== k)!;
                    setSecond(other);
                    setVb(defaults[other]);
                  }
                }}
              />
              <label>
                {LABELS[first]}
                <input
                  type="number"
                  step="any"
                  value={Number.isNaN(va) ? "" : va}
                  onChange={(e) => setVa(e.target.valueAsNumber)}
                />
              </label>
              <KeySelect
                label="Zweite Vorgabe"
                value={second}
                onChange={(k) => {
                  setSecond(k);
                  setVb(defaults[k]);
                }}
              />
              <label>
                {LABELS[second]}
                <input
                  type="number"
                  step="any"
                  value={Number.isNaN(vb) ? "" : vb}
                  onChange={(e) => setVb(e.target.valueAsNumber)}
                />
              </label>
              <label>
                Prozess vom vorherigen Punkt
                <select
                  value={selectedConnection}
                  disabled={!rows.length}
                  onChange={(e) => setConnection(e.target.value as Process)}
                >
                  {choices.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <button
                disabled={!candidate}
                onClick={() =>
                  run(() =>
                    commit([
                      ...rows,
                      row([first, second], [va, vb], name, selectedConnection),
                    ]),
                  )
                }
              >
                ＋ Zustand hinzufügen
              </button>
            </>
          ) : (
            <>
              {!last ? (
                <p>
                  Zuerst einen gültigen Startpunkt über „Zustand vorgeben“
                  anlegen.
                </p>
              ) : (
                <>
                  <p>
                    Ausgangspunkt: Punkt {rows.length} · {rows.at(-1)?.name}
                  </p>
                  <label>
                    Zustandsänderung
                    <select
                      value={kind}
                      onChange={(e) => setKind(e.target.value as Process)}
                    >
                      {PROCESSES.slice(1).map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {kind === HEAT || kind === COOL
                      ? "Zieltemperatur [°C]"
                      : "Ziel-Wasserbeladung [g/kg tr. Luft]"}
                    <input
                      type="number"
                      step="any"
                      value={Number.isNaN(target) ? "" : target}
                      onChange={(e) => setTarget(e.target.valueAsNumber)}
                    />
                  </label>
                  <button
                    disabled={!candidate}
                    onClick={() => {
                      if (candidate)
                        commit([
                          ...rows,
                          row(
                            ["T", "x"],
                            [candidate.T, candidate.x],
                            name,
                            kind,
                          ),
                        ]);
                    }}
                  >
                    ＋ Prozess und Zielpunkt hinzufügen
                  </button>
                </>
              )}
            </>
          )}
          {candidateError && (
            <p role="alert" className="error">
              {candidateError}
            </p>
          )}
          {candidate && (
            <>
              <h2>Berechneter Zustand</h2>
              <Metrics s={candidate} />
            </>
          )}
        </section>
      </div>
      <section className="controls">
        <h2>Zustandspunkte</h2>
        <p>
          Vorgaben bearbeiten, Reihenfolgenummern zum Tauschen ändern oder
          „Löschen“ markieren. Änderungen werden gemeinsam übernommen.
        </p>
        {!rows.length ? (
          <p>Noch keine Punkte. Eingabe, Diagrammklick oder Beispiel nutzen.</p>
        ) : (
          <>
            <div className="hx-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Reihenfolge",
                      "Name",
                      "Größe 1",
                      "Wert 1",
                      "Größe 2",
                      "Wert 2",
                      "T [°C]",
                      "x [g/kg]",
                      "φ [%]",
                      "ρ [kg/m³]",
                      "h [kJ/kg]",
                      "Löschen",
                    ].map((k) => (
                      <th key={k}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {draft.map((r, i) => {
                    const s = solved.states[i];
                    return (
                      <tr key={r.id}>
                        <td>
                          <input
                            aria-label={`Reihenfolge Punkt ${i + 1}`}
                            type="number"
                            min={1}
                            step={1}
                            value={Number.isNaN(r.order) ? "" : r.order}
                            onChange={(e) =>
                              changeDraft(r.id, {
                                order: e.target.valueAsNumber,
                              })
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Name Punkt ${i + 1}`}
                            value={r.name}
                            onChange={(e) =>
                              changeDraft(r.id, { name: e.target.value })
                            }
                          />
                        </td>
                        {([0, 1] as const)
                          .map((j) => (
                            <td key={j}>
                              <select
                                aria-label={`Größe ${j + 1} Punkt ${i + 1}`}
                                value={r.pair[j]}
                                onChange={(e) => {
                                  const pair: [Key, Key] = [...r.pair];
                                  pair[j] = e.target.value as Key;
                                  changeDraft(r.id, { pair });
                                }}
                              >
                                {KEYS.map((k) => (
                                  <option key={k} value={k}>
                                    {k === "phi" ? "φ" : k === "rho" ? "ρ" : k}
                                  </option>
                                ))}
                              </select>
                            </td>
                          ))
                          .flatMap((select, j) => [
                            select,
                            <td key={`value${j}`}>
                              <input
                                aria-label={`Wert ${j + 1} Punkt ${i + 1}`}
                                type="number"
                                step="any"
                                value={
                                  Number.isNaN(r.values[j]) ? "" : r.values[j]
                                }
                                onChange={(e) => {
                                  const values: [number, number] = [
                                    ...r.values,
                                  ];
                                  values[j] = e.target.valueAsNumber;
                                  changeDraft(r.id, { values });
                                }}
                              />
                            </td>,
                          ])}
                        {KEYS.map((k) => (
                          <td key={k}>
                            {s ? s[k].toFixed(k === "rho" ? 4 : 3) : "—"}
                          </td>
                        ))}
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Löschen Punkt ${i + 1}`}
                            checked={r.remove}
                            onChange={(e) =>
                              changeDraft(r.id, { remove: e.target.checked })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={() =>
                run(() => {
                  const keep = draft.filter((r) => !r.remove);
                  if (
                    keep.some(
                      (r) => !Number.isInteger(r.order) || r.order < 1,
                    ) ||
                    new Set(keep.map((r) => r.order)).size !== keep.length
                  )
                    throw Error(
                      "Bitte eindeutige positive Reihenfolgenummern vergeben.",
                    );
                  keep.forEach((r) => solve(r.pair, r.values, pressure));
                  commit(
                    keep
                      .sort((a, b) => a.order - b.order)
                      .map(({ order: _order, remove: _remove, ...r }) => r),
                  );
                })
              }
            >
              Tabellenänderungen übernehmen
            </button>
          </>
        )}
      </section>
      {rows.length > 1 && (
        <section className="controls">
          <h2>Prozesse zwischen den Punkten</h2>
          <p>
            Ein Wechsel der Prozessart erhält die Endpunkte. „Zielpunkt neu
            berechnen“ passt den jeweiligen Zielpunkt an; folgende Verbindungen
            werden erneut geprüft.
          </p>
          {rows.slice(1).map((r, j) => {
            const i = j + 1,
              a = solved.states[i - 1],
              b = solved.states[i];
            let info = "Mindestens ein Endpunkt ist ungültig.";
            if (a && b) {
              try {
                const { water } = processPath(a, b, r.process, pressure);
                info =
                  r.process === FREE
                    ? "Geometrische Verbindung, kein Prozessmodell."
                    : `ΔT = ${(b.T - a.T).toFixed(2)} K · Δh = ${(b.h - a.h).toFixed(2)} kJ/kg${water !== null ? ` · Kondensat: ${water.toFixed(3)} g/kg trockene Luft` : ""}`;
              } catch (e) {
                info = message(e);
              }
            }
            const key = r.process === HEAT || r.process === COOL ? "T" : "x",
              stored = Object.fromEntries(
                r.pair.map((k, j) => [k, r.values[j]]),
              ),
              goal = b?.[key] ?? stored[key];
            return (
              <div className="hx-process" key={r.id}>
                <strong>
                  {i} → {i + 1}
                </strong>
                <label>
                  Prozessart
                  <select
                    value={r.process}
                    onChange={(e) =>
                      commit(
                        rows.map((v) =>
                          v.id === r.id
                            ? { ...v, process: e.target.value as Process }
                            : v,
                        ),
                      )
                    }
                  >
                    {PROCESSES.map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
                <p>{info}</p>
                {r.process !== FREE && (
                  <button
                    disabled={!a || goal === undefined}
                    onClick={() =>
                      run(() => {
                        if (!a) return;
                        const s = processTarget(a, r.process, goal, pressure);
                        commit(
                          rows.map((v) =>
                            v.id === r.id
                              ? { ...v, pair: ["T", "x"], values: [s.T, s.x] }
                              : v,
                          ),
                        );
                      })
                    }
                  >
                    Zielpunkt neu berechnen
                  </button>
                )}
              </div>
            );
          })}
        </section>
      )}
      <section className="controls">
        <h2>Ergebnisse exportieren</h2>
        <p>
          Exportiert werden die übernommenen Tabellenwerte. Excel enthält
          Zustände, Vorgaben, Prozesse und Modellbeschreibung. Ungültige Punkte
          oder Prozesse sperren den Export.
        </p>
        <div className="button-row">
          <button
            disabled={exportDisabled}
            onClick={() => void asyncRun(() => exportImage(solved.svg, "png"))}
          >
            ↓ Diagramm als PNG
          </button>
          <button
            disabled={exportDisabled}
            onClick={() => void asyncRun(() => exportImage(solved.svg, "svg"))}
          >
            ↓ Diagramm als SVG
          </button>
          <button
            disabled={exportDisabled}
            onClick={() =>
              void asyncRun(() =>
                exportExcel(rows, solved.states as State[], pressure),
              )
            }
          >
            ↓ Zustände und Prozesse als Excel
          </button>
        </div>
      </section>
      <SupportFooter appName="Mollier h,x-Diagramm" />
    </article>
  );
}
