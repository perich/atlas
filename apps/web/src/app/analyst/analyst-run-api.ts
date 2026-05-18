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

  while (true) {
    // oxlint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });

    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const data = parseSseData(chunk);
      if (data) {
        yield analystRunEventSchema.parse(JSON.parse(data));
      }
      boundary = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }
}

function parseSseData(chunk: string) {
  const dataLines = chunk
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.slice(6));

  return dataLines.length > 0 ? dataLines.join("\n") : undefined;
}
