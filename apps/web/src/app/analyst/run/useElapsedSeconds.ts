import { useEffect, useState } from "react";

export function useElapsedSeconds(startedAt: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (startedAt === null) {
      return undefined;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [startedAt]);

  return startedAt === null ? 0 : Math.max(Math.floor((now - startedAt) / 1_000), 0);
}
