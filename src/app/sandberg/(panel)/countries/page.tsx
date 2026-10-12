import type { Metadata } from "next";
import { deleteCountry } from "@/app/sandberg/actions";
import { CountryForm } from "@/components/admin/CountryForm";
import { ConfirmButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/dal";
import { adminChannels, adminCountries } from "@/lib/data/admin";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Countries" };

export default async function CountriesPage({ searchParams }: PageProps<"/sandberg/countries">) {
  await requireAdmin();
  const sp = await searchParams;
  const [countries, channels] = await Promise.all([adminCountries(), adminChannels()]);

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.h1}>Countries</h1>
        <span className={a.sub}>Markets get a home page (/rw, /ke…) with local channels numbered from 1.</span>
      </div>
      {typeof sp.error === "string" && <p className={a.alert} role="alert" style={{ marginBottom: "1rem" }}>{sp.error}</p>}
      <div className={a.stack}>
        {countries.map((c) => {
          const own = channels.filter((ch) => ch.countryCode === c.code);
          return (
            <section key={c.code} className={a.card} aria-labelledby={`country-${c.code}`}>
              <div className={a.pageHead} style={{ marginBottom: "1rem" }}>
                <h2 id={`country-${c.code}`} className={a.label} style={{ fontSize: "1.1rem" }}>
                  {c.name} <span className={a.muted}>· {c.code}</span>
                </h2>
                {c.isMarket ? <span className={a.pillOn}>Market</span> : <span className={a.pill}>International</span>}
                <span className={a.muted}>{own.length} channels</span>
                {own.length === 0 && (
                  <form action={deleteCountry} className={a.push}>
                    <input type="hidden" name="code" value={c.code} />
                    <ConfirmButton message={`Delete ${c.name}?`} className={`${a.btnDanger} ${a.btnSmall}`}>Delete</ConfirmButton>
                  </form>
                )}
              </div>
              <CountryForm
                mode="update"
                initial={{
                  code: c.code,
                  name: c.name,
                  sortOrder: String(c.sortOrder),
                  heroChannelId: c.heroChannelId ?? "",
                  heroBlurb: c.heroBlurb ?? "",
                  isMarket: c.isMarket ? "on" : "",
                }}
                channels={own.map((ch) => ({ id: ch.id, name: ch.name }))}
              />
            </section>
          );
        })}
        <section className={a.card} aria-labelledby="country-new">
          <h2 id="country-new" className={a.label} style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Add a country</h2>
          <CountryForm key={countries.length} mode="create" initial={{ sortOrder: "50" }} />
        </section>
      </div>
    </>
  );
}
