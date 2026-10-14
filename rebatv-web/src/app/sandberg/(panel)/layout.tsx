import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import a from "@/components/admin/admin.module.css";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={a.shell}>
      <Suspense fallback={<div className={a.bar} style={{ height: "4.2rem" }} />}>
        <AdminBar />
      </Suspense>
      <main id="main" className={a.main}>
        <Suspense fallback={<p className={a.muted}>Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
