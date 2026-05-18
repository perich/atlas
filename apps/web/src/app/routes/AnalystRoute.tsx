import React, { useState } from "react";

import { AnalystCanvas } from "../analyst/AnalystCanvas";
import { AnalystControlRail } from "../analyst/AnalystControlRail";
import { DEFAULT_ANALYST_PROMPT } from "../analyst/analyst-prompts";
import { AnalystWorkspaceShell } from "../analyst/AnalystWorkspaceShell";
import { useAnalystRun } from "../analyst/useAnalystRun";

export function AnalystRoute() {
  const [question, setQuestion] = useState(DEFAULT_ANALYST_PROMPT);
  const analystRun = useAnalystRun();
  const isEmpty = !analystRun.report && !analystRun.error && !analystRun.isRunning;

  return (
    <AnalystWorkspaceShell
      canvas={
        <AnalystCanvas
          error={analystRun.error}
          isRunning={analystRun.isRunning}
          progressEvents={analystRun.progressEvents}
          report={analystRun.report}
          startedAt={analystRun.startedAt}
          traceEvents={analystRun.traceEvents}
          validationAttempts={analystRun.validationAttempts}
        />
      }
      controlRail={
        <AnalystControlRail
          error={analystRun.error}
          hasReport={analystRun.report !== null}
          isEmpty={isEmpty}
          isRunning={analystRun.isRunning}
          onNewAnalysis={() => {
            setQuestion("");
            analystRun.reset();
          }}
          onQuestionChange={setQuestion}
          onSubmit={() => void analystRun.run(question.trim())}
          question={question}
          statusMessage={analystRun.statusMessage}
        />
      }
    />
  );
}
