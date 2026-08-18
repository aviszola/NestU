"use client";

import { useEffect, useState } from "react";

// ─── Count-up: 0 → value, ~900ms ease-out, rAF (tanpa lib) ───────────────
function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value <= 0) {
      setDisplay(0);
      return;
    }
    const duration = 900; // ~900ms duration
    const steps = 30; // 30 steps
    const stepTime = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const t = currentStep / steps;
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(Math.round(value * eased));

      if (currentStep >= steps) {
        clearInterval(interval);
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [value]);

  return <p className={className}>{display}</p>;
}

// ─── Mini stats kiri: data nyata dari props server ───────────────────────
export function MiniStats({
  totalVerifiedKos,
  totalBooking,
}: {
  totalVerifiedKos: number;
  totalBooking: number;
}) {
  return (
    <div className="flex flex-wrap gap-6 mt-2">
      <div>
        <CountUp
          value={totalVerifiedKos}
          className="text-2xl font-extrabold tracking-tight text-white"
        />
        <p className="text-xs text-white/60">Kos terverifikasi</p>
      </div>
      <div>
        <CountUp
          value={totalBooking}
          className="text-2xl font-extrabold tracking-tight text-secondary-fixed"
        />
        <p className="text-xs text-white/60">Booking aktif</p>
      </div>
    </div>
  );
}

// ─── Chart panel: tooltip data point + hover bar + hero overlay count-up ──
const CHART_POINTS = [38, 52, 46, 68, 60, 84, 74, 96, 88, 108, 118, 132];

export function ChartPanel({ totalBooking }: { totalBooking: number }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (hoverIdx !== null) {
      setActiveIdx(hoverIdx);
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [hoverIdx]);

  const x = (i: number) => (i * 200) / (CHART_POINTS.length - 1);
  const y = (v: number) => 100 - v;
  const linePath = CHART_POINTS.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const areaPath = `${linePath} L200,100 L0,100 Z`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-6 md:p-8">
      {/* Label jujur: visual dekoratif, bukan data asli */}
      <div className="absolute left-6 md:left-8 top-6 md:top-8 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg text-secondary-fixed">insights</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Tren pencarian kos
        </span>
      </div>

      {/* Chart SVG — dekoratif jujur */}
      <svg
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        className="absolute inset-x-4 bottom-8 h-[calc(100%-5rem)] w-[calc(100%-2rem)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00236f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#00236f" stopOpacity="0" />
          </linearGradient>
        </defs>
        {CHART_POINTS.map((v, i) => (
          <line
            key={i}
            x1={x(i)}
            y1={hoveredBar === i ? y(v) - 3 : y(v)}
            x2={x(i)}
            y2={96}
            stroke="#006c49"
            style={{
              strokeOpacity: hoveredBar === i ? 0.95 : 0.4,
              strokeWidth: hoveredBar === i ? 6 : 3,
              transition: "all 0.2s ease-out",
            }}
            strokeLinecap="round"
            className="cursor-pointer"
            onMouseEnter={() => setHoveredBar(i)}
            onMouseLeave={() => setHoveredBar(null)}
          />
        ))}
        <path d={linePath} fill="none" stroke="#00236f" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={areaPath} fill="url(#chartFill)" />

        {/* Visible data points on the blue line */}
        {CHART_POINTS.map((v, i) => (
          <circle
            key={`dot-${i}`}
            cx={x(i)}
            cy={y(v)}
            r={hoverIdx === i ? 4.5 : 2.5}
            fill="#ffffff"
            stroke="#00236f"
            strokeWidth={hoverIdx === i ? 2.5 : 1.5}
            style={{
              transition: "all 0.2s ease-out",
            }}
            className="pointer-events-none"
          />
        ))}

        {/* Hit target data points — tooltip (fill transparan butuh pointer-events=all) */}
        {CHART_POINTS.map((v, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(v)}
            r={8}
            fill="transparent"
            pointerEvents="all"
            className="cursor-pointer"
            onMouseEnter={() => setHoverIdx(i)}
            onMouseLeave={() => setHoverIdx(null)}
          />
        ))}
      </svg>

      {/* Tooltip data point — wrapper dengan inset identik SVG agar % presisi */}
      {activeIdx !== null && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 bottom-8 h-[calc(100%-5rem)] w-[calc(100%-2rem)]">
          <div
            className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-on-surface shadow-lg ring-1 ring-outline-variant transition-all duration-200 ease-out"
            style={{
              left: `${(x(activeIdx) / 200) * 100}%`,
              bottom: `${Math.min(CHART_POINTS[activeIdx], 84)}%`,
              opacity: isVisible ? 1 : 0,
              transform: `translate(-50%, ${isVisible ? "-125%" : "-105%"}) scale(${isVisible ? 1 : 0.95})`,
            }}
          >
            Minggu {activeIdx + 1}
          </div>
        </div>
      )}

      {/* Hero angka overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
        <CountUp
          value={totalBooking}
          className="text-6xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-sm"
        />
        <p className="mt-1 text-sm font-semibold text-white/70">
          Booking aktif kamu
        </p>
      </div>
    </div>
  );
}
