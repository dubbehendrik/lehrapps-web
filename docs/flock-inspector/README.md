# Flock-Inspector v1

Browser-only teaching application. Per-image calibration, material/sample/series hierarchy, local contrast segmentation and Zhang–Suen centerlines run in a worker. Nonbranching paths are measured by Euclidean segment sums. Junction branches, cycles and paths touching boundaries require review and are excluded from statistics until explicitly accepted. Dense overlap, transparent fibers and poor contrast remain limitations; the app does not infer hidden lengths.

The example image has no known scale. Users must supply their own known calibration; no physical scale is invented. Annotations can be excluded with rectangles; the former example-specific crosshair option has been removed. New overlays are never part of segmentation input.

Welch reference generated with scipy.stats.ttest_ind([.3,.4,.5,.6],[.4,.5,.7,.8,.9], equal_var=False): t=-1.8585769002101529, p=0.10722982623706402, df=6.713660218465856. Material mode pools fibers within each independent sample and compares sample means with equal weight. Shared samples across series block the independent test. Non-significance is not equivalence.

ZIP project format is versioned as flock-inspector/1. Includes original source image data, frozen decoded PNG image, calibration, complete centerline coordinates, masks, metadata and comparison selections. Re-import restores saved measurements without rerunning detection. Animated raster inputs are frozen using createImageBitmap. SVG and TIFF are not accepted in v1. Maximum 16 million pixels per image.

Target per-fiber deviation ±0.03 mm has NOT been validated. Synthetic tests check mechanics, not real-image measurement accuracy. A manually measured reference set is needed before claiming accuracy. Source images should not be rescaled or contain perspective distortion; fibers should lie in the calibration plane. Excluding edge-truncated fibers can bias the length distribution toward shorter fibers.

## Controls and segmentation update

- CTRL/CMD-click toggles individual fibers; SHIFT-click in the table selects a range in the current sorted order. All/none selection and column sorting retain fiber identities. Delete acts only with focus in the image editor and supports undo; input fields are unaffected.
- Tool explanations appear on hover/focus or by tapping the information button.
- Legacy example crosshair setting is ignored and removed on import.
- Brightness mode supports a local-background radius and adjustable correction strength; color mode uses original-image HSV reference samples, circular hue tolerance and a minimum saturation. Color selection intentionally ignores brightness, while low-saturation texture is suppressed. Preview uses the same segmentation function as measurement and does not modify measurements. Small structures are filtered during path extraction.
- Right-angle view rotations preserve source pixels and coordinates; inverse coordinate mapping supports editing in the rotated view. Rotation is saved in ZIP projects. Scale labels remain upright.
- Fit-to-window view has no inner scrollbars. Zoomed views can be panned using SPACE+drag; an enlarged overlay view is also available.

405 automated tests pass. Additional browser checks cover selection modifiers, deletion/undo, input safety, sorting, rotation, ZIP roundtrip, tooltip, zoom/pan, enlarged view, color sampling/preview and desktop/tablet/phone fit. Real-image target accuracy remains unvalidated.
