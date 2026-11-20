import { area, fillHeight, type Batch, type Cylinder, type Settings } from './logic';

type Formatter = (value: number) => string;

function Vessel({ cylinder, volume, reserve, retained, inverted = false }: {
  cylinder: Cylinder; volume: number; reserve?: number; retained: number; inverted?: boolean;
}) {
  const width = 96;
  const height = 100;
  const x = 56;
  const y = 32;
  const capacity = cylinder.capacity;
  const level = height * Math.min(1, volume / capacity);
  const floorFraction = Math.min(1, cylinder.bottomRest / fillHeight(capacity, cylinder));
  const wetFraction = inverted ? 1 : volume / capacity;
  const bottom = height * Math.min(floorFraction, retained / capacity);
  const wall = Math.min(width / 2, width * cylinder.wallFilm / cylinder.diameter);
  const film = Math.max(0, height * wetFraction - bottom);
  const restAboveBottom = Math.max(0, retained - capacity * bottom / height);
  const annularFraction = film > 0 ? Math.min(1, restAboveBottom / (capacity * film / height)) : 0;
  const drawnWall = width / 2 * (1 - Math.sqrt(1 - annularFraction));
  const coreArea = area(Math.max(0, cylinder.diameter - 2 * cylinder.wallFilm));
  // The pail's mobile volume occupies the core above the bottom zone.
  const mobileHeight = reserve && coreArea > 0
    ? Math.min(height - bottom, height * reserve / capacity * area(cylinder.diameter) / coreArea)
    : 0;
  const shownLevel = reserve === undefined ? level : bottom + mobileHeight;
  const floorY = inverted ? y + bottom / 2 : y + height - bottom / 2;
  const filmY = inverted ? y + bottom + film / 2 : y + height - bottom - film / 2;

  return <g>
    <g transform={inverted ? `translate(0 ${2 * y + height}) scale(1 -1)` : undefined}>
      {reserve === undefined && <rect className="loss-sketch-charge" x={x} y={y + height - level} width={width} height={level} />}
      {reserve !== undefined && <rect className="loss-sketch-mobile" x={x + wall} y={y + height - shownLevel}
        width={width - 2 * wall} height={mobileHeight} />}
      {retained > 0 && <>
        <rect className="loss-sketch-rest" x={x} y={y + height - bottom} width={width} height={bottom} />
        {drawnWall > 0 && <>
          <rect className="loss-sketch-rest" x={x} y={y + height - bottom - film} width={drawnWall} height={film} />
          <rect className="loss-sketch-rest" x={x + width - drawnWall} y={y + height - bottom - film} width={drawnWall} height={film} />
        </>}
      </>}
      {shownLevel > 0 && <line className="loss-sketch-level" x1={x} x2={x + width} y1={y + height - shownLevel} y2={y + height - shownLevel} />}
      <path className="loss-sketch-outline" d={`M ${x} ${y} v ${height} h ${width} v -${height}`} />
    </g>
    <path className="loss-sketch-measure" d="M 56 23 H 152 M 62 20 l -6 3 6 3 M 146 20 l 6 3 -6 3 M 167 32 V 132 M 164 38 l 3 -6 3 6 M 164 126 l 3 6 3 -6" />
    <text x="104" y="17" textAnchor="middle">D</text>
    <text x="175" y="85">H</text>
    <path className="loss-sketch-measure" d={`M 33 ${inverted ? 41 : 124} H 37 L 59 ${floorY}
      M 33 ${inverted ? 102 : 65} H 37 L ${x + drawnWall / 2} ${filmY}`} />
    <text x="23" y={inverted ? 45 : 128}>B</text>
    <text x="24" y={inverted ? 106 : 69}>s</text>
    {shownLevel > 0 && <g>
      <path className="loss-sketch-measure" d={inverted
        ? `M 47 32 V ${y + shownLevel} M 44 36 l 3 -4 3 4 M 44 ${y + shownLevel - 4} l 3 4 3 -4`
        : `M 47 132 V ${y + height - shownLevel} M 44 128 l 3 4 3 -4 M 44 ${y + height - shownLevel + 4} l 3 -4 3 4`} />
      <text x="39" y={inverted ? 27 : 148}>h</text>
    </g>}
  </g>;
}

function Dimensions({ cylinder, format }: { cylinder: Cylinder; format: Formatter }) {
  return <span className="loss-sketch-readout">
    D = {format(cylinder.diameter)} mm · H = {format(fillHeight(cylinder.capacity, cylinder))} mm · {format(cylinder.capacity)} ml
    <br />s = {format(cylinder.wallFilm)} mm · B = {format(cylinder.bottomRest)} mm
  </span>;
}

