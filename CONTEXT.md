# BankOps Mission Control

BankOps Mission Control is a portfolio prototype for operating modern bank payment rails, ledger
finality, liquidity, and stablecoin settlement from one internal product surface.

## Language

**Operator**:
A bank employee or internal user investigating rail, ledger, liquidity, or reconciliation state.
_Avoid_: End user, consumer

**Customer**:
A company that holds deposits and sends or receives payments through the bank.
_Avoid_: User, account

**Account**:
A ledger-addressable balance container owned by a Customer or by the bank.
_Avoid_: Customer

**Payment Rail**:
An external or internal movement network such as ACH, wire, instant payments, card, internal ledger,
or stablecoin settlement.
_Avoid_: Network, channel

**Bank Core Event**:
A sequenced realtime activity record emitted by the simulator for payment, rail, ledger, risk,
liquidity, or system activity.
_Avoid_: Message, row

**Settlement**:
The point at which movement over a Payment Rail is considered final for that rail.
_Avoid_: Payment, transfer

**Journal**:
A balanced double-entry ledger record containing debits and credits.
_Avoid_: Transaction

**Reconciliation**:
The process of matching rail-observed activity to internal ledger finality.
_Avoid_: Sync, settlement

**Invariant**:
A domain rule that must stay true across rail events, journals, balances, and idempotency keys.
_Avoid_: Validation, check

**Incident**:
An operational condition that requires an Operator to investigate or act.
_Avoid_: Alert when the condition is still only informational

**Cutoff**:
A precise timestamp after which outgoing execution is gated and inbound activity is quarantined or
marked for review.
_Avoid_: Freeze, shutdown

**Saved View**:
A reusable ledger investigation state containing filters, columns, sorting, and drilldown context.
_Avoid_: Report

**Table Row**:
A server-queryable record rendered in the `/ledger` table.
_Avoid_: Bank Core Event unless the table explicitly uses event rows

## Relationships

- A **Customer** owns one or more **Accounts**.
- A **Payment Rail** emits or receives **Bank Core Events**.
- A **Bank Core Event** may produce one or more **Journals**.
- A **Journal** must satisfy double-entry ledger **Invariants**.
- **Reconciliation** matches rail finality to internal **Journal** finality.
- An **Incident** should deep-link to one or more **Saved Views**.
- A **Cutoff** changes how subsequent **Bank Core Events** are classified and executed.
- A **Table Row** may represent a **Bank Core Event**, **Journal**, exception, audit entry, or
  snapshot, depending on the chosen `/ledger` row subject.

## Example Dialogue

> **Dev:** "The stablecoin transfer settled on-chain. Can we mark the Customer's payment complete?"
> **Domain expert:** "Only after Reconciliation confirms there is a corresponding internal Journal.
> Rail Settlement and ledger finality are related, but they are not the same state."

## Flagged Ambiguities

- "Account" should not mean **Customer**. Customers own Accounts; Accounts hold balances.
- "Transaction" is overloaded. Use **Bank Core Event** for realtime stream activity and **Journal**
  for double-entry ledger records.
- "Settlement" and **Reconciliation** are distinct. Settlement is rail finality; Reconciliation is
  matching rail finality to internal ledger finality.
- `/ledger` is a route name, not yet a resolved row subject. The rows may become audit entries,
  payment events, journals, exceptions, or snapshots.
