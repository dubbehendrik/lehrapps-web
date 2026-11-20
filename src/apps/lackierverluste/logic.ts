export type Cylinder = {
  diameter: number;
  capacity: number;
  wallFilm: number;
  bottomRest: number;
};

export type Settings = {
  pail: Cylinder;
  mixingCup: Cylinder;
  sprayCup: Cylinder;
  useMixingCup: boolean;
  fillHeight: number;
  transferEfficiency: number;
};

export type Batch = {
  withdrawn: number;
  sprayCupInput: number;
  mixingRest: number;
  sprayCupRest: number;
  overspray: number;
  deposited: number;
};

export const defaults: Settings = {
  pail: { diameter: 220, capacity: 5000, wallFilm: 1, bottomRest: 2 },
  mixingCup: { diameter: 120, capacity: 1000, wallFilm: 1, bottomRest: 2 },
  sprayCup: { diameter: 100, capacity: 600, wallFilm: 1, bottomRest: 2 },
  useMixingCup: true,
  fillHeight: 50,
  transferEfficiency: 50,
};

// Dimensions in mm, volumes in ml.
export const area = (diameter: number) => Math.PI * diameter ** 2 / 4;
export const fillHeight = (volume: number, cylinder: Cylinder) => volume * 1000 / area(cylinder.diameter);
export const volumeAt = (height: number, cylinder: Cylinder) => height * area(cylinder.diameter) / 1000;

export function retainedVolume(volume: number, cylinder: Cylinder, fullyWetted = false) {
  const crossSection = area(cylinder.diameter);
  const openSection = area(Math.max(0, cylinder.diameter - 2 * cylinder.wallFilm));
  const wettedHeight = fillHeight(fullyWetted ? cylinder.capacity : volume, cylinder);
  const bottomHeight = Math.min(wettedHeight, cylinder.bottomRest);
  const filmHeight = wettedHeight - bottomHeight;
  const geometricRest = (crossSection * bottomHeight + (crossSection - openSection) * filmHeight) / 1000;

  return Math.min(volume, geometricRest);
}

export function maxChargeHeight(settings: Settings) {
  const { useMixingCup, mixingCup, sprayCup } = settings;
  if (!useMixingCup) return fillHeight(sprayCup.capacity, sprayCup);

  const openSection = area(Math.max(0, mixingCup.diameter - 2 * mixingCup.wallFilm));
  const sprayCupLimit = settings.mixingCup.bottomRest + sprayCup.capacity * 1000 / openSection;
  return Math.min(fillHeight(mixingCup.capacity, mixingCup), sprayCupLimit);
}

export function calculateBatch(available: number, settings: Settings): Batch {
  const firstCup = settings.useMixingCup ? settings.mixingCup : settings.sprayCup;
  const targetHeight = Math.min(settings.fillHeight, maxChargeHeight(settings));
  const withdrawn = Math.min(available, volumeAt(targetHeight, firstCup));
  const mixingRest = settings.useMixingCup ? retainedVolume(withdrawn, settings.mixingCup) : 0;
  const sprayCupInput = withdrawn - mixingRest;
  const sprayCupRest = retainedVolume(sprayCupInput, settings.sprayCup, true);
  const sprayed = sprayCupInput - sprayCupRest;
  const deposited = sprayed * settings.transferEfficiency / 100;
  return { withdrawn, sprayCupInput, mixingRest, sprayCupRest, overspray: sprayed - deposited, deposited };
}

export const emptyBatch: Batch = {
  withdrawn: 0, sprayCupInput: 0, mixingRest: 0, sprayCupRest: 0, overspray: 0, deposited: 0,
};

export function addBatches(total: Batch, batch: Batch): Batch {
  return {
    withdrawn: total.withdrawn + batch.withdrawn,
    sprayCupInput: total.sprayCupInput + batch.sprayCupInput,
    mixingRest: total.mixingRest + batch.mixingRest,
    sprayCupRest: total.sprayCupRest + batch.sprayCupRest,
    overspray: total.overspray + batch.overspray,
    deposited: total.deposited + batch.deposited,
  };
}
