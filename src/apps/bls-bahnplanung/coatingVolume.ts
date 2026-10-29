/** Closed display mesh in mm; heights remain linear in the measured µm values. */
export function coatingVolume(width: number, height: number, nx: number, ny: number, values: Float32Array, gain: number) {
  const count = nx * ny, positions = new Float32Array(count * 6), indices: number[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, x = (i / (nx - 1) - .5) * width, z = (.5 - j / (ny - 1)) * height;
    positions.set([x, 2 + values[k] / 1000 * gain, z], k * 3);
    positions.set([x, 2, z], (count + k) * 3);
  }
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
    indices.push(a,b,c, b,d,c, count+a,count+c,count+b, count+b,count+c,count+d);
  }
  const wall = (a: number, b: number) => indices.push(a,count+a,b, b,count+a,count+b);
  for (let i = 0; i < nx - 1; i++) { wall(i,i+1); wall((ny-1)*nx+i+1,(ny-1)*nx+i); }
  for (let j = 0; j < ny - 1; j++) { wall((j+1)*nx,j*nx); wall(j*nx+nx-1,(j+1)*nx+nx-1); }
  return { positions, indices };
}
