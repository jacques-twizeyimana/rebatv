"use client";

import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");
const format = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Local wall-clock time. Rendered after mount only, so static HTML never carries a stale time. */
export function Clock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    // Align updates to the start of each minute.
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <time className={className} dateTime={now?.toISOString()} aria-label={now ? `Local time ${format(now)}` : undefined}>
      {now ? format(now) : " "}
    </time>
  );
}
