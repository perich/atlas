import React, { useCallback, useEffect, useRef } from "react";

import type { TapeCanvasLayout } from "./ops-stream-messages";

const tapeCanvasCssHeight = 620;

export function BalanceSheetTape({
  attachTapeCanvas,
  resizeTapeCanvas,
}: {
  attachTapeCanvas: (canvas: OffscreenCanvas, layout: TapeCanvasLayout) => void;
  resizeTapeCanvas: (layout: TapeCanvasLayout) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transferredRef = useRef(false);
  const attachCanvasRef = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      canvasRef.current = canvas;

      if (canvas === null || transferredRef.current) {
        return;
      }

      const layout = readTapeCanvasLayout(canvas);

      sizeCanvasElement(canvas, layout);
      transferredRef.current = true;
      attachTapeCanvas(canvas.transferControlToOffscreen(), layout);
    },
    [attachTapeCanvas],
  );

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null || !("ResizeObserver" in window)) {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      resizeTapeCanvas(readTapeCanvasLayout(canvas));
    });

    observer.observe(canvas);

    return () => observer.disconnect();
  }, [resizeTapeCanvas]);

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden border border-white/[0.075] bg-[#070809]">
      <canvas
        aria-label="Live balance sheet movement tape"
        className="block size-full"
        data-testid="balance-sheet-tape"
        height={tapeCanvasCssHeight}
        ref={attachCanvasRef}
        width={1100}
      />
    </div>
  );
}

function readTapeCanvasLayout(canvas: HTMLCanvasElement): TapeCanvasLayout {
  const rect = canvas.getBoundingClientRect();

  return {
    dpr: Math.max(1, window.devicePixelRatio || 1),
    height: Math.max(1, Math.round(rect.height || canvas.clientHeight || tapeCanvasCssHeight)),
    width: Math.max(1, Math.round(rect.width || canvas.clientWidth || 1_100)),
  };
}

function sizeCanvasElement(canvas: HTMLCanvasElement, layout: TapeCanvasLayout) {
  canvas.height = Math.round(layout.height * layout.dpr);
  canvas.width = Math.round(layout.width * layout.dpr);
}
