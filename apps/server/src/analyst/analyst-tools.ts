import { toolDefinition } from "@tanstack/ai";
import type { AnalystRunEvent } from "@bankops/contracts";

import { createAnalystToolCatalog, type AnalystToolCatalogItem } from "./analyst-tool-catalog.js";

type EmitAnalystEvent = (event: AnalystRunEvent) => void;

export function createAnalystDataTools(emit?: EmitAnalystEvent) {
  return createAnalystToolCatalog().map((catalogItem) =>
    toolDefinition({
      name: catalogItem.name,
      description: catalogItem.description,
      inputSchema: catalogItem.inputSchema,
    }).server((rawInput) => runAnalystTool({ catalogItem, emit, rawInput })),
  );
}

function runAnalystTool({
  catalogItem,
  emit,
  rawInput,
}: {
  catalogItem: AnalystToolCatalogItem;
  emit?: EmitAnalystEvent;
  rawInput: unknown;
}) {
  const input = catalogItem.inputSchema.parse(rawInput);
  const inputSummary = catalogItem.inputSummary(input);

  emitProgress(emit, `Calling ${catalogItem.name}`, inputSummary);
  emitTrace(emit, "tool", catalogItem.name, inputSummary);

  const started = performance.now();
  const { result, resultSummary } = catalogItem.run(input);
  const detail = `${resultSummary} in ${Math.round(performance.now() - started)}ms`;

  emitProgress(emit, `Loaded ${toolLabel(catalogItem.name)}`, detail);
  emitTrace(emit, "tool", `${catalogItem.name} result`, detail);

  return result;
}

function emitProgress(emit: EmitAnalystEvent | undefined, label: string, detail?: string) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 500),
    label: label.slice(0, 160),
    type: "progress",
  });
}

function emitTrace(
  emit: EmitAnalystEvent | undefined,
  source: Extract<AnalystRunEvent, { type: "trace" }>["source"],
  label: string,
  detail?: string,
) {
  emit?.({
    at: new Date().toISOString(),
    detail: detail?.slice(0, 1_500),
    label: label.slice(0, 160),
    source,
    type: "trace",
  });
}

function toolLabel(name: string) {
  return name.replace(/^get_/, "").replaceAll("_", " ");
}
