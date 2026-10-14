import Link from "next/link";
import { logout } from "@/app/sandberg/actions";
import { requireAdmin } from "@/lib/auth/dal";
import { AdminNav } from "./AdminNav";
import a from "./admin.module.css";

export async function AdminBar() {
  const admin = await requireAdmin();
  return (
    <header className={a.bar}>
      <Link href="/sandberg" className={a.brand}>
        reba<span>TV</span>
        <span className={a.brandTag}>Admin</span>
      </Link>
      <AdminNav />
      <div className={a.who}>
        <span>{admin.email}</span>
        <Link href="/" className={`${a.btnGhost} ${a.btnSmall}`} target="_blank" rel="noopener">
          View site
        </Link>
        <form action={logout}>
          <button type="submit" className={`${a.btnGhost} ${a.btnSmall}`}>
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
