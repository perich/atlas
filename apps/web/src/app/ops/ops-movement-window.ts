import type { BalanceSheetBucket, BalanceSheetMovement, Rail } from "@bankops/contracts";

import type { RailBucketHeatmapCell } from "./ops-stream-messages";

const movementWindowMs = 5_000;
const movementBinMs = 250;

type HeatmapDelta = {
  rail: Rail;
  bucket: BalanceSheetBucket;
  movementCount: number;
  creditMinor: number;
  debitMinor: number;
  exceptionCount: number;
};

type MovementBin = {
  startedAt: number;
  maxAmountMinor: number;
  cells: Map<string, HeatmapDelta>;
};

export class OpsMovementWindow {
  private latestMovementTs = 0;
  private readonly movementBins: MovementBin[] = Array.from(
    { length: movementWindowMs / movementBinMs },
    () => ({
      cells: new Map(),
      maxAmountMinor: 0,
      startedAt: 0,
    }),
  );

  record(movements: BalanceSheetMovement[]) {
    for (const movement of movements) {
      this.latestMovementTs = Math.max(this.latestMovementTs, movement.serverTs);

      const bin = this.movementBinFor(movement.serverTs);
      const key = `${movement.rail}:${movement.bucket}`;
      const cell =
        bin.cells.get(key) ??
        ({
          bucket: movement.bucket,
          creditMinor: 0,
          debitMinor: 0,
          exceptionCount: 0,
          movementCount: 0,
          rail: movement.rail,
        } satisfies HeatmapDelta);
      const amountMinor = Math.abs(Number(movement.amountMinor));

      bin.maxAmountMinor = Math.max(bin.maxAmountMinor, amountMinor);
      cell.movementCount += 1;

      if (movement.side === "credit") {
        cell.creditMinor += amountMinor;
      } else {
        cell.debitMinor += amountMinor;
      }

      if (
        movement.status === "failed" ||
        movement.status === "held" ||
        movement.status === "pending"
      ) {
        cell.exceptionCount += 1;
      }

      bin.cells.set(key, cell);
    }
  }

  rollingAmountScaleMinor() {
    const cutoff = this.windowCutoff();

    return this.movementBins.reduce((max, bin) => {
      if (bin.startedAt <= cutoff) {
        return max;
      }

      return Math.max(max, bin.maxAmountMinor);
    }, 0);
  }

  heatmapSnapshot(): RailBucketHeatmapCell[] {
    const cutoff = this.windowCutoff();
    const totals = new Map<string, HeatmapDelta>();

    for (const bin of this.movementBins) {
      if (bin.startedAt <= cutoff) {
        continue;
      }

      for (const [key, cell] of bin.cells) {
        const total =
          totals.get(key) ??
          ({
            bucket: cell.bucket,
            creditMinor: 0,
            debitMinor: 0,
            exceptionCount: 0,
            movementCount: 0,
            rail: cell.rail,
          } satisfies HeatmapDelta);

        total.movementCount += cell.movementCount;
        total.creditMinor += cell.creditMinor;
        total.debitMinor += cell.debitMinor;
        total.exceptionCount += cell.exceptionCount;
        totals.set(key, total);
      }
    }

    const cells = [...totals.values()].map((cell) => {
      const amountMinor = cell.creditMinor + cell.debitMinor;

      return {
        amountPerSecMinor: amountMinor / (movementWindowMs / 1_000),
        bucket: cell.bucket,
        creditMinor: cell.creditMinor,
        debitMinor: cell.debitMinor,
        exceptionRate: cell.movementCount === 0 ? 0 : cell.exceptionCount / cell.movementCount,
        intensity: 0,
        movementRate: cell.movementCount / (movementWindowMs / 1_000),
        rail: cell.rail,
        skew: amountMinor === 0 ? 0 : (cell.creditMinor - cell.debitMinor) / amountMinor,
      } satisfies RailBucketHeatmapCell;
    });
    const maxAmountPerSecMinor = Math.max(1, ...cells.map((cell) => cell.amountPerSecMinor));

    return cells.map((cell) => ({
      ...cell,
      intensity: Math.sqrt(cell.amountPerSecMinor / maxAmountPerSecMinor),
    }));
  }

  private windowCutoff() {
    const now = this.latestMovementTs === 0 ? Date.now() : this.latestMovementTs;

    return now - movementWindowMs;
  }

  private movementBinFor(ts: number) {
    const startedAt = Math.floor(ts / movementBinMs) * movementBinMs;
    const bin = this.movementBins[Math.floor(startedAt / movementBinMs) % this.movementBins.length];

    if (bin.startedAt !== startedAt) {
      bin.startedAt = startedAt;
      bin.maxAmountMinor = 0;
      bin.cells.clear();
    }

    return bin;
  }
}
