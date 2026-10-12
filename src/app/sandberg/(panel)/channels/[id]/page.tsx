import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteChannel } from "@/app/sandberg/actions";
import { ChannelForm } from "@/components/admin/ChannelForm";
import { ConfirmButton } from "@/components/admin/SubmitButton";
import { requireAdmin } from "@/lib/auth/dal";
import { adminChannel, adminCountries, adminGenres } from "@/lib/data/admin";
import { isUlid } from "@/lib/ulid";
import { watchPath } from "@/lib/site";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Edit channel" };

export default async function EditChannelPage({ params }: PageProps<"/sandberg/channels/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!isUlid(id)) notFound();
  const [channel, countries, genres] = await Promise.all([adminChannel(id), adminCountries(), adminGenres()]);
  if (!channel) notFound();

  const initial: Record<string, string> = {
    id: channel.id,
    name: channel.name,
    slug: channel.slug,
    shortName: channel.shortName,
    genre: channel.genre,
    hue: String(channel.hue),
    countryCode: channel.countryCode,
    streamUrl: channel.streamUrl ?? "",
    logoUrl: channel.logoUrl ?? "",
    description: channel.description ?? "",
    sortOrder: String(channel.sortOrder),
    isActive: channel.isActive ? "on" : "",
  };
  const market = countries.find((c) => c.code === channel.countryCode && c.isMarket)?.code ?? countries.find((c) => c.isMarket)?.code ?? "rw";

  return (
    <>
      <div className={a.pageHead}>
        <Link href="/sandberg" className={a.muted}>← Channels</Link>
      </div>
      <div className={a.pageHead}>
        <h1 className={a.h1}>{channel.name}</h1>
        <span className={a.sub}>ID {channel.id}</span>
        {channel.isActive && (
          <Link href={watchPath(market.toLowerCase(), channel.slug)} className={`${a.btnGhost} ${a.push}`} target="_blank" rel="noopener">
            Open on site ↗
          </Link>
        )}
      </div>
      <ChannelForm initial={initial} countries={countries.map((c) => ({ code: c.code, name: c.name }))} genres={genres} />
      <div className={a.card} style={{ marginTop: "2rem" }}>
        <div className={a.pageHead} style={{ marginBottom: 0 }}>
          <div>
            <h2 className={a.label} style={{ fontSize: "1rem" }}>Delete channel</h2>
            <p className={a.muted}>Removes it from the site, featured list and any country hero. This can’t be undone.</p>
          </div>
          <form action={deleteChannel} className={a.push}>
            <input type="hidden" name="id" value={channel.id} />
            <ConfirmButton message={`Delete ${channel.name}? This can’t be undone.`}>Delete</ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
