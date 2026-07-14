export const DICE_IMAGE_PATHS = Object.freeze(
  Array.from(
    { length: 6 },
    (_, index) => `../../assets/summerschool/ice-break/dice/Rectangle${index + 1}.webp`,
  ),
);

export const DICE_ROLL_INTERVAL_MS = 55;
