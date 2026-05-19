import React, { useState } from "react";

import { useAnalystRun } from "../analyst/run/useAnalystRun";
import { AnalystCanvas } from "../analyst/workspace/AnalystCanvas";
import { AnalystControlRail } from "../analyst/workspace/AnalystControlRail";
import { AnalystRunStatus } from "../analyst/workspace/AnalystRunStatus";
import { AnalystWorkspaceShell } from "../analyst/workspace/AnalystWorkspaceShell";

export function AnalystRoute() {
  const [question, setQuestion] = useState("");
  const analystRun = useAnalystRun();
  const isEmpty = !analystRun.report && !analystRun.error && !analystRun.isRunning;

  return (
    <AnalystWorkspaceShell
      canvas={
        <AnalystCanvas
          error={analystRun.error}
          isRunning={analystRun.isRunning}
          report={analystRun.report}
          startedAt={analystRun.startedAt}
          timeline={analystRun.timeline}
        />
      }
      controlRail={
        <AnalystControlRail
          isEmpty={isEmpty}
          isRunning={analystRun.isRunning}
          onNewAnalysis={() => {
            setQuestion("");
            analystRun.reset();
          }}
          onQuestionChange={setQuestion}
          onSubmit={() => {
            const trimmedQuestion = question.trim();

            if (!trimmedQuestion) {
              return;
            }

            setQuestion("");
            void analystRun.run(trimmedQuestion);
          }}
          question={question}
        />
      }
      statusBar={
        <AnalystRunStatus
          completedDurationSeconds={analystRun.completedDurationSeconds}
          error={analystRun.error}
          isEmpty={isEmpty}
          statusMessage={analystRun.timeline.statusMessage}
        />
      }
    />
  );
}
