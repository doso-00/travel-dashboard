export function DealBadge({ pct }: { pct: number | null }) {
  if (pct == null) return null;
  if (pct >= 20) return <span className="badge deal hot">🔥 -{pct}% vs media</span>;
  if (pct >= 5) return <span className="badge deal">-{pct}% vs media</span>;
  if (pct <= -5) return <span className="badge pricey">+{-pct}% vs media</span>;
  return <span className="badge ghost">in media</span>;
}
