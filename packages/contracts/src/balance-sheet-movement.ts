import type { BalanceSheetMovement, MovementStatus, Rail, RiskTier } from "./domain.js";

export const BALANCE_SHEET_MOVEMENT_FLAGS = {
  Failed: 1,
  Held: 2,
  Stablecoin: 4,
  LargeAmount: 8,
  HighRisk: 16,
} as const;

export type BalanceSheetMovementFlag =
  (typeof BALANCE_SHEET_MOVEMENT_FLAGS)[keyof typeof BALANCE_SHEET_MOVEMENT_FLAGS];

const LARGE_AMOUNT_MINOR = 1_000_000_00n;

export function createBalanceSheetMovementFlags({
  amountMinor,
  rail,
  riskTier,
  status,
}: {
  amountMinor: bigint;
  rail: Rail;
  riskTier: RiskTier;
  status: MovementStatus;
}): number {
  let flags = 0;
  const magnitudeMinor = absMinor(amountMinor);

  if (status === "failed") {
    flags |= BALANCE_SHEET_MOVEMENT_FLAGS.Failed;
  }

  if (status === "held") {
    flags |= BALANCE_SHEET_MOVEMENT_FLAGS.Held;
  }

  if (rail === "stablecoin") {
    flags |= BALANCE_SHEET_MOVEMENT_FLAGS.Stablecoin;
  }

  if (magnitudeMinor >= LARGE_AMOUNT_MINOR) {
    flags |= BALANCE_SHEET_MOVEMENT_FLAGS.LargeAmount;
  }

  if (riskTier === 3) {
    flags |= BALANCE_SHEET_MOVEMENT_FLAGS.HighRisk;
  }

  return flags;
}

export function hasBalanceSheetMovementFlag(
  flags: number,
  flag: BalanceSheetMovementFlag,
): boolean {
  return (flags & flag) === flag;
}

export function movementMagnitudeMinor(
  movement: Pick<BalanceSheetMovement, "amountMinor">,
): bigint {
  return absMinor(movement.amountMinor);
}

export function movementMagnitudeMinorNumber(
  movement: Pick<BalanceSheetMovement, "amountMinor">,
): number {
  return safeMinorToNumber(movementMagnitudeMinor(movement));
}

export function movementAmountByBalanceSheetSide(
  movement: Pick<BalanceSheetMovement, "amountMinor" | "side">,
): { creditMinor: number; debitMinor: number } {
  const magnitudeMinor = safeMinorToNumber(absMinor(movement.amountMinor));

  return movement.side === "credit"
    ? { creditMinor: magnitudeMinor, debitMinor: 0 }
    : { creditMinor: 0, debitMinor: magnitudeMinor };
}

export function isExceptionPressureMovement(
  movement: Pick<BalanceSheetMovement, "status">,
): boolean {
  return (
    movement.status === "failed" || movement.status === "held" || movement.status === "pending"
  );
}

export function isExceptionQueueMovement(
  movement: Pick<BalanceSheetMovement, "kind" | "status">,
): boolean {
  return (
    movement.kind === "exception_hold" || movement.status === "failed" || movement.status === "held"
  );
}

export function balanceSheetMovementSideIsConsistent(
  movement: Pick<BalanceSheetMovement, "amountMinor" | "side">,
): boolean {
  if (movement.amountMinor === 0n) {
    return true;
  }

  return movement.side === "credit" ? movement.amountMinor > 0n : movement.amountMinor < 0n;
}

function absMinor(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function safeMinorToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Balance Sheet Movement amount exceeds the safe numeric UI range");
  }

  return Number(value);
}
