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

**Balance Sheet Tape**:
A dense scrolling visual tape of credit and debit movements affecting high-level bank balance sheet
buckets.
_Avoid_: Trade history, order book, market-depth ladder

**Balance Sheet Movement**:
A simplified debit or credit record used by the `/ops` firehose to show activity against the bank's
global balance sheet.
_Avoid_: Journal, unless the record is a balanced double-entry Journal

**Balance Sheet Perspective**:
The bank balance sheet bucket point of view used to label Balance Sheet Movements as credits or
debits.
_Avoid_: Customer perspective

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
A reusable audit investigation state containing filters, columns, sorting, and drilldown context.
_Avoid_: Report

**Audit Entry**:
A server-queryable operational envelope rendered in the `/audit` table, with common investigation
fields and type-specific detail.
_Avoid_: Transaction, ledger row

## Relationships

- A **Customer** owns one or more **Accounts**.
- A **Payment Rail** emits or receives **Bank Core Events**.
- A **Balance Sheet Tape** renders many **Balance Sheet Movements**.
- A **Balance Sheet Tape** renders raw **Balance Sheet Movements** in supported modes, not
  summarized or sampled rows.
- A **Balance Sheet Movement** may reference a **Customer**, **Account**, **Payment Rail**, or
  **Journal**.
- A **Balance Sheet Movement** is labeled from the **Balance Sheet Perspective**.
- A **Bank Core Event** may produce one or more **Journals**.
- A **Journal** must satisfy double-entry ledger **Invariants**.
- **Reconciliation** matches rail finality to internal **Journal** finality.
- An **Incident** should deep-link to one or more **Saved Views**.
- A **Cutoff** changes how subsequent **Bank Core Events** are classified and executed.
- An **Audit Entry** may reference a **Bank Core Event**, **Journal**, **Customer**, **Account**, or
  **Payment Rail**.
- An **Audit Entry** has exactly one subject type, such as payment, journal, customer, account,
  rail, settlement, exception, configuration, cutoff, or operator action.

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
- `/audit` renders **Audit Entries** from the Bank Core Audit Log. It is broader than a pure ledger
  journal table.
- The `/ops` **Balance Sheet Tape** is inspired by trading UI tapes, but it is not a trade history:
  its rows are debit and credit movements, not asset trades.
- **Balance Sheet Perspective** means a credit increases the referenced balance sheet bucket and a
  debit decreases it; it does not describe whether the Customer feels richer or poorer.
