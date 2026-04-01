import Image from "next/image";

type BrandLogoProps = {
  size?: "hero" | "compact";
  priority?: boolean;
};

export function BrandLogo({ size = "hero", priority = false }: BrandLogoProps) {
  const width = size === "compact" ? 88 : 110;
  const height = size === "compact" ? 60 : 60;

  return (
    <div className={`brand-logo-shell ${size === "compact" ? "compact" : ""}`}>
      <div className="brand-logo-card">
        <Image
          src="/logo-hk-lopes-store.png"
          alt="HK Lopes Store"
          width={width}
          height={height}
          priority={priority}
          className="brand-logo-image"
        />
      </div>
    </div>
  );
}
