import Image from "next/image";
import { isOptimizableLogo } from "@/lib/logo";
import s from "./tv.module.css";

type Props = {
  src: string;
  /** Rendered width of the logo tile, for responsive image selection. */
  sizes: string;
  eager?: boolean;
  className?: string;
};

/**
 * A channel logo on a white tile (most broadcaster logos are drawn for light backgrounds).
 * Decorative: the channel name is always next to it in text.
 */
export function ChannelLogo({ src, sizes, eager = false, className = s.logoTile }: Props) {
  return (
    <span className={className}>
      <span className={s.logoBox}>
        {isOptimizableLogo(src) ? (
          <Image src={src} alt="" fill sizes={sizes} loading={eager ? "eager" : "lazy"} className={s.logoImg} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            referrerPolicy="no-referrer"
            className={s.logoImg}
          />
        )}
      </span>
    </span>
  );
}
