# BLS Bahnplanung (Demo)

Route: /bls-bahnplanung; category Fokus Labor. Independent of HR-ESTA.

## Confirmed motion

Vacuum-fixed horizontal sheet translates in X and can rotate 90 degrees. Nozzle translates in Y. Distance is manually set, fixed throughout a program. Syringe piston feeds material continuously on both scan directions, Y offsets and sheet rotation. X stops during Y offsets. Priming is automatic in the demo and included in withdrawal. One 100 ml syringe, approximate bore 30 mm.

## Model

Normalized elliptical 2D Gaussian on the target plane, integrated in time in sheet coordinates including rotation. Width scales with distance. Horn air stretches the Gaussian; atomizing pressure has a weak assumed influence. These dependencies are illustrative, not fitted. Deposition factor 0.7 on an unlimited plane; losses beyond the sheet remain lost. Dry film uses volume solids, not mass solids. Numerical cells are integrated at their centers with a step limited to 0.04 s and 2 mm scan travel. Time slider displays stored snapshots. Withdrawal stops at 100 ml. Priming lasts 1 s and is assigned entirely outside the sheet; repositioning lasts 1 s without flow. Offset lasts 0.3 s + 0.024 s/mm; rotation lasts 2 s with flow. Constant scan speed and instantaneous X stops: acceleration effects are not included. Cross mode rotates between successive passes; even passes use 90 degrees, odd passes 0 degrees. Meander rows are symmetric about the sheet center and span its width. All nonmeasured geometry is schematic.

Reference model family: Li et al. 2024, https://doi.org/10.1177/16878132241234185. Local BLS short instructions and manufacturer operating instructions supplied by the user; no proprietary documents or photos are published.

## Verification

Automated tests cover Gaussian normalization, round/elliptical symmetry, orientation, distance scaling, continuous flow during offsets and rotation, priming consumption, zero flow, analytical spot reference, edge accumulation and syringe exhaustion. Full repository build runs tests and TypeScript before Vite. Browser QA covers SVG fallback where WebGL is unavailable; native WebGL appearance remains to be checked on a GPU-enabled device.
