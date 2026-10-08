import { lazy } from "react";
export const appRegistry = [
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
