import { lazy } from "react";
export const appCategories = [
  { id: "labor", label: "Fokus: Labor" },
  { id: "vorlesung", label: "Fokus: Vorlesung" },
  { id: "mathematik", label: "Fokus: Mathematik" },
] as const;
export const appRegistry = [
  { path: "/neuronale-netze", category: "mathematik", overviewOrder: 2, name: "Neuronale Netze", description: "Messdaten trainieren, Netzstrukturen verändern und Prognosen mit linearer Regression vergleichen.", component: lazy(() => import("./apps/neuronale-netze/App")) },
  { path: "/bayes-optimierung", category: "mathematik", overviewOrder: 1, name: "Bayes’sche Optimierung", description: "Messpunkte ergänzen, Modellunsicherheit untersuchen und nächste Versuche mit einem Gaußprozess vorschlagen lassen.", component: lazy(() => import("./apps/bayes-optimierung/App")) },
  {path: "/gitterschnitt", category: "labor", overviewOrder: 0, name: "Gitterschnitt", description: "Gitterschnittfotos entzerren, Abplatzungen auswerten und visuelle GT-Einstufungen mit Flächenanteilen vergleichen.", component: lazy(() => import("./apps/gitterschnitt/App"))},
  {
    path: "/waermeleitung-stab", category: "vorlesung", overviewOrder: 0,
    name: "Wärmeleitung im Stab",
    description: "Instationäre und stationäre Temperaturprofile in segmentierten Stäben mit frei wählbaren Rand- und Kontaktbedingungen untersuchen.",
    component: lazy(() => import("./apps/waermeleitung-stab/App")),
  },
  {
    path: "/vorbehandlungsverfahren", category: "vorlesung", overviewOrder: 1,
    name: "Vorbehandlungsverfahren",
    description: "Tauch- und Spritzentfettung auslegen, Energie- und Wasserbilanzen aufbauen und Schichtmodelle vergleichen.",
    component: lazy(() => import("./apps/vorbehandlungsverfahren/App")),
  },
  {
    path: "/gegenstromkaskade", category: "vorlesung", overviewOrder: 2,
    name: "Gegenstromkaskade",
    description: "Spülstufen ergänzen, Stoffströme und Konzentrationen verfolgen und den Frischwasserbedarf einer Gegenstromkaskade bestimmen.",
    component: lazy(() => import("./apps/gegenstromkaskade/App")),
  },
  {
    path: "/Temperaturverteilung", category: "labor", overviewOrder: 1,
    name: "Temperaturverteilung",
    description: "Abkühlung eines Quaders untersuchen, Temperaturfelder in verschiebbaren Schnitten betrachten und Biot- sowie Fourier-Zahlen vergleichen.",
    component: lazy(() => import("./apps/waermeleitung/App")),
  },
  {
    path: "/zerfallsarten", category: "vorlesung", overviewOrder: 3,
    name: "Zerfallsarten",
    description: "Kennzahlen und Filmdicke an einer Rotationsglocke berechnen und den Betriebspunkt im Zerfallsdiagramm untersuchen.",
    component: lazy(() => import("./apps/zerfallsarten/App")),
  },
  {
    path: "/flock-inspector", category: "labor", overviewOrder: 2,
    name: "Flock-Inspector",
    description:
      "Flockfasern in Bildern vermessen, Messreihen prüfen und mittlere Faserlängen statistisch vergleichen.",
    component: lazy(() => import("./apps/flock-inspector/App")),
  },
  {
    path: "/temperaturprofil", category: "labor", overviewOrder: 3,
    name: "Temperaturverläufe",
    description:
      "Wärmeübergangskoeffizienten aus Messdaten bestimmen und Temperaturverläufe simulieren und vergleichen.",
    component: lazy(() => import("./apps/temperaturprofil/App")),
  },
  {
    path: "/hx-diagramm", category: "vorlesung", overviewOrder: 4,
    name: "Mollier h,x-Diagramm",
    description:
      "Feuchte Luftzustände bestimmen und Erwärmen, Kühlen, Entfeuchten und Befeuchten im Mollier-Diagramm verfolgen.",
    component: lazy(() => import("./apps/hx-diagramm/App")),
  },
  {
    path: "/lackverbrauchsrechnung", category: "vorlesung", overviewOrder: 5,
    name: "Lackverbrauchsrechnung",
    description:
      "Lackbedarf, Verluste und Kosten berechnen und verschiedene Beschichtungsszenarien vergleichen.",
    component: lazy(() => import("./apps/lackverbrauchsrechnung/App")),
  },
  {
    path: "/normalverteilung", category: "mathematik", overviewOrder: 0,
    name: "Normalverteilung",
    description:
      "Wahrscheinlichkeiten für frei gewählte Intervalle der Standardnormalverteilung berechnen und als Fläche darstellen.",
    component: lazy(() => import("./apps/normalverteilung/App")),
  },
  {
    path: "/strahlbreite", category: "labor", overviewOrder: 4,
    name: "Strahlbreite",
    description:
      "Einzelstrahlprofile auswerten und untersuchen, wie Bahnabstand und Überlagerung die Schichtdickenverteilung beeinflussen.",
    component: lazy(() => import("./apps/strahlbreite/App")),
  },
];
