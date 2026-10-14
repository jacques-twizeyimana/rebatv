import type { Metadata } from "next";
import Link from "next/link";
import s from "@/components/tv/tv.module.css";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className={s.tv}>
      <main id="main" className={s.gutter} style={{ paddingTop: "8em", paddingBottom: "8em", maxWidth: "48em" }}>
        <p className={s.logo} style={{ marginBottom: "1em" }}>
          <span>reba</span>
          <span className={s.logoAccent}>TV</span>
        </p>
        <h1 className={s.heroTitle} style={{ fontSize: "3.4em" }}>
          This channel is off the air
        </h1>
        <p className={s.heroDesc} style={{ margin: "1em 0 2em" }}>
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <Link href="/" className={s.cta} autoFocus>
          Back to live TV
        </Link>
      </main>
    </div>
  );
}
