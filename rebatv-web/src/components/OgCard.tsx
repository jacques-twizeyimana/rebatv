// Shared markup for Open Graph images (rendered by next/og, so inline styles only).
export function OgCard({ title, kicker, mark, hue }: { title: string; kicker: string; mark: string; hue: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "#F3F1EA",
        backgroundColor: "#0E0F0D",
        backgroundImage: `radial-gradient(circle at 80% 20%, hsl(${hue}, 72%, 46%) 0%, transparent 55%), linear-gradient(160deg, hsl(${hue}, 42%, 20%), hsl(${(hue + 20) % 360}, 38%, 8%))`,
      }}
    >
      <div style={{ display: "flex", fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>
        <span>reba</span>
        <span style={{ color: "#FAD201" }}>TV</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, color: "#D9D7CE" }}>
          <span style={{ background: "#D42A25", color: "#fff", padding: "6px 16px", borderRadius: 8, fontWeight: 700, letterSpacing: 3 }}>
            LIVE
          </span>
          <span>{kicker}</span>
        </div>
        <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -4, lineHeight: 1, marginTop: 24 }}>{title}</div>
      </div>
      <div style={{ position: "absolute", right: 72, bottom: 40, fontSize: 200, fontWeight: 800, color: "rgba(255,255,255,0.1)" }}>
        {mark}
      </div>
    </div>
  );
}
