import type { Metadata } from "next";
import Link from "next/link";
import { ChannelForm } from "@/components/admin/ChannelForm";
import { requireAdmin } from "@/lib/auth/dal";
import { adminCountries, adminGenres } from "@/lib/data/admin";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "New channel" };

export default async function NewChannelPage() {
  await requireAdmin();
  const [countries, genres] = await Promise.all([adminCountries(), adminGenres()]);
  return (
    <>
      <div className={a.pageHead}>
        <Link href="/sandberg" className={a.muted}>← Channels</Link>
      </div>
      <div className={a.pageHead}>
        <h1 className={a.h1}>New channel</h1>
      </div>
      <ChannelForm
        initial={{ hue: "210", sortOrder: "100", isActive: "on" }}
        countries={countries.map((c) => ({ code: c.code, name: c.name }))}
        genres={genres}
      />
    </>
  );
}
