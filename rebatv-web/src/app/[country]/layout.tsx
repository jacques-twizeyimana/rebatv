import { Suspense } from "react";
import { SpatialNav } from "@/components/tv/SpatialNav";
import { marketParams } from "@/lib/data/market";
import s from "@/components/tv/tv.module.css";

export const generateStaticParams = marketParams;

export default function CountryLayout({ children }: LayoutProps<"/[country]">) {
  return (
    <div className={s.tv}>
      {children}
      <Suspense fallback={null}>
        <SpatialNav />
      </Suspense>
    </div>
  );
}
