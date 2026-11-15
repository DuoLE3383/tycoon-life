'use client';

import { fmt } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= v11.47 — SVG CHARTS =================
// Real visual charts: donut chart for asset allocation, bar chart for income.
// These are inline SVG — no external deps, render crisply at any size.

export function DonutChart({ segs, size = 120 }: { segs: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segs.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return null;
  const r = size / 2 - 9;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  // Compute segments with their dash offsets using reduce (no reassignment).
  const visible = segs.filter(s => s.value > 0);
  const computed = visible.reduce<{ label: string; value: number; color: string; dash: number; offset: number }[]>((arr, s) => {
    const dash = (s.value / total) * circumference;
    const offset = arr.length > 0 ? arr[arr.length - 1].offset + arr[arr.length - 1].dash : 0;
    return [...arr, { ...s, dash, offset }];
  }, []);
  // v11.55 — bigger center text + thicker ring for readability.
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }}>
      {computed.map(s => (
        <circle key={s.label} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={12}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={-s.offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray .3s ease' }}
        />
      ))}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--ink)">{visible.length}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--mute)">assets</text>
    </svg>
  );
}



export function BarChart({ rows, maxVal }: { rows: { label: string; value: number; color: string }[]; maxVal: number }) {
  const max = Math.max(maxVal, 1);
  // v11.55 — bigger bars + labels for readability (was barH=14, font=8).
  const barH = 16, gap = 10, labelW = 78;
  const totalH = rows.length * (barH + gap) + 4;
  return (
    <svg width="100%" height={totalH} viewBox={`0 0 220 ${totalH}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
      {rows.map((r, i) => {
        const y = i * (barH + gap);
        const w = Math.max(2, (r.value / max) * (220 - labelW - 44));
        return (
          <g key={r.label}>
            <text x={0} y={y + barH - 4} fontSize="9" fontWeight="600" fill="var(--mute)" style={{ textTransform: 'uppercase' }}>{r.label.length > 14 ? r.label.slice(0, 14) + '…' : r.label}</text>
            <rect x={labelW} y={y} width={w} height={barH - 2} rx={3} fill={r.color} style={{ transition: 'width .3s ease' }} />
            <text x={labelW + w + 4} y={y + barH - 4} fontSize="9" fontWeight="700" fill="var(--up)">+{fmt(r.value)}</text>
          </g>
        );
      })}
    </svg>
  );
}
