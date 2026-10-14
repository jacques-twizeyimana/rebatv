import type { Metadata } from "next";
import { addFeatured, moveFeatured, removeFeatured } from "@/app/sandberg/actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/dal";
import { adminChannels, adminFeatured } from "@/lib/data/admin";
import { FEATURED_LOCAL_MAX, FEATURED_ROW_SIZE } from "@/lib/lineup";
import { hueVars } from "@/lib/site";
import a from "@/components/admin/admin.module.css";
import tv from "@/components/tv/tv.module.css";

export const metadata: Metadata = { title: "Featured" };

export default async function FeaturedPage() {
  await requireAdmin();
  const [featured, channels] = await Promise.all([adminFeatured(), adminChannels()]);
  const featuredIds = new Set(featured.map((f) => f.id));
  const candidates = channels.filter((c) => !featuredIds.has(c.id));
  const byCountry = new Map<string, typeof candidates>();
  for (const c of candidates) byCountry.set(c.countryName, [...(byCountry.get(c.countryName) ?? []), c]);

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.h1}>Featured channels</h1>
      </div>
      <p className={a.muted} style={{ marginBottom: "1.5rem", maxWidth: "48rem" }}>
        The Featured row on each country’s home shows up to {FEATURED_LOCAL_MAX} featured channels from that country, then
        featured channels from elsewhere, in this order, {FEATURED_ROW_SIZE} in total.
      </p>

      <div className={a.stack}>
        <section className={a.card} aria-labelledby="featured-list">
          <h2 id="featured-list" className={a.label} style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>
            Order ({featured.length})
          </h2>
          {featured.length === 0 ? (
            <p className={a.muted}>No featured channels yet.</p>
          ) : (
            <ol className={a.list}>
              {featured.map((f, i) => (
                <li key={f.id} className={a.listItem}>
                  <span className={a.pos}>{i + 1}</span>
                  <span className={`${a.swatch} ${tv.gradient}`} style={hueVars(f.hue)} aria-hidden="true">{f.shortName}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{f.name}</strong> <span className={a.muted}>· {f.countryName}</span>
                    {!f.isActive && <span className={a.pill} style={{ marginLeft: "0.5rem" }}>Hidden</span>}
                  </span>
                  <div className={a.actions}>
                    <form action={moveFeatured}>
                      <input type="hidden" name="channelId" value={f.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit" className={`${a.btnGhost} ${a.btnSmall}`} disabled={i === 0} aria-label={`Move ${f.name} up`}>↑</button>
                    </form>
                    <form action={moveFeatured}>
                      <input type="hidden" name="channelId" value={f.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit" className={`${a.btnGhost} ${a.btnSmall}`} disabled={i === featured.length - 1} aria-label={`Move ${f.name} down`}>↓</button>
                    </form>
                    <form action={removeFeatured}>
                      <input type="hidden" name="channelId" value={f.id} />
                      <SubmitButton className={`${a.btnDanger} ${a.btnSmall}`} pendingText="…">
                        Remove<span className="sr-only"> {f.name}</span>
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={a.card} aria-labelledby="featured-add">
          <h2 id="featured-add" className={a.label} style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>
            Add a channel
          </h2>
          <form action={addFeatured} className={a.toolbar} style={{ marginBottom: 0 }}>
            <div className={a.field} style={{ minWidth: "18rem" }}>
              <label htmlFor="channelId" className={a.label}>Channel</label>
              <select id="channelId" name="channelId" className={a.input} required defaultValue="">
                <option value="" disabled>Choose…</option>
                {[...byCountry.entries()].map(([country, list]) => (
                  <optgroup key={country} label={country}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " (hidden)"}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <SubmitButton pendingText="Adding…">Add to featured</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
