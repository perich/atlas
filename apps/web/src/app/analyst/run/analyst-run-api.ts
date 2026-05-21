import {
  analystReportSpecSchema,
  analystRunEventSchema,
  type AnalystReportSpec,
  type AnalystRunEvent,
} from "@bankops/contracts";

export async function streamAnalystRun(input: {
  question: string;
  signal: AbortSignal;
  onEvent: (event: AnalystRunEvent) => void;
}) {
  const response = await fetch("/api/analyst/runs", {
    body: JSON.stringify({
      question: input.question,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
    signal: input.signal,
  });

  if (!response.ok) {
    throw new Error("Failed to start analyst run");
  }

  const body = response.body;
  if (!body) {
    throw new Error("Analyst run did not return a stream");
  }

  let report: AnalystReportSpec | undefined;
  for await (const event of parseSseEvents(body)) {
    input.onEvent(event);
    if (event.type === "report") {
      report = analystReportSpecSchema.parse(event.report);
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }

  if (!report) {
    throw new Error("Analyst run completed without a report");
  }

  return report;
}

async function* parseSseEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      // ReadableStream chunks must be consumed sequentially; each read depends on the prior result.
      // oxlint-disable-next-line no-await-in-loop
      const result = await reader.read();
      if (result.done) {
        break;
      }

      buffer += decoder.decode(result.value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const event of parseSseChunks(chunks)) {
        yield event;
      }
    }

    buffer += decoder.decode();
    if (!buffer) {
      return;
    }

    for (const event of parseSseChunks([buffer])) {
      yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function* parseSseChunks(chunks: string[]) {
  for (const chunk of chunks) {
    const data = parseSseData(chunk);
    if (data) {
      yield analystRunEventSchema.parse(JSON.parse(data));
    }
  }
}

function parseSseData(chunk: string) {
  const dataLines: string[] = [];

  for (const line of chunk.split("\n")) {
    if (line.startsWith("data: ")) {
      dataLines.push(line.slice(6));
    }
  }

  return dataLines.length > 0 ? dataLines.join("\n") : undefined;
}
