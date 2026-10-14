import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · rebaTV admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function SandbergLayout({ children }: LayoutProps<"/sandberg">) {
  return children;
}
