# Roboter Bahnplanung (Demo)

Route `/roboter-bahnplanung`, Fokus: Labor. Generic 2K paint and generic rotary
atomizer. Literature-informed **dry film thickness in µm**, not a calibration of
the EcoBell shown in the illustrative CAD scene. Stationary experiment is the
initial view. All existing trajectory scenarios use the same deposition kernel.

## Evidence and source

Nico Güttler (2024), *Methodik für numerische Lackiersimulationen: Bedeutung der
Modell- und Eingangsparameter bei der Hochrotationszerstäubung*, Dissertation,
Universität Stuttgart, Stuttgarter Beiträge zur Produktionsforschung 176.

- Table 3.2, p. 72: reference ABB RB1000 SSD Brush 1: 250 ml/min, inner/outer
  shaping air 500/75 standard l/min, 35000 rpm, 65 kV, 200 mm, 150 mm/s.
- Table 3.4, p. 82: measured volumetric solids 57%. This value is used directly,
  rather than recomputing it from rounded densities or using the manufacturer's 61%.
- Figure A.1, p. 221: **measured moving single-pass profile**, solid blue curve.
- Figures A.7-A.11, pp. 223-224: simulated one-factor profiles for distance,
  shaping air, flow, voltage, rpm. The baseline of these simulations is distinct
  from the measured reference. Normalized shape increments transfer those trends.
- Table 5.4, p. 180: local width slopes for inner/outer air, -0.71/+0.11 mm
  per standard l/min. Figure A.8 varies **both air streams together**. Their
  independent decomposition is an additional teaching-model assumption.
- Section 4.1.1, pp. 118-120: static-to-dynamic projection; motion-induced
  asymmetries are not included in a static radial deposition kernel.

`data/single-pass.json` stores original vector coordinates converted to mm/µm,
source pages, stroke IDs and original PDF SHA256. No hand-invented reference curve
or rotation of a moving profile is used. The full source PDF is not bundled.

## Reproducible inverse problem

1. Optional: `python scripts/extract-spray.py <original-dissertation.pdf>`
   (PyMuPDF). Axis rectangles, solid/dashed strokes, colors and legends were
   visually inspected before selecting the source curves.
2. `python scripts/reconstruct-spray.py` (numpy, scipy) regenerates
   `src/apps/roboter-bahnplanung/spray-data.json` from the extracted coordinates.
3. Reference profiles are interpolated on a 5 mm transverse grid and symmetrized.
4. A nonnegative reflected Gaussian radial basis (10 mm spacing, 12 mm width)
   is fitted through its **forward line integral** at 150 mm/s. Nonnegative least
   squares includes a second-difference penalty of 0.15 and ridge penalty of 0.02.
   Reflected basis functions enforce a zero derivative at the radial origin.
5. The radial rate in µm/s is tabulated every 2 mm out to 500 mm. Gaussian tails
   beyond observed ±400 mm are model assumptions, not measured information.
6. Reintegration reproduces the symmetrized measured reference with ~1.1% wMAPE.
   The runtime interpolated kernel is tested independently by numerical projection.
   **This is an in-sample fit error, not predictive experimental uncertainty.**

An inverse radial profile assumes rotational symmetry. A single projection cannot
identify a general asymmetric 2D distribution. Smoothing and nonnegativity supply
regularization; they do not establish a unique physical atomization mechanism.

## Generic parameter variation

Measured baseline radial density plus additive normalized density changes from
one-factor simulated curves. Piecewise-linear interpolation between reference and
low/high levels. Combined changes have no identified interaction terms. Changes
beyond literature levels are bounded at three times the investigated perturbation;
negative densities are clipped and the radial interpolant is renormalized exactly.

Local literature domains: distance 150-250 mm; flow 225-275 ml/min; inner air
450-550, outer air 67.5-82.5 standard l/min (joint variation); voltage 58.5-71.5 kV;
rpm 31500-38500. Flow may be set to zero; values outside the local range produce
an extrapolation notice. Volumetric solids scale only amount, not shape.

For air, the one-factor coordinate is
`(-0.71*(inner-500)+0.11*(outer-75))/(-0.71*50+0.11*7.5)`.
It reproduces the joint ±10% settings. Independent air effects are approximate.

## Units and material accounting

`Qdry = flow * 1000 / 60 * solids/100` in mm³/s.
`hdot = Qdry * 1000 * eta * K(r)` in µm/s, with `K` in 1/mm².
The reference volume integral gives eta ≈90.6% for the assumed large plane and
smoothed tail. This is the value inferred from the extracted reference curve,
not an independently measured efficiency or a fitted variable-efficiency law.
The efficiency stays constant because the local source sensitivities do not
support a robust variable-efficiency law. Shape, flow and solids change thickness.

