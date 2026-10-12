"use client";

import { useState } from "react";
import { saveChannel } from "@/app/sandberg/actions";
import { hueVars } from "@/lib/site";
import { slugify } from "@/lib/slug";
import { Field } from "./Field";
import { SubmitButton } from "./SubmitButton";
import { useFormAction } from "./useFormAction";
import a from "./admin.module.css";
import tv from "@/components/tv/tv.module.css";

type Props = {
  initial: Record<string, string>;
  countries: { code: string; name: string }[];
  genres: string[];
};

export function ChannelForm({ initial, countries, genres }: Props) {
  const { state, onSubmit, pending } = useFormAction(saveChannel, { values: initial });
  const v = state.values ?? initial;
  const e = state.errors ?? {};
  const isNew = !initial.id;

  const [name, setName] = useState(v.name ?? "");
  const [slug, setSlug] = useState(v.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [short, setShort] = useState(v.shortName ?? "");
  const [hue, setHue] = useState(Number(v.hue ?? 210));
  const [logo, setLogo] = useState(v.logoUrl ?? "");
  // Controlled: React's post-action form reset would otherwise restore a <select>'s initial option.
  const [country, setCountry] = useState(v.countryCode ?? "");

  return (
    <form onSubmit={onSubmit} className={a.stack} noValidate>
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state.message && (
        <p className={state.ok ? a.notice : a.alert} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      )}
      {Object.keys(e).length > 0 && (
        <p className={a.alert} role="alert">
          Please fix the highlighted fields.
        </p>
      )}

      <div className={a.card}>
        <div className={a.stack}>
          <div className={a.grid2}>
            <Field id="name" label="Name" error={e.name}>
              {(p) => (
                <input
                  {...p}
                  name="name"
                  className={a.input}
                  value={name}
                  maxLength={80}
                  required
                  onChange={(ev) => {
                    setName(ev.target.value);
                    if (!slugTouched) setSlug(slugify(ev.target.value));
                  }}
                />
              )}
            </Field>
            <Field id="slug" label="URL slug" help={`/rw/watch/${slug || "…"}`} error={e.slug}>
              {(p) => (
                <input
                  {...p}
                  name="slug"
                  className={a.input}
                  value={slug}
                  maxLength={64}
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  onChange={(ev) => {
                    setSlugTouched(true);
                    setSlug(ev.target.value.toLowerCase());
                  }}
                />
              )}
            </Field>
          </div>
          <div className={a.grid3}>
            <Field id="shortName" label="Short code" help="Shown on cards, e.g. RTV" error={e.shortName}>
              {(p) => (
                <input {...p} name="shortName" className={a.input} value={short} maxLength={12} required onChange={(ev) => setShort(ev.target.value.toUpperCase())} />
              )}
            </Field>
            <Field id="genre" label="Genre" help="Search chips match News, Sports, Music, Entertainment, Religion" error={e.genre}>
              {(p) => <input {...p} name="genre" className={a.input} defaultValue={v.genre} list="genres" maxLength={60} required />}
            </Field>
            <Field id="countryCode" label="Country" error={e.countryCode}>
              {(p) => (
                <select {...p} name="countryCode" className={a.input} value={country} onChange={(ev) => setCountry(ev.target.value)} required>
                  <option value="" disabled>
                    Choose…
                  </option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <datalist id="genres">
            {genres.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <Field id="description" label="Description" help="Used for search engines and the hero banner. 400 characters max." error={e.description}>
            {(p) => <textarea {...p} name="description" className={a.input} defaultValue={v.description} maxLength={400} />}
          </Field>
        </div>
      </div>

      <div className={a.card}>
        <div className={a.stack}>
          <Field id="streamUrl" label="HLS stream URL" help="https:// link to the .m3u8 playlist. Leave empty to show the channel as off air." error={e.streamUrl}>
            {(p) => <input {...p} name="streamUrl" type="url" inputMode="url" className={a.input} defaultValue={v.streamUrl} placeholder="https://…/index.m3u8" />}
          </Field>
          <Field id="logoUrl" label="Logo URL" help="Optional https:// image, shown on a white tile (PNG or SVG with a transparent background works best). Without one, cards use the colour and short code." error={e.logoUrl}>
            {(p) => <input {...p} name="logoUrl" type="url" inputMode="url" className={a.input} value={logo} onChange={(ev) => setLogo(ev.target.value)} placeholder="https://…/logo.svg" />}
          </Field>
          <div className={a.grid2}>
            <Field id="hue" label={`Card colour (hue ${hue}°)`} error={e.hue}>
              {(p) => <input {...p} name="hue" type="range" min={0} max={359} className={a.hue} value={hue} onChange={(ev) => setHue(Number(ev.target.value))} />}
            </Field>
            <div className={a.field}>
              <span className={a.label} id="preview-label">
                Preview
              </span>
              <div className={`${a.preview} ${tv.gradient}`} style={hueVars(hue)} role="img" aria-labelledby="preview-label">
                <div className={tv.scanlines} />
                {logo.startsWith("https://") ? (
                  <div className={tv.thumbLogo}>
                    <span className={tv.logoTile}>
                      <span className={tv.logoBox}>
                        {/* Plain <img>: previews any URL while typing, before it's saved. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo} alt="" referrerPolicy="no-referrer" className={tv.logoImg} />
                      </span>
                    </span>
                  </div>
                ) : (
                  <span className={a.previewLabel}>{short || "TV"}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={a.card}>
        <div className={a.grid2}>
          <Field id="sortOrder" label="Order" help="Lower numbers come first within the country (and get lower channel numbers)." error={e.sortOrder}>
            {(p) => <input {...p} name="sortOrder" type="number" min={0} step={1} className={a.input} defaultValue={v.sortOrder ?? "0"} />}
          </Field>
          <div className={a.field} style={{ justifyContent: "center" }}>
            <label className={a.check}>
              <input type="checkbox" name="isActive" defaultChecked={(v.isActive ?? "on") === "on"} />
              Visible on the site
            </label>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <SubmitButton pending={pending}>{isNew ? "Create channel" : "Save changes"}</SubmitButton>
      </div>
    </form>
  );
}
