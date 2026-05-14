export type RandomState = {
  value: number;
};

export function randomInt(state: RandomState, min: number, max: number): number {
  state.value = (state.value * 1_664_525 + 1_013_904_223) >>> 0;
  return min + (state.value % (max - min + 1));
}
