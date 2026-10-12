"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRY_COOKIE, GEO_COOKIE, marketPath } from "@/lib/site";
import type { Market } from "@/lib/types";
import s from "./tv.module.css";

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

function rememberCountry(code: string) {
  document.cookie = `${COUNTRY_COOKIE}=${code}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LocationPicker({ current, markets }: { current: Market; markets: Market[] }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- cookie is only readable after mount
    setDetected(readCookie(GEO_COOKIE));
  }, []);

  const open = () => {
    const dlg = dialogRef.current;
    if (!dlg || dlg.open) return;
    dlg.showModal();
    // Remote-friendly: start on the current country.
    dlg.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  };

  const close = () => dialogRef.current?.close();

  const pick = (code: string) => {
    rememberCountry(code);
    close();
    if (code !== current.code) router.push(marketPath(code));
  };

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        className={s.locButton}
        onClick={open}
        aria-haspopup="dialog"
        data-nav=""
      >
        <span className={s.pin} aria-hidden="true" />
        <span className={s.locName}>{current.name}</span>
        <span className={s.locChange}>
          Change<span className="sr-only"> country</span>
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className={s.dialog}
        aria-labelledby="loc-title"
        aria-describedby="loc-desc"
        onClose={() => openerRef.current?.focus()}
        onClick={(e) => {
          // Click on the backdrop closes the dialog.
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={s.dialogBody}>
          <div>
            <h2 id="loc-title" className={s.dialogTitle}>
              Which country are you in?
            </h2>
            <p id="loc-desc" className={s.dialogText}>
              We detected your country from your internet connection. Local channels follow the country you pick.
            </p>
          </div>
          <ul className={s.options}>
            {markets.map((m) => {
              const isCurrent = m.code === current.code;
              const mark = isCurrent ? "Current" : m.code === detected ? "Detected" : "";
              return (
                <li key={m.code}>
                  <button
                    type="button"
                    className={s.option}
                    onClick={() => pick(m.code)}
                    aria-current={isCurrent ? "true" : undefined}
                    data-nav=""
                    data-autofocus={isCurrent ? "" : undefined}
                  >
                    <span className={s.optionName}>{m.name}</span>
                    <span className={s.optionCount}>
                      {m.localCount} local {m.localCount === 1 ? "channel" : "channels"}
                    </span>
                    {mark && <span className={s.optionMark}>{mark}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </dialog>
    </>
  );
}
