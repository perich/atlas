import { toolDefinition } from "@tanstack/ai";

import {
  emitAnalystProgress,
  emitAnalystTrace,
  type EmitAnalystEvent,
} from "./analyst-run-events.js";
import { createAnalystToolCatalog, type AnalystToolCatalogItem } from "./analyst-tool-catalog.js";

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
  const preparedTool = catalogItem.prepare(rawInput);

  emitAnalystProgress(emit, `Calling ${catalogItem.name}`, preparedTool.inputSummary);
  emitAnalystTrace(emit, "tool", catalogItem.name, preparedTool.inputSummary);

  const started = performance.now();
  const { result, resultSummary } = preparedTool.run();
  const detail = `${resultSummary} in ${Math.round(performance.now() - started)}ms`;

  emitAnalystProgress(emit, `Loaded ${toolLabel(catalogItem.name)}`, detail);
  emitAnalystTrace(emit, "tool", `${catalogItem.name} result`, detail);

  return result;
}

function toolLabel(name: string) {
  return name.replace(/^get_/, "").replaceAll("_", " ");
}
