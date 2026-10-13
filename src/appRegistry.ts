import { lazy } from "react";
export const appRegistry = [
  {path: "/gitterschnitt", name: "Gitterschnitt", description: "Gitterschnittfotos entzerren, Abplatzungen auswerten und visuelle GT-Einstufungen mit Flächenanteilen vergleichen.", component: lazy(() => import("./apps/gitterschnitt/App"))},
  {
    path: "/waermeleitung-stab",
    name: "Wärmeleitung im Stab",
    description: "Instationäre und stationäre Temperaturprofile in segmentierten Stäben mit frei wählbaren Rand- und Kontaktbedingungen untersuchen.",
    component: lazy(() => import("./apps/waermeleitung-stab/App")),
  },
  {
    path: "/vorbehandlungsverfahren",
    name: "Vorbehandlungsverfahren",
    description: "Tauch- und Spritzentfettung auslegen, Energie- und Wasserbilanzen aufbauen und Schichtmodelle vergleichen.",
    component: lazy(() => import("./apps/vorbehandlungsverfahren/App")),
  },
  {
    path: "/gegenstromkaskade",
    name: "Gegenstromkaskade",
    description: "Spülstufen ergänzen, Stoffströme und Konzentrationen verfolgen und den Frischwasserbedarf einer Gegenstromkaskade bestimmen.",
    component: lazy(() => import("./apps/gegenstromkaskade/App")),
  },
  {
    path: "/Temperaturverteilung",
    name: "Temperaturverteilung",
    description: "Abkühlung eines Quaders untersuchen, Temperaturfelder in verschiebbaren Schnitten betrachten und Biot- sowie Fourier-Zahlen vergleichen.",
    component: lazy(() => import("./apps/waermeleitung/App")),
  },
  {
    path: "/zerfallsarten",
    name: "Zerfallsarten",
    description: "Kennzahlen und Filmdicke an einer Rotationsglocke berechnen und den Betriebspunkt im Zerfallsdiagramm untersuchen.",
    component: lazy(() => import("./apps/zerfallsarten/App")),
  },
  {
    path: "/flock-inspector",
    name: "Flock-Inspector",
    description:
      "Flockfasern in Bildern vermessen, Messreihen prüfen und mittlere Faserlängen statistisch vergleichen.",
    component: lazy(() => import("./apps/flock-inspector/App")),
  },
  {
    path: "/temperaturprofil",
    name: "Temperaturverläufe",
    description:
      "Wärmeübergangskoeffizienten aus Messdaten bestimmen und Temperaturverläufe simulieren und vergleichen.",
    component: lazy(() => import("./apps/temperaturprofil/App")),
  },
  {
    path: "/hx-diagramm",
    name: "Mollier h,x-Diagramm",
    description:
      "Feuchte Luftzustände bestimmen und Erwärmen, Kühlen, Entfeuchten und Befeuchten im Mollier-Diagramm verfolgen.",
    component: lazy(() => import("./apps/hx-diagramm/App")),
  },
  {
    path: "/lackverbrauchsrechnung",
    name: "Lackverbrauchsrechnung",
    description:
      "Lackbedarf, Verluste und Kosten berechnen und verschiedene Beschichtungsszenarien vergleichen.",
    component: lazy(() => import("./apps/lackverbrauchsrechnung/App")),
  },
  {
    path: "/normalverteilung",
    name: "Normalverteilung",
    description:
      "Wahrscheinlichkeiten für frei gewählte Intervalle der Standardnormalverteilung berechnen und als Fläche darstellen.",
    component: lazy(() => import("./apps/normalverteilung/App")),
  },
  {
    path: "/strahlbreite",
    name: "Strahlbreite",
    description:
      "Einzelstrahlprofile auswerten und untersuchen, wie Bahnabstand und Überlagerung die Schichtdickenverteilung beeinflussen.",
    component: lazy(() => import("./apps/strahlbreite/App")),
  },
];
