# Mollier h,x migration

Source: https://github.com/dubbehendrik/Mollier-h-x at cf727a3a0f92e1720722c1ef910f30070ae64a36. Frozen original app.py, thermo.py, chart.py and exports.py are included; the source repository is unchanged.

Route: /hx-diagramm. Registered centrally for navigation and overview. React/TypeScript browser-only implementation; no new dependencies.

## Functional coverage

All ten pairs from T, x, relative humidity, density and enthalpy; default 20 °C / 50 %, pressure 950 hPa (500–1200). Fixed chart −15–40 °C / 0–20 g/kg. Ambiguous, nonfinite, supersaturated and out-of-chart states rejected.

Interactive Mollier SVG preserves the original shear, grid families, labels, arrows and dashed free connections. Pointer readout, clicks and keyboard (arrows, Shift, Enter). Native SVG retained for exact custom geometry; no Plotly dependency for this app.

State and process input; heating, cooling with condensate separation, isothermal moisture changes and approximate isenthalpic humidification. Ice separation excluded. Summer/winter examples; editable names/input pairs; atomic edits, reorder/delete, clear and pressure reset.

Pressure changes preserve input pairs. Invalid states/processes block exports. Explicit recalculation repairs points while preserving the target variable. PNG 1600×1840 and SVG share the same scene. Excel includes states, processes, input values, pressure, dew point and model/source notes. Names are literal strings, never formulas. Shared MathML fractions/subscripts and mailto support footer.

## Validation

`python scripts/generate-hx-references.py` generates fixtures from frozen Python (requires NumPy/SciPy). 80 pair cases at multiple pressures including winter, dry air and boundaries, plus five complete process paths. TypeScript uses bracketed bisection instead of SciPy Brent; tolerance 1e-7 in public units. Project total: 339 tests pass, typecheck and production build pass.

Headless Chromium checked summer/winter, PNG/SVG/Excel downloads, invalid edit rejection, pressure invalidation and explicit repair, keyboard addition, process addition and rejection of ice separation. Desktop 1440×1000, tablet 768×1024, phone 390×844: no page overflow. Screenshots and browser-results.json included. Exports parsed independently with XML/Pillow/openpyxl; Excel has three sheets, four rows in summer states and PNG is 1600×1840.

## Retained limitations

Ideal air/water-vapor mixture; no ice, fog carryover, mixing, enhancement factor, coil bypass or pressure loss. Δh is the air enthalpy difference, not a complete coil balance. Isenthalpic humidification neglects feed-water enthalpy. Below 0 °C relative humidity and dew point refer to supercooled liquid water, not ice.

## Update 2026-10-16: A4 PDF and German numeric display

Diagram exports (PDF, PNG, SVG) now work without states. Invalid pressure/states/processes still block export; Excel requires at least one state. PDF is one A4 portrait page, with a proportionally scaled vector scene and embedded DejaVu Sans subsets for Greek symbols. jsPDF/svg2pdf.js are loaded only on demand. Explicit halo/foreground text passes compensate for unsupported SVG paint-order.

Display: German decimal comma and thousands period, at most two decimal places; scientific notation for |value| >= 100000 or 0 < |value| < 0.005. Editable fields accept German grouping/comma and e notation, preserve incomplete text, and reveal full precision while editing. Focus/blur alone never rounds underlying values. SVG technical coordinates retain the required machine-readable decimal points. Excel numeric cells remain unrounded with German-locale display formats.

Validation: 621 tests pass; typecheck, production and offline build pass. Chromium (en-US locale) verified empty PDF/PNG/SVG, populated PDF/Excel, German grouped pressure input, scientific values, invalid-pressure blocking, full-precision focus/blur and tablet/phone overflow. PDF inspection via pypdf/Poppler: 595.28 x 841.89 pt, one page, no raster images, Greek text retained; rendered labels visually verified. Excel inspected via openpyxl: 7.630053703261587 retained exactly.
