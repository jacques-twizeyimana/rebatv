import type { Metadata } from "next";
import Link from "next/link";
import { toggleChannel } from "@/app/sandberg/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/dal";
import { adminChannels, adminCountries } from "@/lib/data/admin";
import { hueVars } from "@/lib/site";
import a from "@/components/admin/admin.module.css";
import tv from "@/components/tv/tv.module.css";

export const metadata: Metadata = { title: "Channels" };

export default async function ChannelsPage({ searchParams }: PageProps<"/sandberg">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const country = typeof sp.country === "string" ? sp.country.toUpperCase() : "";
  const status = typeof sp.status === "string" ? sp.status : "";
  const [all, countries] = await Promise.all([adminChannels(), adminCountries()]);

  const rows = all.filter(
    (c) =>
      (!q || `${c.name} ${c.shortName} ${c.slug} ${c.genre}`.toLowerCase().includes(q)) &&
      (!country || c.countryCode === country) &&
      (!status ||
        (status === "active" && c.isActive) ||
        (status === "hidden" && !c.isActive) ||
        (status === "nostream" && !c.streamUrl)),
  );
  const missingStreams = all.filter((c) => c.isActive && !c.streamUrl).length;

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.h1}>Channels</h1>
        <span className={a.sub}>
          {all.length} total · {all.filter((c) => c.isActive).length} live on the site
        </span>
        <Link href="/sandberg/channels/new" className={`${a.btn} ${a.push}`}>
          + New channel
        </Link>
      </div>

      {sp.saved && <p className={a.notice} role="status">Channel created.</p>}
      {sp.deleted && <p className={a.notice} role="status">Channel deleted.</p>}
      {missingStreams > 0 && !status && (
        <p className={a.alert} style={{ marginBottom: "1rem" }}>
          {missingStreams} active {missingStreams === 1 ? "channel has" : "channels have"} no stream URL and will show as off air.{" "}
          <Link href="/sandberg?status=nostream">Show them</Link>
        </p>
      )}

      <form className={a.toolbar} role="search" aria-label="Filter channels">
        <div className={a.field}>
          <label htmlFor="q" className={a.label}>Search</label>
          <input id="q" name="q" type="search" className={a.input} defaultValue={q} placeholder="Name, slug or genre" />
        </div>
        <div className={a.field}>
          <label htmlFor="country" className={a.label}>Country</label>
          <select id="country" name="country" className={a.input} defaultValue={country}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className={a.field}>
          <label htmlFor="status" className={a.label}>Status</label>
          <select id="status" name="status" className={a.input} defaultValue={status}>
            <option value="">Any</option>
            <option value="active">Live on site</option>
            <option value="hidden">Hidden</option>
            <option value="nostream">No stream URL</option>
          </select>
        </div>
        <button type="submit" className={a.btnGhost}>Filter</button>
        {(q || country || status) && <Link href="/sandberg" className={a.btnGhost}>Reset</Link>}
      </form>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <caption className="sr-only">Channels ({rows.length})</caption>
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Preview</span></th>
              <th scope="col">Channel</th>
              <th scope="col">Country</th>
              <th scope="col">Genre</th>
              <th scope="col">Order</th>
              <th scope="col">Status</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className={`${a.swatch} ${tv.gradient}`} style={hueVars(c.hue)} aria-hidden="true">{c.shortName}</span>
                </td>
                <td>
                  <Link href={`/sandberg/channels/${c.id}`} className={a.rowLink}>{c.name}</Link>
                  <div className={a.muted} style={{ fontSize: "0.8rem" }}>/{c.slug}</div>
                </td>
                <td>{c.countryName}</td>
                <td>{c.genre}</td>
                <td className={a.muted}>{c.sortOrder}</td>
                <td>
                  <span style={{ display: "inline-flex", gap: "0.3rem", flexWrap: "wrap" }}>
                    {c.isActive ? <span className={a.pillOn}>Live</span> : <span className={a.pill}>Hidden</span>}
                    {c.featured && <span className={a.pillWarn}>Featured</span>}
                    {!c.streamUrl && <span className={a.pill}>No stream</span>}
                  </span>
                </td>
                <td>
                  <div className={a.actions}>
                    <form action={toggleChannel}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton className={`${a.btnGhost} ${a.btnSmall}`} pendingText="…">
                        {c.isActive ? "Hide" : "Show"}<span className="sr-only"> {c.name}</span>
                      </SubmitButton>
                    </form>
                    <Link href={`/sandberg/channels/${c.id}`} className={`${a.btnGhost} ${a.btnSmall}`}>
                      Edit<span className="sr-only"> {c.name}</span>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className={a.muted} style={{ padding: "2rem", textAlign: "center" }}>No channels match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
