import { lazy } from "react";
export const appRegistry = [
  {
    path: "/lackverbrauchsrechnung",
    name: "Lackverbrauchsrechnung",
    description: "Lackbedarf, Verluste und Kosten berechnen und verschiedene Beschichtungsszenarien vergleichen.",
    component: lazy(() => import("./apps/lackverbrauchsrechnung/App")),
  },
  {
    path: "/normalverteilung",
    name: "Normalverteilung",
    description: "Wahrscheinlichkeiten für frei gewählte Intervalle der Standardnormalverteilung berechnen und als Fläche darstellen.",
    component: lazy(() => import("./apps/normalverteilung/App")),
  },
  {
    path: "/strahlbreite",
    name: "Strahlbreite",
    description: "Einzelstrahlprofile auswerten und untersuchen, wie Bahnabstand und Überlagerung die Schichtdickenverteilung beeinflussen.",
    component: lazy(() => import("./apps/strahlbreite/App")),
  },
];
