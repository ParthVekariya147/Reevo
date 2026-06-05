"use client";

import { useState } from "react";
import {
  SiGoogle,
  SiTripadvisor,
  SiFacebook,
  SiYelp,
  SiTrustpilot,
  SiBookingdotcom,
  SiZomato,
} from "react-icons/si";
import type { IconType } from "react-icons";

const PLATFORMS = [
  { name: "Google Reviews",       icon: "google",       regions: ["US","EU","UK","AU","AE","RU"], color: "#4285F4" },
  { name: "TripAdvisor",          icon: "tripadvisor",  regions: ["US","EU","UK","AU","AE"],      color: "#00AF87" },
  { name: "Facebook Reviews",     icon: "facebook",     regions: ["US","EU","UK","AU","AE"],      color: "#1877F2" },
  { name: "Yelp",                 icon: "yelp",         regions: ["US","AU"],                     color: "#FF1A1A" },
  { name: "Trustpilot",           icon: "trustpilot",   regions: ["EU","UK"],                     color: "#00B67A" },
  { name: "Booking.com",          icon: "bookingdotcom",regions: ["EU","UK","AE"],                color: "#003580" },
  { name: "Zomato",               icon: "zomato",       regions: ["AE","AU"],                     color: "#E23744" },
  { name: "Talabat",              icon: null,           regions: ["AE"],                          color: "#FF6600" },
  { name: "Checkatrade",          icon: null,           regions: ["UK"],                          color: "#005DAA" },
  { name: "ProductReview.com.au", icon: null,           regions: ["AU"],                          color: "#E87722" },
  { name: "True Local",           icon: null,           regions: ["AU"],                          color: "#007FC8" },
  { name: "Yandex Maps",          icon: null,           regions: ["RU"],                          color: "#FC3F1D" },
  { name: "2GIS",                 icon: null,           regions: ["RU"],                          color: "#31A44A" },
  { name: "Flamp",                icon: null,           regions: ["RU"],                          color: "#FF6600" },
] as const;

const REGION_TABS = ["All", "US", "EU", "UK", "AU", "UAE", "RU"] as const;
const REGION_KEY: Record<string, string> = { UAE: "AE" };

const ICON_MAP: Record<string, IconType> = {
  google:       SiGoogle,
  tripadvisor:  SiTripadvisor,
  facebook:     SiFacebook,
  yelp:         SiYelp,
  trustpilot:   SiTrustpilot,
  bookingdotcom:SiBookingdotcom,
  zomato:       SiZomato,
};

const TOTAL = PLATFORMS.length;

function PlatformCard({ name, icon, color, hovered, onHover, onLeave }: {
  name: string;
  icon: string | null;
  color: string;
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const IconComponent = icon ? ICON_MAP[icon] : null;
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "22px 12px",
        border: "1px solid",
        borderColor: hovered ? color : "var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--surface)",
        cursor: "default",
        transition: "border-color .2s, box-shadow .2s",
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-xs)",
      }}
    >
      <div style={{
        width: 44,
        height: 44,
        display: "grid",
        placeItems: "center",
        borderRadius: 10,
        background: hovered
          ? `color-mix(in oklab, ${color} 12%, transparent)`
          : "var(--surface-2)",
        transition: "background .2s",
      }}>
        {IconComponent ? (
          <IconComponent size={22} color={hovered ? color : "var(--muted-2)"} />
        ) : (
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.03em",
            color: hovered ? color : "var(--muted-2)",
            textAlign: "center",
            lineHeight: 1.2,
            fontFamily: "var(--font-mono)",
          }}>
            {name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 500,
        color: hovered ? "var(--ink)" : "var(--ink-2)",
        textAlign: "center",
        lineHeight: 1.3,
        transition: "color .2s",
        maxWidth: 110,
      }}>
        {name}
      </span>
    </div>
  );
}

export default function SupportedPlatforms() {
  const [activeRegion, setActiveRegion] = useState<string>("All");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const filtered = PLATFORMS.filter(p => {
    if (activeRegion === "All") return true;
    const key = REGION_KEY[activeRegion] ?? activeRegion;
    return (p.regions as readonly string[]).includes(key);
  });

  return (
    <section className="section tight" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
          <span className="eyebrow"><span className="dot" /> Platforms</span>
          <h2 className="h2" style={{ marginTop: 18 }}>
            One QR. {TOTAL} review platforms.
          </h2>
          <p className="lead" style={{ margin: "16px auto 0" }}>
            Wherever your customers leave reviews, Reevo routes them there.
          </p>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }} className="plat-tabs-wrap">
          <div className="tabs">
            {REGION_TABS.map(r => (
              <button key={r} className={activeRegion === r ? "on" : ""} onClick={() => setActiveRegion(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, maxWidth: 860, margin: "0 auto" }}
          className="platforms-grid"
        >
          {filtered.map((p, i) => (
            <PlatformCard
              key={p.name}
              name={p.name}
              icon={p.icon ?? null}
              color={p.color}
              hovered={hoveredIdx === i}
              onHover={() => setHoveredIdx(i)}
              onLeave={() => setHoveredIdx(null)}
            />
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) { .platforms-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 520px) { .plat-tabs-wrap { overflow-x: auto; justify-content: flex-start !important; padding: 0 20px; } }
      `}</style>
    </section>
  );
}
