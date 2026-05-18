import type { AnalystRunEvent } from "@bankops/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { runAnalystCodeMode } from "./analyst/analyst-runner.js";

const analystRunRequestSchema = z.object({
  question: z.string().min(1).max(2_000),
});

export function registerAnalystApi(app: FastifyInstance) {
  app.post("/api/analyst/runs", async (request, reply) => {
    const parsedBody = analystRunRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      return reply.code(400).send({
        error: "bad_request",
        message: parsedBody.error.message,
      });
    }

    const body = parsedBody.data;

    reply.raw.writeHead(200, {
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
    });

    const emit = (event: AnalystRunEvent) => writeSse(reply.raw, event);
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 420_000);
    request.raw.on("aborted", () => abortController.abort());

    try {
      await runAnalystCodeMode({
        abortController,
        emit,
        question: body.question,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analyst run failed";
      emit({ message, type: "error" });
      emit({ phase: "error", message, type: "phase" });
    } finally {
      clearTimeout(timeout);
      reply.raw.end();
    }

    return undefined;
  });
}

function writeSse(stream: NodeJS.WritableStream, event: AnalystRunEvent) {
  stream.write(`event: ${event.type}\n`);
  stream.write(`data: ${JSON.stringify(event)}\n\n`);
}
