"use client";

import { useState } from "react";
import { saveCountry } from "@/app/sandberg/actions";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";
import a from "./admin.module.css";

type Props = {
  mode: "create" | "update";
  initial: Record<string, string>;
  channels?: { id: string; name: string }[];
};

export function CountryForm({ mode, initial, channels = [] }: Props) {
  const { state, onSubmit, pending } = useFormAction(saveCountry, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  // Controlled: React's post-action form reset would otherwise restore a <select>'s initial option.
  const [hero, setHero] = useState(v.heroChannelId ?? "");
  const p = (name: string) => `${mode}-${initial.code || "new"}-${name}`;

  return (
    <form onSubmit={onSubmit} className={a.stack} noValidate>
      <input type="hidden" name="mode" value={mode} />
      {state.message && (
        <p className={state.ok ? a.notice : a.alert} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      <div className={a.grid3}>
        {mode === "create" ? (
          <Field id={p("code")} label="ISO code" help="Two letters, e.g. BI" error={e.code}>
            {(f) => <input {...f} name="code" className={a.input} defaultValue={v.code} maxLength={2} required style={{ textTransform: "uppercase" }} />}
          </Field>
        ) : (
          <input type="hidden" name="code" value={initial.code} />
        )}
        <Field id={p("name")} label="Name" error={e.name}>
          {(f) => <input {...f} name="name" className={a.input} defaultValue={v.name} maxLength={80} required />}
        </Field>
        <Field id={p("sortOrder")} label="Order" error={e.sortOrder}>
          {(f) => <input {...f} name="sortOrder" type="number" min={0} className={a.input} defaultValue={v.sortOrder ?? "0"} />}
        </Field>
        {mode === "update" && (
          <Field id={p("heroChannelId")} label="Hero channel" help="Big banner on this country’s home" error={e.heroChannelId}>
            {(f) => (
              <select {...f} name="heroChannelId" className={a.input} value={hero} onChange={(ev) => setHero(ev.target.value)}>
                <option value="">First local channel</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </div>
      {mode === "update" && (
        <Field id={p("heroBlurb")} label="Hero text" help="One or two sentences, 280 characters max." error={e.heroBlurb}>
          {(f) => <textarea {...f} name="heroBlurb" className={a.input} defaultValue={v.heroBlurb} maxLength={280} />}
        </Field>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <label className={a.check}>
          <input type="checkbox" name="isMarket" defaultChecked={v.isMarket === "on"} />
          Market (in the country picker, with its own home page)
        </label>
        <span className={a.push}>
          <SubmitButton pending={pending}>{mode === "create" ? "Add country" : "Save"}</SubmitButton>
        </span>
      </div>
    </form>
  );
}
