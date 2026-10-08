"""Unit-safe material balance and production planning (SI internally)."""
from math import floor, isfinite

METHODS = ("Festkörperdichte bekannt", "Festkörperdichte aus TDS abschätzen",
           "Direkt über Festkörpervolumen rechnen")
PLANS = ("Taktzeit vorgeben", "Stück/h vorgeben", "Zielstückzahl vorgeben")
PERIODS = ("Tag", "Woche", "Monat (Ø)", "Jahr")
DEFAULTS = dict(method=METHODS[0], area=1.0, thickness=50.0, rho_fk=1500.0,
                epsilon=60.0, phi=40.0, rho_lk=1.25, mng=50.0, price=15.0,
                plan=PLANS[0], takt=7 / 6, rate=60.0, target=100000,
                pause=10.0, shifts=2, shift_hours=8.0, net_hours=7.0,
                days=5, weeks=48.0, period="Jahr")
UNITS = dict(area="m²/Stück", thickness="µm", rho_fk="kg/m³", epsilon="Gew.-%",
             phi="Vol.-%", rho_lk="kg/L", mng="%", price="€/L", takt="min/Stück",
             rate="Stück/h", target="Stück/Zeitraum", pause="s", shifts="Schichten/Tag",
             shift_hours="h/Schicht", net_hours="h/Schicht", days="Tage/Woche",
             weeks="Wochen/Jahr")


def operating_hours(p):
    day = p["shifts"] * p["net_hours"]
    week = day * p["days"]
    year = week * p["weeks"]
    return dict(zip(PERIODS, (day, week, year / 12, year)))


def calculate(p):
    """Inputs use units in UNITS. Rates apply to available production time."""
    active = ["area", "thickness", "rho_lk", "mng", "price", "pause", "shifts",
              "shift_hours", "net_hours", "days", "weeks"]
    if p["method"] not in METHODS or p["plan"] not in PLANS or p["period"] not in PERIODS:
        raise ValueError("Unbekannter Rechenweg, Planungsmodus oder Zeitraum.")
    active += {METHODS[0]: ["epsilon", "rho_fk"], METHODS[1]: ["epsilon", "phi"],
               METHODS[2]: ["phi"]}[p["method"]]
    active.append({PLANS[0]: "takt", PLANS[1]: "rate", PLANS[2]: "target"}[p["plan"]])
    if any(not isfinite(p[k]) for k in active):
        raise ValueError("Bitte ausschließlich endliche Zahlen eingeben.")
    for k in active:
        if k not in ("price", "pause") and p[k] <= 0:
            raise ValueError(f"{k} [{UNITS.get(k, '')}] muss größer als null sein.")
    if p["price"] < 0 or p["pause"] < 0:
        raise ValueError("Preis und Pause dürfen nicht negativ sein.")
    for k in ("epsilon", "phi", "mng"):
        if k in active and p[k] > 100:
            raise ValueError("Prozentangaben müssen größer als 0 und höchstens 100 sein.")
    if p["net_hours"] > p["shift_hours"]:
        raise ValueError("Die produktive Zeit darf die Schichtdauer nicht überschreiten.")
    if p["shifts"] not in (1, 2, 3) or p["shifts"] * p["shift_hours"] > 24:
        raise ValueError("Das Schichtmodell darf höchstens 24 Stunden je Tag belegen.")
    if p["days"] not in range(1, 8) or p["weeks"] > 52:
        raise ValueError("Maximal 7 Arbeitstage je Woche und 52 Produktionswochen je Jahr.")
    if p["plan"] == PLANS[2] and int(p["target"]) != p["target"]:
        raise ValueError("Die Zielstückzahl muss ganzzahlig sein.")
    eta = p["mng"] / 100
    density = p["rho_lk"] * 1000  # kg/L -> kg/m³
    dry_volume = p["area"] * p["thickness"] * 1e-6  # m³
    epsilon = p["epsilon"] / 100
    phi = p["phi"] / 100
    if p["method"] == METHODS[0]:
        rho_fk = p["rho_fk"]
        ideal_mass = dry_volume * rho_fk / epsilon
        ideal_litres = ideal_mass / p["rho_lk"]
    else:
        ideal_litres = dry_volume / phi * 1000
        ideal_mass = ideal_litres * p["rho_lk"]
        rho_fk = density * epsilon / phi if p["method"] == METHODS[1] else None
    mass = ideal_mass / eta
    litres = ideal_litres / eta
    hours = operating_hours(p)
    if p["plan"] == PLANS[0]:
        takt = p["takt"]
        rate = 60 / takt
    elif p["plan"] == PLANS[1]:
        rate = p["rate"]
        takt = 60 / rate
    else:
        rate = p["target"] / hours[p["period"]]
        takt = 60 / rate
    spray = takt - p["pause"] / 60
    if spray <= 0:
        raise ValueError("Die Pause muss kleiner als die Taktzeit sein. Für dieses Produktionsziel ist die Pause zu lang.")
    result = dict(rho_fk=rho_fk, mass_piece=mass, litres_piece=litres,
                  loss_piece=litres - ideal_litres, ideal_piece=ideal_litres,
                  cost_piece=litres * p["price"], rate=rate, takt=takt, spray=spray,
                  area_min=rate * p["area"] / 60, kg_h=rate * mass,
                  litres_h=rate * litres, litres_min=rate * litres / 60,
                  spray_litres_min=litres / spray, spray_kg_min=mass / spray)
    rows = []
    for period, h in hours.items():
        count = rate * h
        if p["plan"] == PLANS[2] and period == p["period"]:
            count = float(p["target"])
        volume = count * litres
        loss = count * result["loss_piece"]
        rows.append({"Zeitraum": period, "Produktionszeit [h]": h,
                     "Stückzahl (rechnerisch)": count,
                     "Vollständige Stücke": floor(count + 1e-9),
                     "Fläche [m²]": count * p["area"], "Lackverbrauch [kg]": count * mass,
                     "Lackverbrauch [L]": volume, "Lackverlust [L]": loss,
                     "Lackverlust [kg]": loss * p["rho_lk"],
                     "Lackkosten [€]": volume * p["price"], "Verlustkosten [€]": loss * p["price"]})
    if any(not isfinite(v) for v in result.values() if v is not None) or any(
            not isfinite(v) for row in rows for v in row.values() if isinstance(v, (int, float))):
        raise ValueError("Die Eingaben führen zu einem Zahlenüberlauf. Bitte kleinere Werte wählen.")
    result["periods"] = rows
    return result
