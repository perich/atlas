export type OpsTapeSimStatus = {
  status: "scaffolded";
  packageName: "@bankops/ops-tape-sim";
};

export function createOpsTapeSimStatus(): OpsTapeSimStatus {
  return {
    status: "scaffolded",
    packageName: "@bankops/ops-tape-sim",
  };
}
