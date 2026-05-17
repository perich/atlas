import { describe, expect, it } from "vitest";

import {
  BALANCE_SHEET_MOVEMENT_FLAGS,
  balanceSheetMovementSideIsConsistent,
  createBalanceSheetMovementFlags,
  hasBalanceSheetMovementFlag,
  isExceptionPressureMovement,
  isExceptionQueueMovement,
  movementAmountByBalanceSheetSide,
  movementMagnitudeMinorNumber,
  type BalanceSheetMovement,
} from "./index.js";

const baseMovement: BalanceSheetMovement = {
  seq: 1n,
  serverTs: 1_778_600_000_000,
  kind: "stablecoin_debit",
  side: "debit",
  bucket: "stablecoin_treasury",
  rail: "stablecoin",
  asset: "USDC",
  customerId: 42,
  accountId: 420,
  amountMinor: -1_500_000_00n,
  latencyMs: 120,
  status: "held",
  riskTier: 3,
  flags: 0,
};

describe("Balance Sheet Movement rules", () => {
  it("creates and reads packed movement flags from named domain facts", () => {
    const flags = createBalanceSheetMovementFlags(baseMovement);

    expect(hasBalanceSheetMovementFlag(flags, BALANCE_SHEET_MOVEMENT_FLAGS.Held)).toBe(true);
    expect(hasBalanceSheetMovementFlag(flags, BALANCE_SHEET_MOVEMENT_FLAGS.Stablecoin)).toBe(true);
    expect(hasBalanceSheetMovementFlag(flags, BALANCE_SHEET_MOVEMENT_FLAGS.LargeAmount)).toBe(true);
    expect(hasBalanceSheetMovementFlag(flags, BALANCE_SHEET_MOVEMENT_FLAGS.HighRisk)).toBe(true);
    expect(hasBalanceSheetMovementFlag(flags, BALANCE_SHEET_MOVEMENT_FLAGS.Failed)).toBe(false);
  });

  it("projects amount from the Balance Sheet Perspective", () => {
    expect(movementMagnitudeMinorNumber(baseMovement)).toBe(1_500_000_00);
    expect(movementAmountByBalanceSheetSide(baseMovement)).toEqual({
      creditMinor: 0,
      debitMinor: 1_500_000_00,
    });
    expect(
      movementAmountByBalanceSheetSide({
        ...baseMovement,
        amountMinor: 125_00n,
        side: "credit",
      }),
    ).toEqual({ creditMinor: 125_00, debitMinor: 0 });
  });

  it("separates exception pressure from exception queue movement", () => {
    expect(isExceptionPressureMovement({ ...baseMovement, status: "pending" })).toBe(true);
    expect(
      isExceptionQueueMovement({ ...baseMovement, kind: "wire_debit", status: "pending" }),
    ).toBe(false);
    expect(
      isExceptionQueueMovement({ ...baseMovement, kind: "exception_hold", status: "posted" }),
    ).toBe(true);
  });

  it("names the side/sign Invariant without forcing every synthetic fixture through it", () => {
    expect(balanceSheetMovementSideIsConsistent(baseMovement)).toBe(true);
    expect(
      balanceSheetMovementSideIsConsistent({
        ...baseMovement,
        amountMinor: 1n,
        side: "debit",
      }),
    ).toBe(false);
  });
});
