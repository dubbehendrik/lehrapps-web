import type { ProblemTemplate } from "./types";

export const problems: ProblemTemplate[] = [
  {
    name: "Rohrströmung",
    category: "Strömung",
    level: "Leicht",
    ids: ["rho", "v", "L", "eta", "dp"],
    text: "Der Druckverlust in einem geraden Rohr wird bei festgelegter relativer Rohrlänge und Rauheit durch Dichte, Geschwindigkeit, charakteristische Länge und dynamische Viskosität beschrieben.",
  },
  {
    name: "Umströmter Körper",
    category: "Strömung",
    level: "Leicht",
    ids: ["rho", "v", "L", "eta", "F"],
    text: "Die Widerstandskraft eines geometrisch ähnlichen Körpers hängt in inkompressibler Strömung von Dichte, Geschwindigkeit, charakteristischer Länge und Viskosität ab.",
  },
  {
    name: "Rührbehälter",
    category: "Strömung",
    level: "Mittel",
    ids: ["rho", "f", "L", "eta", "power"],
    text: "Für geometrisch ähnliche Rührbehälter soll die benötigte Leistung aus Dichte, Drehfrequenz, charakteristischer Länge und Viskosität beschrieben werden.",
  },
  {
    name: "Erzwungener Wärmeübergang",
    category: "Wärme",
    level: "Mittel",
    ids: ["rho", "v", "L", "eta", "lambda", "cp", "alpha"],
    text: "Der Wärmeübergangskoeffizient an einer geometrisch festgelegten Oberfläche soll aus Strömung, Geometrie und Fluidstoffwerten beschrieben werden.",
  },
  {
    name: "Abkühlung eines Festkörpers",
    category: "Wärme",
    level: "Mittel",
    ids: ["alpha", "L", "lambda", "a", "t"],
    text: "Die normierte Temperatur eines geometrisch ähnlichen Festkörpers wird durch Wärmeübergang, Wärmeleitung und die seit Beginn der Abkühlung vergangene Zeit bestimmt.",
  },
  {
    name: "Biot-Gruppe",
    category: "Wärme",
    level: "Leicht",
    ids: ["alpha", "L", "lambda"],
    text: "Das Verhältnis von innerem zu äußerem thermischen Widerstand wird durch Wärmeübergangskoeffizient, charakteristische Länge und Festkörperleitfähigkeit beschrieben.",
  },
  {
    name: "Stoffübergang",
    category: "Stofftransport",
    level: "Mittel",
    ids: ["rho", "v", "L", "eta", "D", "km"],
    text: "Der Stoffübergangskoeffizient an einer geometrisch festgelegten Oberfläche wird aus Strömungsgrößen und molekularem Diffusionskoeffizienten untersucht.",
  },
  {
    name: "Tropfenverformung",
    category: "Mehrphasen",
    level: "Leicht",
    ids: ["rho", "v", "L", "eta", "sigma"],
    text: "Die Verformung eines Flüssigkeitstropfens wird im vereinfachten Modell aus Dichte, Relativgeschwindigkeit, charakteristischer Länge, Viskosität und Oberflächenspannung untersucht; weitere Phaseneinflüsse bleiben fest.",
  },
  {
    name: "Sedimentation",
    category: "Mehrphasen",
    level: "Mittel",
    ids: ["rho", "drho", "g", "L", "eta", "v"],
    text: "Die stationäre Sinkgeschwindigkeit geometrisch ähnlicher Partikel hängt von Fluiddichte, Dichtedifferenz, Schwerkraft, charakteristischer Länge und Viskosität ab.",
  },
  {
    name: "Fluidisierung",
    category: "Mehrphasen",
    level: "Schwer",
    ids: ["rho", "drho", "g", "L", "eta", "v", "eps"],
    text: "Die Geschwindigkeit am Beginn der Fluidisierung wird bei gleicher Partikelform aus Fluiddichte, Dichtedifferenz, Schwerkraft, Partikelgröße, Viskosität und Porosität untersucht.",
  },
  {
    name: "Gedämpfte Schwingung",
    category: "Mechanik",
    level: "Mittel",
    ids: ["m", "spring", "damper", "f"],
    text: "Die Schwingungsfrequenz eines linearen viskos gedämpften Einmassenschwingers wird aus Masse, Federsteifigkeit und Dämpfungskoeffizient untersucht.",
  },
  {
    name: "Reaktion und Transport",
    category: "Reaktion",
    level: "Schwer",
    ids: ["k", "L", "v", "D"],
    text: "Eine isotherme Reaktion erster Ordnung in einem durchströmten Kanal wird durch Geschwindigkeitskonstante, charakteristische Länge, Geschwindigkeit und Diffusion beschrieben.",
  },
  {
    name: "Batteriepartikel: Diffusion und Ladezeit",
    category: "Elektrochemie & Batterien",
    level: "Leicht",
    ids: ["D", "L", "t"],
    text: "In einem idealisierten kugelförmigen Aktivmaterialpartikel erfolgt der Stofftransport ausschließlich durch Fick'sche Feststoffdiffusion mit konstantem D. Die charakteristische Länge L ist der Partikelradius; t ist die vorgegebene Ladezeit. Geometrie, normierte Anfangs- und Randbedingungen sind festgelegt. Gesucht ist eine Kennzahl für das Verhältnis von Diffusionszeit und Ladezeit.",
    questions: [
      "Wie ändert sich das Zeitverhältnis bei halbiertem Partikelradius und unverändertem D und t?",
    ],
    groups: [
      {
        label: "Π_D",
        powers: { L: 2, D: -1, t: -1 },
        interpretation:
          "L²/(D·t) vergleicht die Diffusionszeitskala mit der Ladezeit. Bei Halbierung des Radius sinkt diese Gruppe auf ein Viertel. Große Werte zeigen eine gegenüber der Ladezeit langsame Diffusion an. Der Kehrwert ist die Diffusions-Fourier-Zahl; eine quantitative Ausnutzung erfordert die Lösung des Transportmodells.",
      },
    ],
  },
  {
    name: "Batterie: Ladungsumsatz und C-Rate",
    category: "Elektrochemie & Batterien",
    level: "Leicht",
    ids: ["current", "charge", "t"],
    text: "Eine Batterie mit nominaler Ladungskapazität Q_nom wird idealisiert mit konstantem Strombetrag I über die Zeit t entladen. Die Kapazität wird in Coulomb angegeben; 1 Ah entspricht 3600 C. Nebenreaktionen und spannungsabhängige Abschaltgrenzen werden für diese Ladungsbilanz vernachlässigt.",
    questions: [
      "Ist I/Q_nom bereits dimensionslos? Welche zusätzliche Größe fehlt?",
    ],
    groups: [
      {
        label: "Π_Q",
        powers: { current: 1, t: 1, charge: -1 },
        interpretation:
          "I·t/Q_nom ist der umgesetzte Anteil der nominalen Ladung. I/Q_nom allein hat die Dimension einer inversen Zeit. Erst mit einer Referenzzeit entsteht eine dimensionslose Gruppe. Eine tatsächliche Entladezeit bis zur Abschaltspannung folgt daraus nicht.",
      },
    ],
  },
  {
    name: "Elektrode: kinetische und transportbedingte Strombelastung",
    category: "Elektrochemie & Batterien",
    level: "Leicht",
    ids: ["j", "j0", "jlim"],
    text: "Für eine einzelne Elektrodenreaktion werden der lokale Stromdichtebetrag j, die Austauschstromdichte j_0 und der Betrag der Grenzstromdichte j_lim betrachtet. Alle drei beziehen sich auf dieselbe Grenzfläche und denselben Bezugszustand. Die Kennzahlen sollen kinetische Beanspruchung und Transportauslastung unterscheiden.",
    questions: [
      "Warum ergeben drei Größen mit derselben Dimension zwei unabhängige Gruppen?",
      "Sind j/j_0 und j_0/j_lim ebenfalls eine vollständige Basis?",
    ],
    groups: [
      {
        label: "Π_kin",
        powers: { j: 1, j0: -1 },
        interpretation:
          "j/j_0 beschreibt die Strombelastung relativ zur Austauschstromdichte. Eine Überspannung lässt sich daraus erst mit einer festgelegten Reaktionskinetik bestimmen.",
      },
      {
        label: "Π_lim",
        powers: { j: 1, jlim: -1 },
        interpretation:
          "j/j_lim beschreibt die Auslastung des betrachteten Stofftransportlimits. Ein kleiner Wert schließt kinetische Verluste nicht aus. Auch j/j_0 und j_0/j_lim bilden eine Basis; ihr Produkt ergibt j/j_lim.",
      },
    ],
    sources: [
      {
        title: "COMSOL: Butler–Volmer-Kinetik und Stromverteilung",
        url: "https://www.comsol.com/blogs/the-art-and-science-of-electrochemical-plating",
      },
    ],
  },
  {
    name: "Stromverteilung: Wagner-Zahl",
    category: "Elektrochemie & Batterien",
    level: "Mittel",
    ids: ["conduct", "rpArea", "L"],
    text: "In einer geometrisch ähnlichen elektrochemischen Zelle werden Konzentrationsgradienten und Spannungsabfälle in der Metallelektrode vernachlässigt. Der Elektrolyt besitzt die Leitfähigkeit κ_e. Die Elektrodenkinetik wird am Arbeitspunkt durch den positiven flächenspezifischen differentiellen Polarisationswiderstand r_p = ∂η_el/∂j beschrieben. L ist die charakteristische Zelllänge.",
    questions: [
      "Welche Stromverteilung ist bei einer großen Wagner-Zahl unter diesen Voraussetzungen eher zu erwarten?",
    ],
    groups: [
      {
        label: "Wa",
        powers: { conduct: 1, rpArea: 1, L: -1 },
        interpretation:
          "Wa = κ_e·r_p/L vergleicht den flächenspezifischen Polarisationswiderstand mit L/κ_e. Eine größere Wagner-Zahl begünstigt unter den genannten Annahmen eine gleichmäßigere Stromverteilung. r_p hat die Einheit Ω·m² und darf nicht durch einen Gesamtwiderstand in Ω ersetzt werden.",
      },
    ],
    sources: [
      {
        title: "COMSOL: Definition und Interpretation der Wagner-Zahl",
        url: "https://www.comsol.com/blogs/the-art-and-science-of-electrochemical-plating",
      },
    ],
  },
  {
    name: "Elektrodenkinetik: dimensionslose Überspannung",
    category: "Elektrochemie & Batterien",
    level: "Mittel",
    ids: ["etaEl", "faraday", "gasConstant", "temperature"],
    text: "Die elektrochemische Überspannung η_el soll gegenüber der thermischen Spannung normiert werden. Betrachtet wird eine Reaktion mit fest vorgegebener Elektronenzahl n = 1. Als dimensionale Größen werden η_el, die Faraday-Konstante F_F, die universelle Gaskonstante R_g und die absolute Temperatur T verwendet. Die physikalischen Konstanten gehören zum Variablensatz der Dimensionsanalyse, auch wenn ihre Werte im Experiment fest sind.",
    questions: [
      "Warum muss die Temperatur in Kelvin eingesetzt werden?",
      "Was ändert sich an der Anzahl der Π-Gruppen, wenn eine variable dimensionslose Elektronenzahl n zusätzlich in den Größensatz aufgenommen wird?",
    ],
    groups: [
      {
        label: "Π_η",
        powers: { etaEl: 1, faraday: 1, gasConstant: -1, temperature: -1 },
        interpretation:
          "F_F·η_el/(R_g·T) ist für n = 1 die normierte Überspannung. In der Butler–Volmer-Gleichung kommen zusätzlich die Transferkoeffizienten hinzu. Die absolute Temperatur wird benötigt, weil R_g·T eine molare Energieskala ist. Ein zusätzlich als variabel aufgenommenes dimensionsloses n erhöht die Anzahl unabhängiger Π-Gruppen um eins; eine fest vorgegebene Zahl wird hier nicht als eigene Variable gezählt.",
      },
    ],
    sources: [
      {
        title: "COMSOL: Elektrochemische Kinetik und thermische Spannung",
        url: "https://doc.comsol.com/6.4/doc/com.comsol.help.models.echem.impedance_spectroscopy/impedance_spectroscopy.html",
      },
    ],
  },
  {
    name: "Grenzstrom: ebene Diffusionsschicht",
    category: "Elektrochemie & Batterien",
    level: "Schwer",
    ids: ["j", "faraday", "D", "conc", "L"],
    text: "Ein gelöster elektroaktiver Stoff diffundiert stationär durch eine ebene Schicht der Dicke L mit konstantem Diffusionskoeffizienten D. Die Stoffmengenkonzentration im Reservoir ist c_A; die Elektronenzahl ist fest n = 1. Ein großer Überschuss an Leitelektrolyt unterdrückt den Migrationsbeitrag des betrachteten Stoffes. In der Schicht gibt es keine Konvektion oder homogene Reaktion. j ist der Betrag der faradaischen Stromdichte dieser Reaktion.",
    questions: [
      "Welche zusätzliche Randbedingung wird benötigt, um aus der Stromskalierung einen konkreten Grenzstrom abzuleiten?",
      "Warum ist dieses Modell nicht ohne Weiteres auf einen konzentrierten Batterieelektrolyten übertragbar?",
    ],
    groups: [
      {
        label: "Π_j",
        powers: { j: 1, L: 1, faraday: -1, D: -1, conc: -1 },
        interpretation:
          "j·L/(F_F·D·c_A) normiert die Stromdichte mit der diffusiven Versorgung. Für verschwindende Oberflächenkonzentration ergibt die stationäre ebene Fick-Lösung bei n = 1 den Grenzstrom j_lim = F_F·D·c_A/L und damit Π_j = j/j_lim. Dieser Vorfaktor folgt aus den Modellgleichungen und Randbedingungen, nicht allein aus Buckingham. Migration und Mehrkomponentenwechselwirkungen erfordern ein erweitertes Modell.",
      },
    ],
    sources: [
      {
        title:
          "COMSOL: Fick-Transport, Faraday-Beziehung und Leitelektrolytannahme",
        url: "https://doc.comsol.com/6.4/doc/com.comsol.help.models.echem.impedance_spectroscopy/impedance_spectroscopy.html",
      },
    ],
  },
  {
    name: "EIS: Diffusionszeitskala",
    category: "Elektrochemie & Batterien",
    level: "Mittel",
    ids: ["angularFrequency", "L", "D"],
    text: "Eine kleine harmonische Anregung untersucht die Diffusion in einer Schicht oder einem Partikel mit charakteristischer Länge L und konstantem D. Geometrie und Randbedingungen bleiben fest. ω = 2πf ist die Kreisfrequenz der elektrischen Anregung in rad/s.",
    questions: [
      "Wie muss sich die Anregungsfrequenz ändern, wenn bei gleichem D die Länge verdoppelt und die dimensionslose Frequenz konstant gehalten wird?",
    ],
    groups: [
      {
        label: "Ω_D",
        powers: { angularFrequency: 1, L: 2, D: -1 },
        interpretation:
          "ω·L²/D vergleicht die Diffusionszeitskala mit 1/ω. Bei verdoppelter Länge muss ω auf ein Viertel sinken. Kleine Werte erlauben dem Diffusionsprozess eher einen Ausgleich über L während der Anregung; die konkrete Impedanzform hängt von Geometrie und Randbedingungen ab.",
      },
    ],
    sources: [
      {
        title: "COMSOL: EIS und diffusive Zeitskalen",
        url: "https://doc.comsol.com/6.4/doc/com.comsol.help.models.echem.impedance_spectroscopy/impedance_spectroscopy.html",
      },
    ],
  },
  {
    name: "EIS: Ladungsübertragung und Doppelschicht",
    category: "Elektrochemie & Batterien",
    level: "Mittel",
    ids: ["angularFrequency", "rct", "cdl"],
    text: "Ein vereinfachtes lineares Elektrodenmodell besteht aus einem Ladungsübertragungswiderstand R_ct parallel zu einer idealen Doppelschichtkapazität C_dl. Beide Größen beziehen sich auf dieselbe gesamte Grenzfläche. Stofftransportbegrenzung und weitere Elemente werden vernachlässigt. ω = 2πf ist die Kreisfrequenz der elektrischen Anregung.",
    questions: [
      "Welche Frequenz ergibt sich für das Maximum des Betrags des Imaginärteils dieses idealen Parallelelements?",
    ],
    groups: [
      {
        label: "Ω_RC",
        powers: { angularFrequency: 1, rct: 1, cdl: 1 },
        interpretation:
          "ω·R_ct·C_dl normiert die Frequenz mit der RC-Zeitkonstante. Für das ideale Parallelelement liegt das Maximum von −Im(Z) bei Ω_RC = 1 und somit f = 1/(2π·R_ct·C_dl). Die Zahl 1 folgt aus dem Ersatzschaltbild; Dimensionsanalyse allein bestimmt sie nicht. Ein flächenspezifischer Widerstand und eine Gesamtkapazität dürfen nicht vermischt werden.",
      },
    ],
    sources: [
      {
        title: "COMSOL: EIS und Doppelschichtkapazität",
        url: "https://doc.comsol.com/6.4/doc/com.comsol.help.models.echem.impedance_spectroscopy/impedance_spectroscopy.html",
      },
    ],
  },
  {
    name: "Beheizter Behälter: Leistung und Wärmeverlust",
    category: "Wärme",
    level: "Leicht",
    ids: ["power", "alpha", "A", "dt"],
    text: "Ein gut durchmischter Behälter mit Oberfläche A wird mit konstanter Leistung P beheizt. Im vereinfachten stationären Modell geht Wärme ausschließlich durch Konvektion mit konstantem Wärmeübergangskoeffizienten α an die Umgebung verloren. ΔT ist der positive Betrag der Temperaturdifferenz zwischen Behälter und Umgebung. Strahlung, Verdampfung und Energiespeicherung werden vernachlässigt.",
    questions: [
      "Welche zusätzliche Bilanz ist nötig, um den Wert der Gruppe im stationären Zustand festzulegen?",
    ],
    groups: [
      {
        label: "Π_P",
        powers: { power: 1, alpha: -1, A: -1, dt: -1 },
        interpretation:
          "P/(α·A·ΔT) vergleicht die Heizleistung mit dem konvektiven Wärmeverlust. Die stationäre Energiebilanz des angenommenen Modells liefert den Wert 1. Ein Aufheizverlauf lässt sich ohne Wärmekapazität des Systems nicht beschreiben.",
      },
    ],
  },
  {
    name: "Beschichtung: viskose und kapillare Spannungen",
    category: "Mehrphasen",
    level: "Leicht",
    ids: ["eta", "v", "sigma"],
    text: "Beim langsamen Beschichten eines Substrats werden viskose und kapillare Effekte einer Newton'schen Flüssigkeit verglichen. Maßgeblich sind dynamische Viskosität η, Bahngeschwindigkeit v und Oberflächenspannung σ. Geometrie und Benetzungszustand werden festgehalten; Trägheit und Schwerkraft sind in der betrachteten Skalierung vernachlässigbar.",
    questions: [
      "Warum kann aus diesen drei Größen allein keine dimensionale Filmdicke bestimmt werden?",
    ],
    groups: [
      {
        label: "Ca",
        powers: { eta: 1, v: 1, sigma: -1 },
        interpretation:
          "Die Kapillarzahl η·v/σ vergleicht viskose mit kapillaren Einflüssen. Im ausgewählten Größensatz fehlt eine unabhängige Längenskala zur Vorhersage einer dimensionalen Filmdicke. Weitere Größen wie Geometrie oder eine aus Schwerkraft und Dichte gebildete kapillare Länge sind dafür erforderlich.",
      },
    ],
  },
  {
    name: "Tropfen: kapillare Schwingungszeit",
    category: "Mehrphasen",
    level: "Mittel",
    ids: ["rho", "L", "sigma", "t"],
    text: "Ein geringfügig verformter Tropfen schwingt durch das Zusammenspiel von Trägheit und Oberflächenspannung. L ist sein Ruheradius, ρ die Flüssigkeitsdichte und t eine charakteristische Schwingungszeit. Viskosität, Schwerkraft sowie Dichte und Viskosität der Umgebung werden vernachlässigt. Die betrachtete Schwingungsmode bleibt fest.",
    questions: [
      "Wie skaliert die Schwingungszeit bei verdoppeltem Tropfenradius und sonst gleichen Bedingungen?",
    ],
    groups: [
      {
        label: "Π_t",
        powers: { t: 1, sigma: 0.5, rho: -0.5, L: -1.5 },
        interpretation:
          "t·√(σ/(ρ·L³)) ist eine dimensionslose Schwingungszeit. Für dieselbe Mode folgt t ∝ √(ρ·L³/σ); bei verdoppeltem Radius wächst die Zeit um den Faktor √8. Der modenspezifische Vorfaktor folgt erst aus der Schwingungsanalyse.",
      },
    ],
  },
  {
    name: "Filtration: Druckverlust in einer porösen Schicht",
    category: "Strömung",
    level: "Schwer",
    ids: ["dp", "eta", "L", "perm", "v"],
    text: "Eine Newton'sche Flüssigkeit strömt stationär mit der oberflächlichen Geschwindigkeit v durch eine homogene poröse Schicht der Dicke L und Permeabilität K_P. Gesucht ist der viskose Druckverlust Δp. Inertiale Effekte, Schwerkraft und Randeffekte werden vernachlässigt. Die angenommene lokale Stoffbeziehung soll anschließend mit dem Darcy-Modell verglichen werden.",
    questions: [
      "Welche zwei unabhängigen Gruppen lassen sich bilden?",
      "Welche zusätzliche physikalische Aussage macht das Darcy-Modell über die Beziehung zwischen den Gruppen?",
    ],
    groups: [
      {
        label: "Π_p",
        powers: { dp: 1, perm: 1, eta: -1, v: -1, L: -1 },
        interpretation:
          "Δp·K_P/(η·v·L) normiert den Druckverlust. Das Darcy-Modell liefert hierfür den Wert 1. Dies ist eine zusätzliche Stoff- und Modellannahme, keine Folgerung allein aus Buckingham.",
      },
      {
        label: "Π_K",
        powers: { perm: 1, L: -2 },
        interpretation:
          "K_P/L² vergleicht die Permeabilität mit der quadratischen Schichtdicke. Dimensionsanalyse erlaubt grundsätzlich eine Abhängigkeit der ersten Gruppe von dieser zweiten. Das idealisierte lokale Darcy-Modell legt eine davon unabhängige erste Gruppe fest.",
      },
    ],
  },
];
