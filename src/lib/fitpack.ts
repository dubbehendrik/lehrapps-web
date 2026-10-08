/** Cubic FITPACK smoothing spline, ported from SciPy 1.17's fpcurf and
 * helpers (P. Dierckx). See THIRD_PARTY_NOTICES.md. Unit weights, iopt=0.
 * One-based working arrays deliberately retain the reference indexing.
 * s bounds the sum of squared residuals; it is NOT a regularization weight.
 */
export interface CubicSpline {
  knots: number[];
  coefficients: number[];
  residual: number;
}
const vector = (n: number) => Array<number>(n + 1).fill(0);
const matrix = (n: number, width: number) =>
  Array.from({ length: n + 1 }, () => vector(width));
function basis(t: number[], x: number, l: number) {
  const h = vector(4);
  h[1] = 1;
  for (let j = 1; j <= 3; j++) {
    const previous = h.slice();
    h[1] = 0;
    for (let i = 1; i <= j; i++) {
      const li = l + i,
        lj = li - j;
      if (t[li] === t[lj]) {
        h[i + 1] = 0;
        continue;
      }
      const f = previous[i] / (t[li] - t[lj]);
      h[i] += f * (t[li] - x);
      h[i + 1] = f * (x - t[lj]);
    }
  }
  return h;
}
function givens(pivot: number, diagonal: number) {
  const magnitude = Math.abs(pivot);
  const d =
    magnitude >= diagonal
      ? magnitude * Math.sqrt(1 + (diagonal / pivot) ** 2)
      : diagonal * Math.sqrt(1 + (pivot / diagonal) ** 2);
  return { d, cos: diagonal / d, sin: pivot / d };
}
function rotate(cos: number, sin: number, a: number, b: number) {
  return [cos * a - sin * b, cos * b + sin * a];
}
function backSubstitute(a: number[][], z: number[], n: number, width: number) {
  const c = vector(n);
  for (let i = n; i >= 1; i--) {
    let value = z[i];
    for (let j = 1; j <= Math.min(width - 1, n - i); j++)
      value -= c[i + j] * a[i][j + 1];
    c[i] = value / a[i][1];
  }
  return c;
}
export function fitCubicSpline(
  xInput: number[],
  yInput: number[],
  s: number,
): CubicSpline {
  const m = xInput.length;
  if (
    m < 4 ||
    m !== yInput.length ||
    !Number.isFinite(s) ||
    s < 0 ||
    xInput.some(
      (v, i) => !Number.isFinite(v) || (i > 0 && v <= xInput[i - 1]),
    ) ||
    yInput.some((v) => !Number.isFinite(v))
  )
    throw new Error(
      "Für die Spline-Berechnung sind mindestens vier streng aufsteigende, endliche Messpunkte erforderlich.",
    );
  const x = [0, ...xInput],
    y = [0, ...yInput],
    nmax = m + 4,
    acc = 0.001 * s;
  const t = vector(nmax),
    fpint = vector(nmax),
    nrdata = vector(nmax),
    q = matrix(m, 4);
  let n = s === 0 ? nmax : 8,
    fp = 0,
    fp0 = 0,
    fpold = 0,
    nplus = 0,
    polynomial = true;
  // fpcurf0 initially allocates m/2 knots. SciPy resumes (iopt=1) with
  // m+k+1 storage after ier=1. The intermediate solve affects knot placement.
  let capacity = s === 0 ? nmax : Math.max(Math.floor(m / 2), 8);
  let a = matrix(nmax, 4),
    z = vector(nmax),
    c = vector(nmax),
    nk1 = 0;
  nrdata[1] = m - 2;
  function interpolationKnots() {
    for (let i = 5, j = 3; i <= m; i++, j++) t[i] = x[j];
  }
  if (s === 0) interpolationKnots();
  for (let trial = 1; trial <= m; trial++) {
    polynomial = n === 8;
    nk1 = n - 4;
    for (let j = 1; j <= 4; j++) {
      t[j] = x[1];
      t[n - j + 1] = x[m];
    }
    a = matrix(nmax, 4);
    z = vector(nmax);
    fp = 0;
    let l = 4;
    for (let it = 1; it <= m; it++) {
      while (x[it] >= t[l + 1] && l !== nk1) l++;
      const h = basis(t, x[it], l);
      q[it] = h.slice();
      let yi = y[it];
      for (let i = 1, j = l - 3; i <= 4; i++, j++) {
        const pivot = h[i];
        if (pivot === 0) continue;
        const { d, cos, sin } = givens(pivot, a[j][1]);
        a[j][1] = d;
        [yi, z[j]] = rotate(cos, sin, yi, z[j]);
        for (let i1 = i + 1, i2 = 2; i1 <= 4; i1++, i2++)
          [h[i1], a[j][i2]] = rotate(cos, sin, h[i1], a[j][i2]);
      }
      fp += yi * yi;
    }
    if (polynomial) fp0 = fp;
    c = backSubstitute(a, z, nk1, 4);
    const fpms = fp - s;
    if (Math.abs(fpms) < acc || (n === nmax && fpms >= 0))
      return {
        knots: t.slice(1, n + 1),
        coefficients: c.slice(1, nk1 + 1),
        residual: fp,
      };
    if (fpms < 0) break;
    const resumed = n === capacity;
    if (resumed) capacity = nmax;
    // fpcurf1 resumes with ier=1, so the first new knot batch has size 1.
    if (polynomial || resumed) nplus = 1;
    else {
      const estimate =
        fpold - fp > acc
          ? Math.trunc((nplus * fpms) / (fpold - fp))
          : nplus * 2;
      nplus = Math.min(nplus * 2, Math.max(estimate, Math.floor(nplus / 2), 1));
    }
    fpold = fp;
    let nrint = n - 7,
      fpart = 0,
      interval = 1;
    l = 5;
    for (let it = 1; it <= m; it++) {
      const next = x[it] >= t[l] && l <= nk1;
      if (next) l++;
      let term = 0;
      for (let j = 1; j <= 4; j++) term += c[l - 5 + j] * q[it][j];
      term = (term - y[it]) ** 2;
      fpart += term;
      if (next) {
        fpint[interval++] = fpart - term / 2;
        fpart = term / 2;
      }
    }
    fpint[nrint] = fpart;
    for (let added = 0; added < nplus; added++) {
      let fpmax = 0,
        number = 0,
        maxpt = 0,
        maxbeg = 0,
        jbegin = 1;
      for (let j = 1; j <= nrint; j++) {
        if (fpint[j] > fpmax && nrdata[j] !== 0) {
          fpmax = fpint[j];
          number = j;
          maxpt = nrdata[j];
          maxbeg = jbegin;
        }
        jbegin += nrdata[j] + 1;
      }
      if (!number)
        throw new Error("Die Spline-Knoten konnten nicht bestimmt werden.");
      const half = Math.floor(maxpt / 2) + 1,
        next = number + 1;
      for (let jj = nrint; jj >= next; jj--) {
        fpint[jj + 1] = fpint[jj];
        nrdata[jj + 1] = nrdata[jj];
        t[jj + 4] = t[jj + 3];
      }
      nrdata[number] = half - 1;
      nrdata[next] = maxpt - half;
      fpint[number] = (fpmax * nrdata[number]) / maxpt;
      fpint[next] = (fpmax * nrdata[next]) / maxpt;
      t[next + 3] = x[maxbeg + half];
      n++;
      nrint++;
      if (n === nmax) {
        interpolationKnots();
        break;
      }
      if (n === capacity) break;
    }
  }
  if (polynomial)
    return {
      knots: t.slice(1, n + 1),
      coefficients: c.slice(1, nk1 + 1),
      residual: fp,
    };
  // Derivative discontinuity constraints at interior knots (fpdisc).
  const b = matrix(nmax, 5),
    fac = (nk1 - 3) / (t[nk1 + 1] - t[4]);
  for (let l = 5; l <= nk1; l++) {
    const h = vector(8),
      row = l - 4;
    for (let j = 1; j <= 4; j++) {
      h[j] = t[l] - t[l + j - 5];
      h[j + 4] = t[l] - t[l + j];
    }
    for (let j = 1, lp = row; j <= 5; j++, lp++) {
      let product = h[j];
      for (let i = 1; i <= 3; i++) product *= h[j + i] * fac;
      b[row][j] = (t[lp + 4] - t[lp]) / product;
    }
  }
  let p1 = 0,
    f1 = fp0 - s,
    p3 = -1,
    f3 = fp - s,
    p = nk1 / a.slice(1, nk1 + 1).reduce((sum, row) => sum + row[1], 0),
    ich1 = false,
    ich3 = false;
  const n8 = n - 8;
  for (let iteration = 1; iteration <= 20; iteration++) {
    const g = a.map((row) => [...row, 0]);
    let rhs = z.slice();
    for (let it = 1; it <= n8; it++) {
      const h = b[it].map((v) => v / p);
      let yi = 0;
      for (let j = it; j <= nk1; j++) {
        const { d, cos, sin } = givens(h[1], g[j][1]);
        g[j][1] = d;
        [yi, rhs[j]] = rotate(cos, sin, yi, rhs[j]);
        if (j === nk1) break;
        const i2 = j > n8 ? nk1 - j : 4;
        for (let i = 1; i <= i2; i++) {
          [h[i + 1], g[j][i + 1]] = rotate(cos, sin, h[i + 1], g[j][i + 1]);
          h[i] = h[i + 1];
        }
        h[i2 + 1] = 0;
      }
    }
    c = backSubstitute(g, rhs, nk1, 5);
    fp = 0;
    let l = 5;
    for (let it = 1; it <= m; it++) {
      if (x[it] >= t[l] && l <= nk1) l++;
      let term = 0;
      for (let j = 1; j <= 4; j++) term += c[l - 5 + j] * q[it][j];
      fp += (term - y[it]) ** 2;
    }
    const f2 = fp - s,
      p2 = p;
    if (Math.abs(f2) < acc)
      return {
        knots: t.slice(1, n + 1),
        coefficients: c.slice(1, nk1 + 1),
        residual: fp,
      };
    if (!ich3) {
      if (f2 - f3 <= acc) {
        p3 = p2;
        f3 = f2;
        p *= 0.04;
        if (p <= p1) p = p1 * 0.9 + p2 * 0.1;
        continue;
      }
      if (f2 < 0) ich3 = true;
    }
    if (!ich1) {
      if (f1 - f2 <= acc) {
        p1 = p2;
        f1 = f2;
        p /= 0.04;
        if (p3 > 0 && p >= p3) p = p2 * 0.1 + p3 * 0.9;
        continue;
      }
      if (f2 > 0) ich1 = true;
    }
    if (f2 >= f1 || f2 <= f3) break;
    if (p3 <= 0)
      p = (p1 * (f1 - f3) * f2 - p2 * (f2 - f3) * f1) / ((f1 - f2) * f3);
    else {
      const h1 = f1 * (f2 - f3),
        h2 = f2 * (f3 - f1),
        h3 = f3 * (f1 - f2);
      p =
        -(p1 * p2 * h3 + p2 * p3 * h1 + p3 * p1 * h2) /
        (p1 * h1 + p2 * h2 + p3 * h3);
    }
    if (f2 < 0) {
      p3 = p2;
      f3 = f2;
    } else {
      p1 = p2;
      f1 = f2;
    }
  }
  throw new Error(
    "Die Glättung konvergiert nicht. Bitte einen anderen Glättungsfaktor wählen.",
  );
}
export function evaluateSpline(spline: CubicSpline, value: number): number {
  const t = [0, ...spline.knots],
    c = [0, ...spline.coefficients],
    nk1 = c.length - 1;
  let l = 4;
  while (value >= t[l + 1] && l < nk1) l++;
  const h = basis(t, value, l);
  return h.slice(1).reduce((sum, v, i) => sum + v * c[l - 3 + i], 0);
}
