"use client";

import { useEffect, useRef } from "react";

export interface HexScore {
  label: string;
  icon: string;
  score: number; // 0–10
  color: string;
  detail: string;
}

interface Props {
  scores: HexScore[];
}

export default function HexagonChart({ scores }: Props) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 100;
  const levels = 4;

  function point(angle: number, r: number) {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  const n = scores.length;
  const angleStep = 360 / n;

  // Background grid polygons
  const gridPolygons = Array.from({ length: levels }, (_, i) => {
    const r = (maxR / levels) * (i + 1);
    return scores.map((_, idx) => {
      const p = point(idx * angleStep, r);
      return `${p.x},${p.y}`;
    }).join(" ");
  });

  // Score polygon
  const scorePoints = scores.map((s, idx) => {
    const r = (s.score / 10) * maxR;
    const p = point(idx * angleStep, r);
    return `${p.x},${p.y}`;
  }).join(" ");

  // Axis lines
  const axes = scores.map((_, idx) => {
    const p = point(idx * angleStep, maxR);
    return { x1: cx, y1: cy, x2: p.x, y2: p.y };
  });

  // Labels
  const labelOffset = maxR + 28;
  const labels = scores.map((s, idx) => {
    const p = point(idx * angleStep, labelOffset);
    return { ...p, label: s.label, icon: s.icon, score: s.score };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid polygons */}
        {gridPolygons.map((pts, i) => (
          <polygon key={i} points={pts}
            fill="none" stroke="#e5e7eb" strokeWidth="1" />
        ))}

        {/* Axes */}
        {axes.map((a, i) => (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke="#e5e7eb" strokeWidth="1" />
        ))}

        {/* Score fill */}
        <polygon points={scorePoints}
          fill="rgba(0, 122, 110, 0.2)"
          stroke="#007a6e"
          strokeWidth="2"
          strokeLinejoin="round" />

        {/* Score dots */}
        {scores.map((s, idx) => {
          const r = (s.score / 10) * maxR;
          const p = point(idx * angleStep, r);
          return <circle key={idx} cx={p.x} cy={p.y} r={4}
            fill="#007a6e" stroke="white" strokeWidth="2" />;
        })}

        {/* Labels */}
        {labels.map((l, i) => (
          <g key={i}>
            <text x={l.x} y={l.y - 6} textAnchor="middle"
              fontSize="14" dominantBaseline="middle">{l.icon}</text>
            <text x={l.x} y={l.y + 10} textAnchor="middle"
              fontSize="9" fill="#6b7280" fontWeight="600"
              dominantBaseline="middle">{l.label}</text>
            <text x={l.x} y={l.y + 22} textAnchor="middle"
              fontSize="10" fill="#007a6e" fontWeight="700"
              dominantBaseline="middle">{l.score}/10</text>
          </g>
        ))}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill="#d1d5db" />
      </svg>
    </div>
  );
}
