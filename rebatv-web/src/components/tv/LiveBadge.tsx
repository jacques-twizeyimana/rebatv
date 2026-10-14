import s from "./tv.module.css";

export function LiveBadge({ className = s.live }: { className?: string }) {
  return (
    <span className={className}>
      <span className={s.liveDot} aria-hidden="true" />
      LIVE
    </span>
  );
}
