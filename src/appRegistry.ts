import { lazy } from "react";
export const appRegistry = [
  {
    path: "/normalverteilung",
    name: "Normalverteilung",
    component: lazy(() => import("./apps/normalverteilung/App")),
  },
  {
    path: "/strahlbreite",
    name: "Strahlbreite",
    component: lazy(() => import("./apps/strahlbreite/App")),
  },
];
