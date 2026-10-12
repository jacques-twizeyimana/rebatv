import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdmin } from "@/lib/auth/dal";
import a from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Sign in" };

async function AlreadySignedIn() {
  if (await getAdmin()) redirect("/sandberg");
  return null;
}

export default function LoginPage() {
  return (
    <div className={a.shell}>
      <main id="main" className={a.loginWrap}>
        <div className={a.loginCard}>
          <div className={a.stack}>
            <div>
              <p className={a.brand}>
                reba<span>TV</span>
                <span className={a.brandTag}>Admin</span>
              </p>
              <h1 className={a.h1} style={{ marginTop: "0.75rem" }}>
                Sign in
              </h1>
            </div>
            <Suspense fallback={null}>
              <AlreadySignedIn />
            </Suspense>
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
}
