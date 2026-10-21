import { useMemo, useState } from "react";
import { MathExpression } from "../../components/MathNotation";
import { SupportFooter } from "../../components/SupportFooter";
import {
  quantities,
  numbers,
  axes,
  dimensionAxes,
  electrochemistryCategory,
} from "./data";
import { filterNumbers, numberCategories, recognizeNumbers } from "./catalog";
import {
  analyze,
  balance,
  exact,
  fraction,
  mul,
  numeric,
  parseFraction,
  type Fraction,
} from "./logic";
import type { Selected } from "./types";
import { Product, symbol, FormulaText } from "./Formula";
import { problems } from "./problems";
import { SpacePlot } from "./SpacePlot";
import { Matrix, MatrixEquation, LinearEquation } from "./Notation";
import { ExponentControl } from "./ExponentControl";
import { Vector2D } from "./Vector2D";
import "./style.css";
let serial = 0;
const choose = (ids: string[]): Selected[] =>
  ids.map((id) => ({
    ...quantities.find((q) => q.id === id)!,
    key: serial++,
    subscript: "",
    description: "",
  }));
const labels = (qs: Selected[]) =>
  qs.map((q) => q.symbol + (q.subscript ? "_" + q.subscript : ""));
function Derivation({
  qs,
  names,
  preferred = [],
}: {
  qs: Selected[];
  names: string[];
  preferred?: number[];
}) {
  const a = analyze(
    qs.map((q) => q.dimensions),
    preferred,
  );
  const syms = labels(qs);
  const known = recognizeNumbers(qs);
  return (
    <>
      <div className="result">
        <strong>
          {qs.length} Größen → Rang {a.rank} → {a.basis.length} unabhängige
          Π-Gruppen
        </strong>
        <p>
          k = n − rang(A). Auftretende Basiseinheiten sind nicht automatisch
          unabhängig.
        </p>
      </div>
      <details>
        <summary>1 · Dimensionen und Dimensionsmatrix A</summary>
        <p>
          Spalten: physikalische Größen. Zeilen: Exponenten der Basiseinheiten
          bzw. Basisdimensionen.
        </p>
        <Matrix matrix={a.matrixOriginal} columns={syms} rows={names} />
      </details>
      <details>
        <summary>2 · Exakte Gauß-Elimination und Wiederholungsgrößen</summary>
        <p>
          Spaltenreihenfolge für die Elimination:{" "}
          {a.order.map((i) => (
            <MathExpression key={i} label={syms[i]}>
              {symbol(syms[i])}
            </MathExpression>
          ))}
          . Pivotspalten bilden eine unabhängige Auswahl.
        </p>
        <p>
          Wiederholungsgrößen:{" "}
          {a.repeating.length
            ? a.repeating.map((i) => (
                <MathExpression key={i} label={syms[i]}>
                  {symbol(syms[i])}
                </MathExpression>
              ))
            : "keine (Rang 0)"}
        </p>
        <div className="dim-gauss-steps">
          {a.steps.map((step, i) => (
            <div className="dim-gauss-step" key={i}>
              <h3>
                <FormulaText text={step.label.replace(/Z(\d+)/g, "Z_$1")} />
              </h3>
              <Matrix
                matrix={step.matrix}
                columns={a.order.map((j) => syms[j])}
              />
            </div>
          ))}
        </div>
        <h3>Reduzierte Zeilenstufenform</h3>
        <Matrix matrix={a.matrix} columns={a.order.map((i) => syms[i])} />
      </details>
      <details>
        <summary>3 · Vollständige Basis und Exponentenvergleich</summary>
        <p>
          Jeweils einen freien Exponenten auf 1 setzen, die anderen freien
          Exponenten auf 0. Die Pivotgleichungen bestimmen die übrigen
          Exponenten.
        </p>
        {a.basis.map((b, i) => (
          <div key={i}>
            <Product symbols={syms} powers={b} label={`Π_${i + 1}`} />
            <p>
              Exponenten in der Spaltenreihenfolge der ursprünglichen Matrix: (
              {b.map(exact).join("; ")}).
            </p>
            <div className="dim-matrix-check">
              <span>Kontrolle:</span>
              <MatrixEquation
                values={balance(
                  qs.map((q) => q.dimensions),
                  b,
                )}
              />
            </div>
          </div>
        ))}
        {!a.basis.length && (
          <p>
            Nur die triviale Lösung: Aus diesem Satz entsteht keine
            nichttriviale dimensionslose Gruppe.
          </p>
        )}
      </details>
      <details>
        <summary>4 · Bekannte Kennzahlen und alternative Darstellungen</summary>
        <p>
          Erkennung über die physikalischen Größenarten. Die passende Phase,
          charakteristische Länge und Stoffwertzuordnung müssen zusätzlich
          geprüft werden. Mehrfach vorhandene Größen: Hier wird jeweils das
          erste Exemplar verwendet.
        </p>
        {known.map((n) => (
          <div className="dim-known" key={n.name}>
            <strong>{n.name}</strong>
            {n.kind && <small>{n.kind}</small>}
            <Product
              symbols={Object.keys(n.powers).map(
                (id) => syms[qs.findIndex((q) => q.id === id)],
              )}
              powers={Object.values(n.powers).map((x) => fraction(x * 2, 2))}
              label={n.symbol}
              factor={n.factor}
            />
            <p>
              <FormulaText text={n.note} />
            </p>
          </div>
        ))}
        {!known.length && (
          <p>
            Keine Kennzahl der Bibliothek anhand der gewählten Größenarten
            erkannt. Dimensionsgleiche eigene Variablen werden nicht automatisch
            physikalisch gleichgesetzt.
          </p>
        )}
        <p>
          Kehrwerte und Potenzprodukte liefern andere gültige Gruppen. Eine
          Basis hat genau k unabhängige Exponentenvektoren; darüber hinaus
          erkannte Kennzahlen sind abhängig. Der Nullraum ist ein Exponentenraum
          und darf nicht mit dem Dimensionsraum verwechselt werden.
        </p>
      </details>
      <p>
        Dimensionsanalyse bestimmt keine funktionale Beziehung und bestätigt
        nicht die Vollständigkeit des physikalischen Modells.
      </p>
    </>
  );
}
function Library({ names }: { names: string[] }) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("Alle");
  const shown = filterNumbers(search, cat);
  return (
    <>
      <div className="input-grid">
        <label>
          Kennzahl suchen
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="z. B. Reynolds, Wärme, Ca"
          />
        </label>
        <label>
          Fachgebiet
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            {["Alle", ...new Set(numbers.flatMap(numberCategories))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
      </div>
      <p>
        {shown.length} von {numbers.length} Einträgen · Kraft- und
        Transportverhältnisse sind Skalierungsinterpretationen.
      </p>
      {(cat === electrochemistryCategory || /c.?rate/i.test(search)) && (
        <details>
          <summary>
            Einordnung: Kennzahlen, Transportparameter und C-Rate
          </summary>
          <p>
            Diese Rubrik unterscheidet benannte Kennzahlen, normierte Größen und
            dimensionslose Transportparameter. Allgemeine Transportkennzahlen
            bleiben an ihrem ursprünglichen Fachgebiet gespeichert und werden
            hier zusätzlich angezeigt.
          </p>
          <p>
            <FormulaText text="I/Q_nom hat die Dimension einer inversen Zeit. Eine dimensionslose C-Rate-Normierung benötigt zusätzlich eine feste Referenzzeit t_ref, beispielsweise eine Stunde. Die nominale Ladungskapazität ist konsistent in Coulomb einzusetzen; eine Stunde entspricht 3600 Sekunden." />
          </p>
          <div className="dim-formula">
            <Product
              label="Π_C"
              symbols={["I", "t_ref", "Q_nom"]}
              powers={[fraction(1), fraction(1), fraction(-1)]}
            />
          </div>
          <p>
            Diese Normierung mit fester Referenzzeit ist von einem Ladungsumsatz
            über eine tatsächlich verstrichene Zeit zu unterscheiden. Gleiche
            C-Raten allein garantieren keine vergleichbaren Diffusions- oder
            Temperaturverläufe.
          </p>
        </details>
      )}
      {shown.map((n) => (
        <details key={n.name}>
          <summary>
            {n.name} ·{" "}
            <MathExpression label={n.symbol}>{symbol(n.symbol)}</MathExpression>{" "}
            <small>
              {numberCategories(n).join(" · ")}
              {n.kind ? ` · ${n.kind}` : ""}
            </small>
          </summary>
          <div className="dim-formula">
            <Product
              symbols={Object.keys(n.powers).map(
                (id) => quantities.find((q) => q.id === id)!.symbol,
              )}
              powers={Object.values(n.powers).map((x) => fraction(x * 2, 2))}
              label={n.symbol}
              factor={n.factor}
            />
          </div>
          <p>
            <strong>Bedeutung:</strong> <FormulaText text={n.meaning} />
          </p>
          <p>
            <strong>Beispiel:</strong> <FormulaText text={n.example} />
          </p>
          <p>
            <strong>Definition und Grenzen:</strong>{" "}
            <FormulaText text={n.note} />
          </p>
          <div className="dim-table">
            <table>
              <thead>
                <tr>
                  <th>Größe</th>
                  <th>Bedeutung</th>
                  <th>SI-Einheit</th>
                  <th>Basisdarstellung</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(n.powers).map((id) => {
                  const q = quantities.find((q) => q.id === id)!;
                  return (
                    <tr key={id}>
                      <td>
                        <MathExpression label={q.symbol}>
                          {symbol(q.symbol)}
                        </MathExpression>
                      </td>
                      <td>{q.name}</td>
                      <td>{q.unit}</td>
                      <td>
                        <Product
                          symbols={names}
                          powers={q.dimensions}
                          label={`[${q.symbol}]`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {n.sources && (
            <p>
              Quellen:{" "}
              {n.sources.map((source, index) => (
                <span key={source.url}>
                  {index > 0 ? " · " : ""}
                  <a href={source.url}>{source.title}</a>
                </span>
              ))}
            </p>
          )}
        </details>
      ))}
      <details>
        <summary>Quellen und Definitionskonventionen</summary>
        <p>
          Die Formeln sind als dimensionslose Definitionen rechnerisch geprüft.
          Literaturkonventionen können sich in Faktoren und charakteristischen
          Längen unterscheiden; die Hinweise am Eintrag sind Teil der
          Definition.
        </p>
        <ul>
          <li>
            <a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/similarity-parameters/">
              NASA Glenn: Similarity Parameters
            </a>
          </li>
          <li>
            <a href="https://doc.comsol.com/6.3/doc/com.comsol.help.heat/heat_ug_theory.07.094.html">
              COMSOL: Heat Transfer Coefficients
            </a>
          </li>
          <li>
            <a href="https://www.comsol.com/multiphysics/convection-diffusion-equation">
              COMSOL: Convection-Diffusion Equation
            </a>
          </li>
          <li>
            Weiterführend: VDI-Wärmeatlas; Bird, Stewart, Lightfoot: Transport
            Phenomena; Levenspiel: Chemical Reaction Engineering.
          </li>
        </ul>
      </details>
    </>
  );
}
function Exercises({
  names,
  onTransfer,
}: {
  names: string[];
  onTransfer: (qs: Selected[]) => void;
}) {
  const [cat, setCat] = useState("Alle");
  const [level, setLevel] = useState("Alle");
  const [count, setCount] = useState("Alle");
  const [current, setCurrent] = useState(0);
  const [exam, setExam] = useState(false);
  const options = problems.filter(
    (p) =>
      (cat === "Alle" || p.category === cat) &&
      (level === "Alle" || p.level === level) &&
      (count === "Alle" || p.ids.length === Number(count)),
  );
  const p = options[current % Math.max(options.length, 1)];
  return (
    <>
      <div className="input-grid">
        <label>
          Fachgebiet
          <select
            value={cat}
            onChange={(e) => {
              setCat(e.target.value);
              setCurrent(0);
            }}
          >
            {["Alle", ...new Set(problems.map((p) => p.category))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Schwierigkeit
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setCurrent(0);
            }}
          >
            {["Alle", "Leicht", "Mittel", "Schwer"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Anzahl physikalischer Größen
          <select
            value={count}
            onChange={(e) => {
              setCount(e.target.value);
              setCurrent(0);
            }}
          >
            {["Alle", ...new Set(problems.map((p) => String(p.ids.length)))]
              .sort()
              .map((x) => (
                <option key={x}>{x}</option>
              ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={exam}
            onChange={(e) => setExam(e.target.checked)}
          />{" "}
          Prüfungsmodus (Lösung zunächst verborgen)
        </label>
      </div>
      <div className="button-row">
        <label>
          Beispielaufgabe auswählen
          <select
            aria-label="Beispielaufgabe auswählen"
            disabled={!options.length}
            value={options.length ? current % options.length : ""}
            onChange={(e) => setCurrent(Number(e.target.value))}
          >
            {!options.length && (
              <option value="">Keine passende Aufgabe</option>
            )}
            {options.map((problem, index) => (
              <option key={problem.name} value={index}>
                {problem.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!options.length}
          onClick={() => setCurrent((c) => c + 1)}
        >
          Nächste Aufgabe erzeugen
        </button>
      </div>
      {p ? (
        <section
          className="controls"
          key={`${cat}-${level}-${count}-${current}`}
        >
          <h2>{p.name}</h2>
          <p>
            <FormulaText text={p.text} />
          </p>
          <p>
            Maßgebliche Größen:{" "}
            {p.ids
              .map((id) => {
                const q = quantities.find((q) => q.id === id)!;
                return q.name;
              })
              .join(", ")}
            .
          </p>
          <p>
            Bestimmen Sie die Anzahl unabhängiger dimensionsloser Gruppen und
            leiten Sie eine mögliche Basis nach dem Buckingham-Π-Theorem her.
            Diskutieren Sie, welche physikalischen Informationen daraus noch
            nicht folgen.
          </p>
          {p.questions && (
            <>
              <h3>Zusätzliche Verständnisfragen</h3>
              <ol>
                {p.questions.map((question) => (
                  <li key={question}>
                    <FormulaText text={question} />
                  </li>
                ))}
              </ol>
            </>
          )}
          <details open={exam ? undefined : true}>
            <summary>Musterlösung und Herleitung</summary>
            <Derivation qs={choose(p.ids)} names={names} />
            {p.groups && (
              <details>
                <summary>
                  Fachliche Einordnung und zweckmäßige Mustergruppen
                </summary>
                <p>
                  Die folgenden Gruppen bilden eine vollständige alternative
                  Basis. Kehrwerte und andere unabhängige Potenzprodukte sind
                  ebenfalls gültig. Die Interpretation verwendet die Annahmen
                  der Aufgabenstellung.
                </p>
                {p.groups.map((group) => (
                  <div className="dim-known" key={group.label}>
                    <Product
                      label={group.label}
                      symbols={Object.keys(group.powers).map(
                        (id) => quantities.find((q) => q.id === id)!.symbol,
                      )}
                      powers={Object.values(group.powers).map((power) =>
                        fraction(power * 2, 2),
                      )}
                    />
                    <p>
                      <FormulaText text={group.interpretation} />
                    </p>
                  </div>
                ))}
                {p.sources && (
                  <>
                    <h3>Fachliche Referenzen</h3>
                    <ul>
                      {p.sources.map((source) => (
                        <li key={source.url}>
                          <a href={source.url}>{source.title}</a>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </details>
            )}
          </details>
          <button onClick={() => onTransfer(choose(p.ids))}>
            Im Schnelllöser und Dimensionsraum untersuchen
          </button>
        </section>
      ) : (
        <p className="error">
          Für diese Filterkombination gibt es keine kuratierte Aufgabe. Bitte
          Filter ändern.
        </p>
      )}
      <p>
        {problems.length} Aufgabenfamilien; {options.length} passen zu den
        aktuellen Filtern. Ausschließlich physikalisch begründete
        Variablensätze. Die Filter wählen passende Vorlagen, keine zufälligen
        Größenkombinationen.
      </p>
    </>
  );
}
export default function App() {
  const [tab, setTab] = useState("Bibliothek");
  const [abstract, setAbstract] = useState(false);
  const [qs, setQs] = useState<Selected[]>(() =>
    choose(["rho", "v", "L", "eta"]),
  );
  const [target, setTarget] = useState(-1);
  const [repeating, setRepeating] = useState<number[]>([]);
  const [custom, setCustom] = useState({
    name: "Eigene Größe",
    symbol: "q",
    unit: "frei definiert",
    d: axes.map(() => "0"),
  });
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const names = abstract ? dimensionAxes : axes;
  const result = useMemo(() => analyze(qs.map((q) => q.dimensions)), [qs]);
  const manualValid =
    !repeating.length ||
    (repeating.length === result.rank &&
      analyze(repeating.map((i) => qs[i].dimensions)).rank === result.rank &&
      !repeating.includes(target));
  function transfer(next: Selected[]) {
    setQs(next);
    setTarget(-1);
    setRepeating([]);
    setTab("Schnelllöser");
  }
  function addQuantity(id: string) {
    if (qs.length >= 16) {
      setError("Maximal 16 Größen gleichzeitig.");
      return;
    }
    const q = quantities.find((q) => q.id === id)!;
    const same = qs.filter((x) => x.id === id).length;
    const used = qs
      .filter((x) => x.id === id)
      .map((x) => Number(x.subscript) || 1);
    const next = same ? Math.max(...used) + 1 : 0;
    setQs([
      ...qs.map((x) =>
        x.id === id && !x.subscript ? { ...x, subscript: "1" } : x,
      ),
      {
        ...q,
        key: serial++,
        subscript: next ? String(next) : "",
        description: "",
      },
    ]);
    setRepeating([]);
    setError("");
  }
  return (
    <div className="dim-app">
      <p className="eyebrow">Fokus: Vorlesung · Ähnlichkeitstheorie</p>
      <h1>Dimensionsanalyse</h1>
      <details>
        <summary>Programmbeschreibung, Grundlagen und Grenzen</summary>
        <p>
          Vier Module verbinden eine Bibliothek von {numbers.length} Kennzahlen,{" "}
          {problems.length}
          kuratierte Aufgabenfamilien, einen exakten Buckingham-Π-Schnelllöser
          und einen interaktiven Dimensionsraum.
        </p>
        <p>
          Jede Größe wird durch sieben Exponenten beschrieben. Produkte werden
          zu Linearkombinationen: Eine dimensionslose Gruppe erfüllt die
          Matrixgleichung <LinearEquation />. Die Anzahl unabhängiger Gruppen
          ist n − rang(A). Matrizen sind doppelt unterstrichen, Vektoren mit
          einem Rechtspfeil gekennzeichnet. Alle Berechnungen laufen lokal im Browser.
        </p>
        <p>
          Standardmäßig zeigen wir Exponenten der SI-Basiseinheiten. kg, m, s
          usw. sind Einheiten, M, L, T usw. bezeichnen Dimensionen. Abgeleitete
          Einheiten wie N und W bilden keine zusätzlichen unabhängigen Achsen.
          Ein Logarithmus einer dimensionsbehafteten Größe ist ohne Normierung
          nicht definiert und wird hier nicht benötigt.
        </p>
        <p>
          Der triviale Nullvektor ergibt nur Π = 1. Geschlossene Vektorzüge
          allein beweisen noch keine Unabhängigkeit mehrerer Gruppen. Die
          physikalische Modellauswahl und die Eignung einer Kennzahl bleiben
          fachlich zu prüfen.
        </p>
      </details>
      <label className="dim-switch">
        Darstellung in allen Modulen
        <select
          value={abstract ? "abstract" : "si"}
          onChange={(e) => setAbstract(e.target.value === "abstract")}
        >
          <option value="si">
            SI-Basiseinheiten (kg, m, s, K, A, mol, cd)
          </option>
          <option value="abstract">
            Basisdimensionen (M, L, T, Θ, I, N, J)
          </option>
        </select>
      </label>
      <nav className="button-row" aria-label="Module">
        {[
          "Bibliothek",
          "Aufgabengenerator",
          "Schnelllöser",
          "Dimensionsraum",
        ].map((t) => (
          <button aria-pressed={tab === t} key={t} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <section className="controls">
        <h2>{tab}</h2>
        {tab === "Bibliothek" ? (
          <Library names={names} />
        ) : tab === "Aufgabengenerator" ? (
          <Exercises names={names} onTransfer={transfer} />
        ) : (
          <>
            <details open={tab === "Schnelllöser"}>
              <summary>Physikalische Größen auswählen und bearbeiten</summary>
              <label>
                Größenbibliothek filtern
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className="button-row">
                {quantities
                  .filter((q) =>
                    `${q.name} ${q.symbol}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                  )
                  .map((q) => (
                    <button key={q.id} onClick={() => addQuantity(q.id)}>
                      <MathExpression label={q.symbol}>
                        {symbol(q.symbol)}
                      </MathExpression>{" "}
                      · {q.name} +
                    </button>
                  ))}
              </div>
              <div className="dim-table">
                <table>
                  <thead>
                    <tr>
                      <th>Größe</th>
                      <th>Index</th>
                      <th>Bedeutung / Phase</th>
                      <th>Einheit → Basisdarstellung</th>
                      <th>Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qs.map((q, i) => (
                      <tr key={q.key}>
                        <td>
                          {q.name} (
                          <MathExpression label={q.symbol}>
                            {symbol(q.symbol)}
                          </MathExpression>
                          )
                        </td>
                        <td>
                          <input
                            aria-label={`Index ${i + 1}`}
                            value={q.subscript}
                            maxLength={24}
                            onChange={(e) =>
                              setQs(
                                qs.map((x, j) =>
                                  j === i
                                    ? { ...x, subscript: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Bedeutung ${i + 1}`}
                            value={q.description}
                            onChange={(e) =>
                              setQs(
                                qs.map((x, j) =>
                                  j === i
                                    ? { ...x, description: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          {q.unit} →{" "}
                          <Product
                            symbols={names}
                            powers={q.dimensions}
                            label="d"
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => {
                              setQs(qs.filter((_, j) => j !== i));
                              setRepeating([]);
                              setTarget(-1);
                            }}
                          >
                            Entfernen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details>
                <summary>
                  Eigene physikalische Größe definieren (auch Brüche)
                </summary>
                <div className="input-grid">
                  {(["name", "symbol", "unit"] as const).map((k, i) => (
                    <label key={k}>
                      {["Bezeichnung", "Symbol", "Einheit (Beschreibung)"][i]}
                      <input
                        value={custom[k]}
                        onChange={(e) =>
                          setCustom({ ...custom, [k]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="dim-exponents">
                  {names.map((name, i) => (
                    <label key={i}>
                      Exponent {name}
                      <input
                        value={custom.d[i]}
                        onChange={(e) =>
                          setCustom({
                            ...custom,
                            d: custom.d.map((x, j) =>
                              j === i ? e.target.value : x,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => {
                    try {
                      if (qs.length >= 16) throw Error("Maximal 16 Größen.");
                      if (!custom.name.trim() || !custom.symbol.trim())
                        throw Error(
                          "Bezeichnung und Symbol sind erforderlich.",
                        );
                      setQs([
                        ...qs,
                        {
                          id: `custom-${serial}`,
                          key: serial++,
                          name: custom.name,
                          symbol: custom.symbol,
                          unit: custom.unit,
                          dimensions: custom.d.map(parseFraction),
                          subscript: "",
                          description: "",
                        },
                      ]);
                      setRepeating([]);
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Eigene Größe hinzufügen
                </button>
              </details>
              <div className="input-grid">
                <label>
                  Abhängige Zielgröße
                  <select
                    value={target}
                    onChange={(e) => {
                      setTarget(Number(e.target.value));
                      setRepeating([]);
                    }}
                  >
                    <option value={-1}>Keine Vorgabe</option>
                    {qs.map((q, i) => (
                      <option key={q.key} value={i}>
                        {q.description || q.name} (Größe {i + 1})
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset>
                  <legend>Wiederholungsgrößen (leer = automatisch)</legend>
                  {qs.map((q, i) => (
                    <label key={q.key}>
                      <input
                        type="checkbox"
                        disabled={i === target}
                        checked={repeating.includes(i)}
                        onChange={(e) =>
                          setRepeating(
                            e.target.checked
                              ? [...repeating, i]
                              : repeating.filter((j) => j !== i),
                          )
                        }
                      />
                      <MathExpression label={labels(qs)[i]}>
                        {symbol(labels(qs)[i])}
                      </MathExpression>
                    </label>
                  ))}
                </fieldset>
              </div>
              {target >= 0 &&
                result.repeating.includes(target) &&
                analyze(
                  qs.filter((_, i) => i !== target).map((q) => q.dimensions),
                ).rank < result.rank && (
                  <p className="error">
                    Die Zielgröße ist zur Dimensionsbasis unverzichtbar. Mit den
                    übrigen Größen lässt sich keine dimensionslose Gruppe
                    bilden, die diese Zielgröße enthält. Der Variablensatz ist
                    als Modell der Zielgröße unzureichend.
                  </p>
                )}
              {!manualValid && (
                <p className="error">
                  Genau {result.rank} linear unabhängige Wiederholungsgrößen
                  wählen; die Zielgröße darf nicht dazugehören. Bis dahin wird
                  automatisch gewählt.
                </p>
              )}
              {qs.some((q, i) =>
                qs.some(
                  (p, j) =>
                    j < i &&
                    p.dimensions.every(
                      (x, k) => exact(x) === exact(q.dimensions[k]),
                    ),
                ),
              ) && (
                <p>
                  Dimensionsgleiche Größen sind zulässig: Sie erzeugen
                  Verhältnisgruppen. Ihre physikalische Bedeutung muss eindeutig
                  sein.
                </p>
              )}
            </details>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {qs.length > 0 ? (
              tab === "Schnelllöser" ? (
                <Derivation
                  qs={qs}
                  names={names}
                  preferred={
                    manualValid && repeating.length
                      ? repeating
                      : qs.map((_, i) => i).filter((i) => i !== target)
                  }
                />
              ) : (
                <Explorer
                  key={qs.map((q) => q.key).join(",")}
                  qs={qs}
                  names={names}
                />
              )
            ) : (
              <p>Mindestens eine Größe auswählen.</p>
            )}
          </>
        )}
      </section>
      <SupportFooter appName="Dimensionsanalyse" reviewed={false} />
    </div>
  );
}
function Explorer({ qs, names }: { qs: Selected[]; names: string[] }) {
  const a = analyze(qs.map((q) => q.dimensions));
  const [exps, setExps] = useState(qs.map(() => fraction(1)));
  const [mode, setMode] = useState("Vektorzug");
  const [projection, setProjection] = useState([0, 1, 2]);
  const [projectionSize, setProjectionSize] = useState(3);
  const [group, setGroup] = useState(0);
  const b = balance(
    qs.map((q) => q.dimensions),
    exps,
  );
  const closed = b.every((x) => !x.n);
  const trivial = exps.every((x) => !x.n);
  const dims =
    mode === "Rangreduzierter Raum" && a.rank <= 3
      ? a.independentRows
      : projection.slice(0, projectionSize);
  const unique = [...new Set(dims)];
  const syms = labels(qs);
  return (
    <>
      <p>
        Dimensionsraum: Die Pfeile sind Dimensionsvektoren. Die eingestellten
        Exponenten skalieren die Pfeile. Der Nullraum der Matrix enthält dagegen
        die Exponentenvektoren.
      </p>
      <label>
        Ansicht
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          {["Vektorzug", "Dimensionsprojektionen", "Rangreduzierter Raum"].map(
            (x) => (
              <option key={x}>{x}</option>
            ),
          )}
        </select>
      </label>
      {mode === "Rangreduzierter Raum" && a.rank <= 3 ? (
        <p>
          Rang {a.rank}: unabhängige Koordinaten{" "}
          {dims.map((i) => names[i]).join(", ") || "keine"}. Auf dem von diesen
          Größen aufgespannten Unterraum gehen keine Informationen verloren.
        </p>
      ) : (
        <>
          <p>
            {mode === "Rangreduzierter Raum"
              ? "Rang größer als 3: vollständige Darstellung in 3D unmöglich. Es wird eine Projektion gezeigt."
              : "Projektion: Ein Schließen im Bild garantiert noch keine Dimensionslosigkeit."}
          </p>
          <div className="input-grid">
            <label>
              Projektionsdarstellung
              <select
                aria-label="Projektionsdarstellung"
                value={projectionSize}
                onChange={(e) => setProjectionSize(Number(e.target.value))}
              >
                <option value={2}>2D</option>
                <option value={3}>3D</option>
              </select>
            </label>
            {projection.slice(0, projectionSize).map((p, i) => (
              <label key={i}>
                Achse {i + 1}
                <select
                  value={p}
                  onChange={(e) =>
                    setProjection(
                      projection.map((x, j) =>
                        j === i ? Number(e.target.value) : x,
                      ),
                    )
                  }
                >
                  {names.map((n, j) => (
                    <option key={n} value={j}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {unique.length < dims.length && (
            <p className="error">
              Achsen sind doppelt gewählt. Bitte unterschiedliche Dimensionen
              wählen.
            </p>
          )}
        </>
      )}
      <div className="dim-exponents">
        {qs.map((q, i) => (
          <ExponentControl
            key={q.key}
            name={syms[i]}
            unit={q.unit}
            value={exps[i]}
            onChange={(next) =>
              setExps(exps.map((x, j) => (j === i ? next : x)))
            }
          />
        ))}
      </div>
      <div className="button-row">
        <button onClick={() => setExps(qs.map(() => fraction(1)))}>
          Exponenten auf 1
        </button>
        <button onClick={() => setExps(qs.map(() => fraction(0)))}>
          Exponenten auf 0
        </button>
        {a.basis.length > 0 && (
          <>
            <label>
              Unabhängige Gruppe
              <select
                value={group}
                onChange={(e) => setGroup(Number(e.target.value))}
              >
                {a.basis.map((_, i) => (
                  <option key={i} value={i}>
                    Π {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={() => setExps(a.basis[group])}>
              Exakte Lösung laden
            </button>
          </>
        )}
      </div>
      <div className="dim-space-layout">
        <div className="dim-space-chart">
          {dims.length <= 2 ? (
            <Vector2D
              qs={qs}
              exps={exps}
              dims={dims}
              names={names}
              originVectors={mode === "Dimensionsprojektionen"}
            />
          ) : (
            <SpacePlot
              qs={qs}
              exps={exps}
              dims={dims}
              names={names}
              originVectors={mode === "Dimensionsprojektionen"}
            />
          )}
        </div>
        <aside
          className={
            closed && !trivial ? "dim-balance result" : "dim-balance controls"
          }
          aria-live="polite"
        >
          <strong>
            {trivial
              ? "Triviale Kombination Π = 1"
              : closed
                ? "Dimensionslos: vollständige Bilanz ist null"
                : "Noch dimensionsbehaftet"}
          </strong>
          <div className="dim-balance-product">
            <Product symbols={syms} powers={exps} />
          </div>
          <h3>Vollständige Dimensionsbilanz</h3>
          <MatrixEquation values={b} />
          <div className="dim-balance-axes">
            Reihenfolge: {names.join(", ")}
          </div>
        </aside>
      </div>
      <details>
        <summary>
          Synchronisierte Dimensionsmatrix und skalierte Beiträge
        </summary>
        <Matrix matrix={a.matrixOriginal} columns={syms} rows={names} />
        <Matrix
          matrix={a.matrixOriginal.map((r) => r.map((x, i) => mul(x, exps[i])))}
          columns={syms}
          rows={names}
        />
      </details>
    </>
  );
}
