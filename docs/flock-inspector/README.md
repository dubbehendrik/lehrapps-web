# Flock-Inspector v1

Browser-only teaching application. Per-image calibration, material/sample/series hierarchy, local contrast segmentation and Zhang–Suen centerlines run in a worker. Nonbranching paths are measured by Euclidean segment sums. Junction branches, cycles and paths touching boundaries require review and are excluded from statistics until explicitly accepted. Dense overlap, transparent fibers and poor contrast remain limitations; the app does not infer hidden lengths.

The example image has no known scale. Users must supply their own known calibration; no physical scale is invented. Example crosshair masking uses its known position and is optional; other annotations can be excluded with rectangles. New overlays are never part of segmentation input.

Welch reference generated with scipy.stats.ttest_ind([.3,.4,.5,.6],[.4,.5,.7,.8,.9], equal_var=False): t=-1.8585769002101529, p=0.10722982623706402, df=6.713660218465856. Material mode pools fibers within each independent sample and compares sample means with equal weight. Shared samples across series block the independent test. Non-significance is not equivalence.

ZIP project format is versioned as flock-inspector/1. Includes original source image data, frozen decoded PNG image, calibration, complete centerline coordinates, masks, metadata and comparison selections. Re-import restores saved measurements without rerunning detection. Animated raster inputs are frozen using createImageBitmap. SVG and TIFF are not accepted in v1. Maximum 16 million pixels per image.

Target per-fiber deviation ±0.03 mm has NOT been validated. Synthetic tests check mechanics, not real-image measurement accuracy. A manually measured reference set is needed before claiming accuracy. Source images should not be rescaled or contain perspective distortion; fibers should lie in the calibration plane. Excluding edge-truncated fibers can bias the length distribution toward shorter fibers.