`captured` and `supplied` are dry solid volume in mm³. The finite sheet clips the
kernel without renormalization; its captured fraction may be below reference eta.
Time integrates the equivalent eventual dry film, **not the drying process**.
No wet-film prediction or liquid/solids density approximation is hidden in the scale.

## Views and numerical limits

2D map, cross sections and both 3D views label µm. A WebGL-independent interactive
3D height profile has numeric height ticks; CAD uses WebGL and an annotated,
visually exaggerated layer. A/B share final color and height scales across time.
Zero thickness has a defined small display scale, not a division by zero.

Cell-centered ~5 mm grid, max 121 cells per direction, midpoint quadrature along
moving segments, 81 immutable frames, linear time interpolation. Max 600 s and
60 lane spacings per direction. A/B, hold paths, meanders, cross and wedge remain.
Storage schema changed to 2 and a new key: old relative-unit configurations are
not silently interpreted as the new model.

No droplet/atomization CFD, flow/charge solution, angle correction, edge fields,
shadowing, film flow, thickness-dependent sagging, gun transients or collisions.
Original CAD and display IK imply no machine-program validity.

## Verification

Full build runs all tests, TypeScript and production/offline builds. Dedicated
checks include reference reprojection, unit conversion, positivity, normalized
mass under parameter variation, zero flow, linear time/solids scaling, finite-sheet
overspray, speed scaling, all paths, symmetry and input/storage schema rejection.
Browser QA covers static µm map, parameter recalculation, A/B, time zero/end,
3D height profile without WebGL and keyboard controls. CAD needs WebGL.

## Scene controls and coordinate convention

The collapsed program-description panel sits directly below the title; formulas
use native MathML with fractions, integral limits and true indices. View order:
2D sheet/path, 3D height profile, 3D robot. Dirty settings have an update button
next to the status message; recalculation retains the relative time position.
Explicit restart and reset still begin at time zero.

`u` increases leftwards and `v` downwards from the top-right sheet origin. All
views show arrowheads. Both 3D views show the selected section as a translucent
plane and the corresponding interpolated numerical section curve. The plane
moves with the section controls, uses the same height exaggeration as the layer,
and can be hidden without changing the calculation.

The virtual process TCP is on the sheet (`distanceToolMatrix` includes standoff).
The path previously used an extra normal offset equal to standoff, placing it at
the nozzle. It now uses `tcpPathPoint` without that offset. Planned and traversed
paths use foreground rendering (`depthTest=false`, `depthWrite=false`), rather
than relocating the actual TCP onto the exaggerated layer. Thus apparent
visibility does not indicate geometric collision freedom.

The cleaned planner cabin is retained as a separate group. The cabin and wall-
transparency checkboxes are enabled initially and persist when switching views.
Suspension and robot pedestal are kept separately and remain when the cabin is
hidden. No CAD geometry or kinematic transforms are changed by this switch.

## Cabin synchronization with the path-planning app

Source: `dubbehendrik/lackierroboter-dev`, commit
`5ed97d773ae52cea82eafde169b3c798ee19aa84` (PlannerScene.tsx, robot-motion.ts,
cabin-obstacles.ts and models/cabin-classification.json). The CAD binary is
identical in both apps: Git blob `f47c7d453769d9d38f9a7d2f75e1847ea7e88462`.
The update is its scene preparation, not a different raw VRML file.

`prepareCabin` applies the same excluded part IDs, floor-label exclusions and
out-of-bounds line removal as the planner. The old large room floor is replaced
with the planner's bounded floor. Original part colors and opaque internal
equipment are retained; only the eight classified cabin walls toggle between
opaque and 14% opacity. The measured ceiling projection and upper beam are copied
from the same planner revision, including the visual extension to the back wall.
Their source display materials are preserved. These are illustrations, not a
new collision-validation feature of the teaching app.

Two separate controls: cabin visibility and wall transparency. Both start enabled,
as in the planner. Turning the cabin off preserves the transparency choice for
when it returns; suspension and robot pedestal remain separately visible.
The previous floating ground grid is removed in favor of the actual cabin floor.

Dragging the 3D film profile right/down now decreases yaw/pitch, reversing both
old pointer directions. Angle sliders and angle limits keep their existing
meaning. Tests cover both directions and clamping, plus the actual parsed CAD
cleanup, equipment preservation, wall-only opacity and overhead dimensions.