export function ProcessSketch({ settings, available, pailRest, batch, format }: {
  settings: Settings; available: number; pailRest: number; batch?: Batch; format: Formatter;
}) {
  const { pail, mixingCup, sprayCup, useMixingCup, transferEfficiency } = settings;
  const pailCore = area(Math.max(0, pail.diameter - 2 * pail.wallFilm));
  const pailLevel = Math.min(fillHeight(pail.capacity, pail),
    pail.bottomRest + (pailCore > 0 ? available * 1000 / pailCore : fillHeight(pail.capacity, pail)));
  const volume = (value: number) => `${format(value)} ml`;

  return <div className="loss-sketch">
    <div className="loss-sketch-grid">
      <figure>
        <figcaption><strong>Lackeimer</strong></figcaption>
        <svg viewBox="0 0 220 170" aria-hidden="true">
          <Vessel cylinder={pail} volume={pail.capacity} reserve={available} retained={pailRest} />
        </svg>
        <Dimensions cylinder={pail} format={format} />
        <p>h = {format(pailLevel)} mm<br />Vorrat {volume(available)} · Rest {volume(pailRest)}</p>
      </figure>
      {useMixingCup && <figure>
        <figcaption><strong>Mischbecher</strong></figcaption>
        <svg viewBox="0 0 220 170" aria-hidden="true">
          <Vessel cylinder={mixingCup} volume={batch?.withdrawn ?? 0} retained={batch?.mixingRest ?? 0} />
        </svg>
        <Dimensions cylinder={mixingCup} format={format} />
        {batch && <p>h = {format(fillHeight(batch.withdrawn, mixingCup))} mm<br />Befüllt {volume(batch.withdrawn)} · Rest {volume(batch.mixingRest)}</p>}
      </figure>}
      <figure>
        <figcaption><strong>RPS-Becher auf der Pistole</strong></figcaption>
        <svg viewBox="0 0 220 170" aria-hidden="true">
          <Vessel cylinder={sprayCup} volume={batch?.sprayCupInput ?? 0} retained={batch?.sprayCupRest ?? 0} inverted />
          <path className="loss-sketch-gun" d="M 98 132 h 16 v 6 h 25 v 10 h -29 l -7 16 h -13 l 7 -17 H 85 v -9 h 13 Z" />
          <path className="loss-sketch-outline" d="M 139 140 h 9 v 6 h -9" />
        </svg>
        <Dimensions cylinder={sprayCup} format={format} />
        {batch && <p>h = {format(fillHeight(batch.sprayCupInput, sprayCup))} mm<br />Befüllt {volume(batch.sprayCupInput)} · Rest {volume(batch.sprayCupRest)}</p>}
      </figure>
      <figure>
        <figcaption><strong>Applikation und Werkstück</strong></figcaption>
        <svg viewBox="0 0 220 170" role="img" aria-label={`AWG ${format(transferEfficiency)} Prozent, Auftrag zum Werkstück und Overspray am Werkstück vorbei`}>
          <path className="loss-sketch-gun" d="M 21 86 H 49 V 97 H 35 L 30 116 H 20 L 24 97 H 16 V 86 Z" />
          <path className="loss-sketch-outline" d="M 49 88 h 8 v 6 h -8" />
          <path className="loss-sketch-charge" d="M 57 91 L 173 49 V 133 Z" />
          <path className="loss-sketch-deposit" d="M 60 91 H 167 m -6 -4 l 6 4 -6 4" />
          <path className="loss-sketch-overspray" d="M 59 90 L 182 40 m -8 -1 l 8 1 -5 6 M 59 92 L 182 142 m -5 -6 l 5 6 -8 1" />
          <rect className="loss-sketch-gun" x="173" y="57" width="13" height="68" rx="2" />
          <text x="61" y="82">AWG {format(transferEfficiency)} %</text>
          <text x="98" y="33">Overspray</text>
          <text x="101" y="107">Auftrag</text>
        </svg>
        {batch && <p>Auftrag {volume(batch.deposited)}<br />Overspray {volume(batch.overspray)}</p>}
      </figure>
    </div>
    <p className="loss-sketch-key"><span className="loss-key-mobile">Entnehmbarer Vorrat</span>
      <span className="loss-key-charge">Befüllung vor dem Entleeren</span>
      <span className="loss-key-rest">Wand- und Bodenrest</span></p>
    <p className="loss-sketch-note">Querschnitte schematisch. H bezeichnet die Innenhöhe, h die Füllhöhe. Beim RPS-Becher wird h vom ursprünglichen Becherboden aus gemessen. Bei sehr kleinen Füllungen begrenzt die verfügbare Lackmenge den Rest.</p>
  </div>;
}
