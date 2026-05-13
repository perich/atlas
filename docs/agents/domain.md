# Domain Docs

This is a single-context repo for BankOps Mission Control.

## Before Exploring

Read these files when using engineering skills that need domain or architecture context:

- `CONTEXT.md` at the repo root for canonical domain language.
- `docs/adr/` for architectural decisions relevant to the work.
- `SPEC.md` for the current implementation target.

If one of these files does not exist in a future branch, proceed silently and use the context that is
available.

## Layout

```txt
/
├── CONTEXT.md
├── SPEC.md
├── docs/
│   ├── adr/
│   └── agents/
├── apps/
└── packages/
```

There is no `CONTEXT-MAP.md` and no per-package context split. Even though the repo is a monorepo,
the product/domain language is shared by the web app, server, and packages.

## Vocabulary

Use the glossary terms from `CONTEXT.md` when naming issues, implementation slices, tests, and
refactors. In particular:

- Use **Operator**, not end user or consumer.
- Use **Balance Sheet Tape** for the `/ops` firehose visualization.
- Use **Balance Sheet Movement** for `/ops` tape records.
- Use **Audit Entry** for `/audit` table rows.
- Use **Payment Rail**, **Settlement**, **Journal**, and **Reconciliation** according to the
  glossary distinctions.

If a proposed change contradicts an ADR, surface the conflict explicitly before proceeding.
