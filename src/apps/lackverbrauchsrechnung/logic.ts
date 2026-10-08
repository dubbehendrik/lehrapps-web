export const METHODS = [
  "Festkörperdichte bekannt",
  "Festkörperdichte aus TDS abschätzen",
  "Direkt über Festkörpervolumen rechnen",
] as const;
export const PLANS = [
  "Taktzeit vorgeben",
  "Stück/h vorgeben",
  "Zielstückzahl vorgeben",
] as const;
export const PERIODS = ["Tag", "Woche", "Monat (Ø)", "Jahr"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULTS = {
  method: METHODS[0] as string,
  area: 1,
  thickness: 50,
  rho_fk: 1500,
  epsilon: 60,
  phi: 40,
  rho_lk: 1.25,
  mng: 50,
  price: 15,
  plan: PLANS[0] as string,
  takt: 7 / 6,
  rate: 60,
  target: 100000,
  pause: 10,
  shifts: 2,
  shift_hours: 8,
  net_hours: 7,
  days: 5,
  weeks: 48,
  period: "Jahr" as string,
};
export type Parameters = typeof DEFAULTS;
export type PeriodRow = { Zeitraum: Period } & Record<string, number | string>;
export function calculate(p: Parameters) {
  if (
    !METHODS.includes(p.method as (typeof METHODS)[number]) ||
    !PLANS.includes(p.plan as (typeof PLANS)[number]) ||
    !PERIODS.includes(p.period as Period)
  )
    throw Error("Unbekannter Rechenweg, Planungsmodus oder Zeitraum.");
  const active: (keyof Parameters)[] = [
    "area",
    "thickness",
    "rho_lk",
    "mng",
    "price",
    "pause",
    "shifts",
    "shift_hours",
    "net_hours",
    "days",
    "weeks",
    ...(p.method === METHODS[0]
      ? (["epsilon", "rho_fk"] as const)
      : p.method === METHODS[1]
        ? (["epsilon", "phi"] as const)
        : (["phi"] as const)),
    p.plan === PLANS[0] ? "takt" : p.plan === PLANS[1] ? "rate" : "target",
  ];
  for (const k of active) {
    const v = Number(p[k]);
    if (!Number.isFinite(v))
      throw Error("Bitte ausschließlich endliche Zahlen eingeben.");
    if (k !== "price" && k !== "pause" && v <= 0)
      throw Error(
        "Flächen, Dicken, Dichten, Anteile und Produktionsvorgaben müssen größer als null sein.",
      );
  }
  if (p.price < 0 || p.pause < 0)
    throw Error("Preis und Pause dürfen nicht negativ sein.");
  for (const k of ["epsilon", "phi", "mng"] as const)
    if (active.includes(k) && p[k] > 100)
      throw Error("Prozentangaben müssen größer als 0 und höchstens 100 sein.");
  if (p.net_hours > p.shift_hours)
    throw Error(
      "Die produktive Zeit darf die Schichtdauer nicht überschreiten.",
    );
  if (![1, 2, 3].includes(p.shifts) || p.shifts * p.shift_hours > 24)
    throw Error("Das Schichtmodell darf höchstens 24 Stunden je Tag belegen.");
  if (!Number.isInteger(p.days) || p.days > 7 || p.weeks > 52)
    throw Error(
      "Maximal 7 Arbeitstage je Woche und 52 Produktionswochen je Jahr.",
    );
  if (p.plan === PLANS[2] && !Number.isInteger(p.target))
    throw Error("Die Zielstückzahl muss ganzzahlig sein.");
  // SI material balance; percentages become fractions, µm become m, m³ become L.
  const eta = p.mng / 100,
    dryVolume = p.area * p.thickness * 1e-6;
  const rho_fk =
    p.method === METHODS[0]
      ? p.rho_fk
      : p.method === METHODS[1]
        ? (p.rho_lk * 1000 * p.epsilon) / p.phi
        : null;
  const ideal_piece =
    p.method === METHODS[0]
      ? (dryVolume * p.rho_fk) / (p.epsilon / 100) / p.rho_lk
      : (dryVolume / (p.phi / 100)) * 1000;
  const litres_piece = ideal_piece / eta,
    mass_piece = litres_piece * p.rho_lk,
    loss_piece = litres_piece - ideal_piece;
  const day = p.shifts * p.net_hours,
    week = day * p.days,
    year = week * p.weeks;
  const hours = [day, week, year / 12, year];
  const rate =
    p.plan === PLANS[0]
      ? 60 / p.takt
      : p.plan === PLANS[1]
        ? p.rate
        : p.target / hours[PERIODS.indexOf(p.period as Period)];
  const takt = p.plan === PLANS[0] ? p.takt : 60 / rate,
    spray = takt - p.pause / 60;
  if (spray <= 0)
    throw Error(
      "Die Pause muss kleiner als die Taktzeit sein. Für dieses Produktionsziel ist die Pause zu lang.",
    );
  const result = {
    rho_fk,
    mass_piece,
    litres_piece,
    loss_piece,
    ideal_piece,
    cost_piece: litres_piece * p.price,
    rate,
    takt,
    spray,
    area_min: (rate * p.area) / 60,
    kg_h: rate * mass_piece,
    litres_h: rate * litres_piece,
    litres_min: (rate * litres_piece) / 60,
    spray_litres_min: litres_piece / spray,
    spray_kg_min: mass_piece / spray,
  };
  const periods: PeriodRow[] = PERIODS.map((period, i) => {
    const count =
        p.plan === PLANS[2] && period === p.period ? p.target : rate * hours[i],
      volume = count * litres_piece,
      loss = count * loss_piece;
    return {
      Zeitraum: period,
      "Produktionszeit [h]": hours[i],
      "Stückzahl (rechnerisch)": count,
      "Vollständige Stücke": Math.floor(count + 1e-9),
      "Fläche [m²]": count * p.area,
      "Lackverbrauch [kg]": count * mass_piece,
      "Lackverbrauch [L]": volume,
      "Lackverlust [L]": loss,
      "Lackverlust [kg]": loss * p.rho_lk,
      "Lackkosten [€]": volume * p.price,
      "Verlustkosten [€]": loss * p.price,
    };
  });
  if (
    [...Object.values(result), ...periods.flatMap(Object.values)].some(
      (v) => typeof v === "number" && !Number.isFinite(v),
    )
  )
    throw Error(
      "Die Eingaben führen zu einem Zahlenüberlauf. Bitte kleinere Werte wählen.",
    );
  return { ...result, periods };
}
export type Result = ReturnType<typeof calculate>;
export type Scenario = {
  name: string;
  params: Parameters;
  color: string;
  preview?: boolean;
};
export const CHARTS = [
  "Kumulierter Lackverbrauch",
  "Kumulierte Lackkosten",
  "Materialnutzungsgrad",
] as const;
export function traces(entries: Scenario[], chart: string, period: Period) {
  return entries.flatMap((entry) => {
    const r = calculate(entry.params),
      row = r.periods.find((v) => v.Zeitraum === period)!;
    const sensitivity = chart === CHARTS[2],
      cost = chart === CHARTS[1];
    const x = Array.from({ length: sensitivity ? 200 : 101 }, (_, i) =>
      sensitivity
        ? 1 + (99 * i) / 199
        : (Number(row["Produktionszeit [h]"]) * i) / 100,
    );
    const ideal = (Number(row["Lackverbrauch [L]"]) * entry.params.mng) / 100;
    return [0, 1].map((index) => ({
      x,
      y: x.map((v) =>
        sensitivity
          ? ideal / (v / 100) - (index ? ideal : 0)
          : (v / Number(row["Produktionszeit [h]"])) *
            Number(
              row[
                cost
                  ? index
                    ? "Verlustkosten [€]"
                    : "Lackkosten [€]"
                  : index
                    ? "Lackverlust [L]"
                    : "Lackverbrauch [L]"
              ],
            ),
      ),
      type: "scatter" as const,
      mode: "lines" as const,
      name: `${entry.name} · ${cost ? (index ? "Verlustkosten" : "Gesamtkosten") : index ? "Verlust" : "Verbrauch"}`,
      line: {
        color: entry.color,
        width: 3,
        dash: index
          ? ("dot" as const)
          : entry.preview
            ? ("dash" as const)
            : ("solid" as const),
      },
    }));
  });
}
