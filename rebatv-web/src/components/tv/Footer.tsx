import s from "./tv.module.css";

export function Footer() {
  return (
    <footer className={s.footer}>
      <span className={s.hint}>
        <kbd className={s.key} aria-hidden="true">◀ ▲ ▼ ▶</kbd>
        <span>Move</span>
      </span>
      <span className={s.hint}>
        <kbd className={s.key}>OK</kbd>
        <span>Watch</span>
      </span>
      <span className={s.hint}>
        <kbd className={s.key}>BACK</kbd>
        <span>Return</span>
      </span>
      <span className={s.spacer} />
      <span>Streams over your home internet · No antenna needed</span>
    </footer>
  );
}
