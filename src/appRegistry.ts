import { lazy } from "react";
export const appTags = [
  { id: "labor", label: "Labor" },
  { id: "vorlesung", label: "Vorlesung" },
  { id: "mathematik", label: "Mathematik & Statistik" },
  { id: "automatisierung", label: "Automatisierung" },
  { id: "applikationstechnik", label: "Applikationstechnik" },
  { id: "anlagentechnik", label: "Anlagentechnik" },
  { id: "verfahrenstechnik", label: "Verfahrenstechnik" },
] as const;
export const appRegistry = [
  { path: "/pulverkreislauf", tags: ["vorlesung", "applikationstechnik"],
    name: "Pulverkreislauf", description: "Partikelgrößenverteilungen und Pulverrückführung mit einer größenaufgelösten Massenbilanz untersuchen.", component: lazy(() => import("./apps/pulverkreislauf/App")) },
  { path: "/tropfengroessenverteilung", tags: ["vorlesung", "applikationstechnik", "anlagentechnik"],
    name: "Tropfengrößenverteilung", description: "Anzahl-, Längen-, Oberflächen- und Volumenverteilungen vergleichen, Klassenbreiten verändern und Quantile sowie Sauter-Durchmesser aus Einzeltropfen bestimmen.", component: lazy(() => import("./apps/tropfengroessenverteilung/App")) },
  { path: "/mehrfachspuele", tags: ["vorlesung", "anlagentechnik"],
    name: "Mehrfachspüle", description: "Standspülen vergleichen, Verschmutzung über Tauchschritte verfolgen und Badwechsel als kommentierte Eingriffe untersuchen. Szenarien als Excel-Modellstand speichern und laden.", component: lazy(() => import("./apps/mehrfachspuele/App")) },
  { path: "/laminar-turbulent", tags: ["vorlesung", "verfahrenstechnik"],
    name: "Laminar-Turbulent Übergang (schematisch)", description: "Laminare Rohrströmung, Querbewegung und vorübergehende Verstärkung kleiner Störungen mit Fluidelementen und Kraftbildern untersuchen.", component: lazy(() => import("./apps/laminar-turbulent/App")) },
  { path: "/bls-bahnplanung", tags: ["vorlesung", "automatisierung", "applikationstechnik", "anlagentechnik"],
    name: "BLS Bahnplanung (Demo)", description: "BLS-Kabine erkunden, Rund- und Flachstrahl einstellen und Schichtaufbau bei Einzelbahn, Mäander und Kreuzgang untersuchen.", component: lazy(() => import("./apps/bls-bahnplanung/App")) },
  { path: "/roboter-bahnplanung", tags: ["automatisierung", "applikationstechnik", "anlagentechnik"],
    name: "Roboter Bahnplanung (Demo)", description: "Rotationssymmetrische Spritzbilder einstellen, 2D- und 3D-Bahnszenarien untersuchen und generische Trockenschichtdicken in µm vergleichen. Literaturgestütztes Lehrmodell, keine reale Roboterbahnplanung.", component: lazy(() => import("./apps/roboter-bahnplanung/App")) },
  { path: "/collatz-visualizer", tags: ["mathematik"],
    name: "Collatz-Visualizer", description: "Collatz-Folgen, inverse Bäume, Binärdarstellungen und affine Transformationsräume erkunden.", component: lazy(() => import("./apps/collatz-visualizer/App")) },
  { path: "/dimensionsanalyse", tags: ["vorlesung", "verfahrenstechnik"],
    name: "Dimensionsanalyse", description: "Dimensionslose Kennzahlen einschließlich Elektrochemie und Batterien nachschlagen, Buckingham-Π-Aufgaben lösen und Dimensionsräume mit interaktiven Vektorzügen untersuchen.", component: lazy(() => import("./apps/dimensionsanalyse/App")) },
  { path: "/filmstroemung-glockenteller", tags: ["vorlesung", "applikationstechnik"],
    name: "Filmströmung auf Glockenteller", description: "Filmdicke, Geschwindigkeit und Rheologie vergleichen und die strukturviskose Filmströmung schrittweise iterieren.", component: lazy(() => import("./apps/filmstroemung-glockenteller/App")) },
  { path: "/tropfenflug", tags: ["vorlesung", "applikationstechnik", "anlagentechnik"],
    name: "Tropfenflug am Hochrotationszerstäuber", description: "Flugbahnen geladener Lacktropfen, Kraftvektoren und die idealisierte Luftumströmung frei gezeichneter Werkstücke untersuchen.", component: lazy(() => import("./apps/tropfenflug/App")) },
  { path: "/klebstoffauftrag", tags: ["labor"],
    name: "Klebstoffauftrag", description: "Beflockungsvorrichtungen bemaßen, Werkstattzeichnungen exportieren und Klebstoffvorlagen in Auftragsszenarien untersuchen.", component: lazy(() => import("./apps/klebstoffauftrag/App")) },
  { path: "/neuronale-netze", tags: ["mathematik"],
    name: "Neuronale Netze", description: "Messdaten trainieren, Netzstrukturen verändern und Prognosen mit linearer Regression vergleichen.", component: lazy(() => import("./apps/neuronale-netze/App")) },
  { path: "/bayes-optimierung", tags: ["labor", "mathematik"],
    name: "Bayes’sche Optimierung", description: "Messpunkte ergänzen, Modellunsicherheit untersuchen und nächste Versuche mit einem Gaußprozess vorschlagen lassen.", component: lazy(() => import("./apps/bayes-optimierung/App")) },
  {path: "/gitterschnitt", tags: ["labor"],
    name: "Gitterschnitt", description: "Gitterschnittfotos entzerren, Abplatzungen auswerten und visuelle GT-Einstufungen mit Flächenanteilen vergleichen.", component: lazy(() => import("./apps/gitterschnitt/App"))},
  {
    path: "/waermeleitung-stab", tags: ["vorlesung", "verfahrenstechnik"],
    name: "Wärmeleitung im Stab",
    description: "Instationäre und stationäre Temperaturprofile in segmentierten Stäben mit frei wählbaren Rand- und Kontaktbedingungen untersuchen.",
    component: lazy(() => import("./apps/waermeleitung-stab/App")),
  },
  {
    path: "/vorbehandlungsverfahren", tags: ["vorlesung", "anlagentechnik"],
    name: "Vorbehandlungsverfahren",
    description: "Tauch- und Spritzentfettung auslegen, Energie- und Wasserbilanzen aufbauen und Schichtmodelle vergleichen.",
    component: lazy(() => import("./apps/vorbehandlungsverfahren/App")),
  },
  {
    path: "/gegenstromkaskade", tags: ["vorlesung", "anlagentechnik"],
    name: "Gegenstromkaskade",
    description: "Spülstufen ergänzen, Stoffströme und Konzentrationen verfolgen und den Frischwasserbedarf einer Gegenstromkaskade bestimmen.",
    component: lazy(() => import("./apps/gegenstromkaskade/App")),
  },
  {
    path: "/Temperaturverteilung", tags: ["labor", "applikationstechnik", "anlagentechnik"],
    name: "Temperaturverteilung",
    description: "Abkühlung eines Quaders untersuchen, Temperaturfelder in verschiebbaren Schnitten betrachten und Biot- sowie Fourier-Zahlen vergleichen.",
    component: lazy(() => import("./apps/waermeleitung/App")),
  },
  {
    path: "/zerfallsarten", tags: ["vorlesung", "anlagentechnik"],
    name: "Zerfallsarten",
    description: "Kennzahlen und Filmdicke an einer Rotationsglocke berechnen und den Betriebspunkt im Zerfallsdiagramm untersuchen.",
    component: lazy(() => import("./apps/zerfallsarten/App")),
  },
  {
    path: "/flock-inspector", tags: ["labor"],
    name: "Flock-Inspector",
    description:
      "Flockfasern in Bildern vermessen, Messreihen prüfen und mittlere Faserlängen statistisch vergleichen.",
    component: lazy(() => import("./apps/flock-inspector/App")),
  },
  {
    path: "/temperaturprofil", tags: ["labor", "applikationstechnik", "anlagentechnik"],
    name: "Temperaturverläufe",
    description:
      "Wärmeübergangskoeffizienten aus Messdaten bestimmen und Temperaturverläufe simulieren und vergleichen.",
    component: lazy(() => import("./apps/temperaturprofil/App")),
  },
  {
    path: "/hx-diagramm", tags: ["vorlesung", "anlagentechnik"],
    name: "Mollier h,x-Diagramm",
    description:
      "Feuchte Luftzustände bestimmen und Erwärmen, Kühlen, Entfeuchten und Befeuchten im Mollier-Diagramm verfolgen.",
    component: lazy(() => import("./apps/hx-diagramm/App")),
  },
  {
    path: "/lackverbrauchsrechnung", tags: ["vorlesung", "applikationstechnik", "anlagentechnik"],
    name: "Lackverbrauchsrechnung",
    description:
      "Lackbedarf, Verluste und Kosten berechnen und verschiedene Beschichtungsszenarien vergleichen.",
    component: lazy(() => import("./apps/lackverbrauchsrechnung/App")),
  },
  {
    path: "/normalverteilung", tags: ["mathematik"],
    name: "Normalverteilung",
    description:
      "Wahrscheinlichkeiten für frei gewählte Intervalle der Standardnormalverteilung berechnen und als Fläche darstellen.",
    component: lazy(() => import("./apps/normalverteilung/App")),
  },
  {
    path: "/strahlbreite", tags: ["labor", "applikationstechnik", "anlagentechnik"],
    name: "Strahlbreite",
    description:
      "Einzelstrahlprofile auswerten und untersuchen, wie Bahnabstand und Überlagerung die Schichtdickenverteilung beeinflussen.",
    component: lazy(() => import("./apps/strahlbreite/App")),
  },
];

