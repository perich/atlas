import React from "react";

import type { AnalystReportRunPhase, AnalystReportSpec } from "@bankops/contracts";

import {
  AnalystRunProvider,
  useAnalystRunActions,
  useAnalystRunSelector,
  type AnalystRunSnapshot,
} from "../analyst/run/useAnalystRun";
import {
  isAnalystRunPhaseActive,
  type AnalystRunTimeline,
} from "../analyst/run/analyst-run-timeline";
import { AnalystCanvas } from "../analyst/workspace/AnalystCanvas";
import { AnalystControlRail } from "../analyst/workspace/AnalystControlRail";
import { AnalystRunStatus } from "../analyst/workspace/AnalystRunStatus";
import { AnalystWorkspaceShell } from "../analyst/workspace/AnalystWorkspaceShell";

export function AnalystRoute() {
  return (
    <AnalystRunProvider>
      <AnalystWorkspaceShell
        canvas={<AnalystCanvasStream />}
        controlRail={<AnalystControlRailStream />}
        statusBar={<AnalystRunStatusStream />}
      />
    </AnalystRunProvider>
  );
}

function AnalystCanvasStream() {
  const { error, isRunning, report, startedAt, timeline } = useAnalystRunSelector(
    selectAnalystCanvasState,
    areAnalystCanvasStatesEqual,
  );

  return (
    <AnalystCanvas
      error={error}
      isRunning={isRunning}
      report={report}
      startedAt={startedAt}
      timeline={timeline}
    />
  );
}

function AnalystControlRailStream() {
  const [question, setQuestion] = React.useState("");
  const { reset, run } = useAnalystRunActions();
  const { isEmpty, isRunning } = useAnalystRunSelector(
    selectAnalystControlRailState,
    areAnalystControlRailStatesEqual,
  );

  return (
    <AnalystControlRail
      isEmpty={isEmpty}
      isRunning={isRunning}
      onNewAnalysis={() => {
        setQuestion("");
        reset();
      }}
      onQuestionChange={setQuestion}
      onSubmit={() => {
        const trimmedQuestion = question.trim();

        if (!trimmedQuestion) {
          return;
        }

        setQuestion("");
        void run(trimmedQuestion);
      }}
      question={question}
    />
  );
}

function AnalystRunStatusStream() {
  const { completedDurationSeconds, error, isEmpty, phase, statusMessage } = useAnalystRunSelector(
    selectAnalystRunStatusState,
    areAnalystRunStatusStatesEqual,
  );

  return (
    <AnalystRunStatus
      completedDurationSeconds={completedDurationSeconds}
      error={error}
      isEmpty={isEmpty}
      phase={phase}
      statusMessage={statusMessage}
    />
  );
}

type AnalystCanvasState = {
  error: string | null;
  isRunning: boolean;
  report: AnalystReportSpec | null;
  startedAt: number | null;
  timeline: AnalystRunTimeline;
};

type AnalystControlRailState = {
  isEmpty: boolean;
  isRunning: boolean;
};

type AnalystRunStatusState = {
  completedDurationSeconds: number | null;
  error: string | null;
  isEmpty: boolean;
  phase: AnalystReportRunPhase;
  statusMessage: string | null;
};

function isAnalystRunEmpty(snapshot: AnalystRunSnapshot) {
  return !snapshot.report && !snapshot.error && !isAnalystRunPhaseActive(snapshot.phase);
}

function selectAnalystCanvasState(snapshot: AnalystRunSnapshot): AnalystCanvasState {
  return {
    error: snapshot.error,
    isRunning: isAnalystRunPhaseActive(snapshot.phase),
    report: snapshot.report,
    startedAt: snapshot.startedAt,
    timeline: snapshot.timeline,
  };
}

function selectAnalystControlRailState(snapshot: AnalystRunSnapshot): AnalystControlRailState {
  return {
    isEmpty: isAnalystRunEmpty(snapshot),
    isRunning: isAnalystRunPhaseActive(snapshot.phase),
  };
}

function selectAnalystRunStatusState(snapshot: AnalystRunSnapshot): AnalystRunStatusState {
  return {
    completedDurationSeconds: snapshot.completedDurationSeconds,
    error: snapshot.error,
    isEmpty: isAnalystRunEmpty(snapshot),
    phase: snapshot.phase,
    statusMessage: snapshot.timeline.statusMessage,
  };
}

function areAnalystCanvasStatesEqual(left: AnalystCanvasState, right: AnalystCanvasState) {
  return (
    left.error === right.error &&
    left.isRunning === right.isRunning &&
    left.report === right.report &&
    left.startedAt === right.startedAt &&
    left.timeline === right.timeline
  );
}

function areAnalystControlRailStatesEqual(
  left: AnalystControlRailState,
  right: AnalystControlRailState,
) {
  return left.isEmpty === right.isEmpty && left.isRunning === right.isRunning;
}

function areAnalystRunStatusStatesEqual(left: AnalystRunStatusState, right: AnalystRunStatusState) {
  return (
    left.completedDurationSeconds === right.completedDurationSeconds &&
    left.error === right.error &&
    left.isEmpty === right.isEmpty &&
    left.phase === right.phase &&
    left.statusMessage === right.statusMessage
  );
}
