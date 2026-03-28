import { useState, useEffect, useRef } from "react";

const COLORS = {
  sa: "#f59e0b",
  av: "#f97316",
  his: "#ef4444",
  lbb: "#8b5cf6",
  rbb: "#3b82f6",
  segment: "#10b981",
  lead: "#06b6d4",
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  accent: "#38bdf8",
};

function useAnimatedValue(cycleMs = 800) {
  const [t, setT] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    let id: number;
    const tick = () => {
      const elapsed = (Date.now() - startRef.current) % cycleMs;
      setT(elapsed);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [cycleMs]);
  return t;
}

function bell(t: number, t0: number, tau: number) {
  const x = (t - t0) / tau;
  if (Math.abs(x) > 6) return 0;
  const s = 1 / (1 + Math.exp(-x));
  return 4 * s * (1 - s);
}

// Per-lead morphology parameters for normal sinus rhythm at 51° axis
// Each field: amplitude multiplier (negative = inverted component)
const LEAD_CONFIG: Record<string, {
  P: number; Q: number; R: number; S: number; T: number;
  color: string; group: string;
}> = {
  "I":   { P: 0.14, Q: -0.04, R:  0.93, S: -0.06, T:  0.24, color: "#38bdf8", group: "limb" },
  "II":  { P: 0.18, Q: -0.05, R:  1.00, S: -0.05, T:  0.27, color: "#38bdf8", group: "limb" },
  "III": { P: 0.10, Q: -0.02, R:  0.43, S: -0.02, T:  0.14, color: "#38bdf8", group: "limb" },
  "aVR": { P:-0.14, Q:  0.00, R: -1.09, S:  0.00, T: -0.27, color: "#a78bfa", group: "aug"  },
  "aVL": { P: 0.06, Q: -0.07, R:  0.54, S: -0.04, T:  0.12, color: "#a78bfa", group: "aug"  },
  "aVF": { P: 0.14, Q: -0.03, R:  0.79, S: -0.03, T:  0.19, color: "#a78bfa", group: "aug"  },
  "V1":  { P: 0.06, Q:  0.00, R:  0.15, S: -0.39, T: -0.05, color: "#fb923c", group: "chest" },
  "V2":  { P: 0.08, Q:  0.00, R:  0.30, S: -0.39, T:  0.08, color: "#fb923c", group: "chest" },
  "V3":  { P: 0.10, Q: -0.02, R:  0.65, S: -0.33, T:  0.18, color: "#fb923c", group: "chest" },
  "V4":  { P: 0.12, Q: -0.03, R:  1.00, S: -0.26, T:  0.25, color: "#fb923c", group: "chest" },
  "V5":  { P: 0.13, Q: -0.04, R:  1.15, S: -0.20, T:  0.27, color: "#fb923c", group: "chest" },
  "V6":  { P: 0.13, Q: -0.04, R:  1.08, S: -0.15, T:  0.25, color: "#fb923c", group: "chest" },
};

// Generate the ECG voltage at time ms for a given lead
function ecgVoltage(ms: number, cfg: typeof LEAD_CONFIG[string]) {
  // Repeat for 2.5 seconds (show ~3 beats at 75 bpm)
  const cycleMs = 800;
  const cycleT = ((ms % cycleMs) + cycleMs) % cycleMs;
  const p     = cfg.P * bell(cycleT, 40,  6);
  const q     = cfg.Q * bell(cycleT, 165, 4);
  const r     = cfg.R * bell(cycleT, 176, 5);
  const s     = cfg.S * bell(cycleT, 190, 5);
  const twave = cfg.T * bell(cycleT, 420, 30);
  return p + q + r + s + twave;
}

// A single lead waveform strip with ECG grid
function LeadStrip({
  name, t, W = 340, H = 64, showLabel = true,
}: {
  name: string; t: number; W?: number; H?: number; showLabel?: boolean;
}) {
  const cfg = LEAD_CONFIG[name];
  const SHOW_MS = 2400; // show 2.4 seconds = 3 cycles at 75bpm
  const PX_PER_MS = W / SHOW_MS;
  const MV_PER_PX = (H * 0.35); // 1mV fits in 35% of height
  const baseline = H / 2;

  // Build waveform path for 3 cycles
  const pts: string[] = [];
  for (let i = 0; i <= W; i++) {
    const ms = (i / W) * SHOW_MS;
    const v = ecgVoltage(ms, cfg);
    const y = baseline - v * MV_PER_PX;
    pts.push(`${i === 0 ? "M" : "L"}${i.toFixed(1)},${y.toFixed(1)}`);
  }
  const path = pts.join(" ");

  // Cursor position: t maps to position within the 3-cycle window
  const cursorX = ((t / 800) % 1) * (W / 3);
  const curV = ecgVoltage((t / 800) * 800, cfg);
  const curY = baseline - curV * MV_PER_PX;

  // Grid: large squares every 200ms, small every 40ms
  const largeMsInterval = 200;
  const smallMsInterval = 40;
  const largeGridPx = largeMsInterval * PX_PER_MS;
  const smallGridPx = smallMsInterval * PX_PER_MS;
  const mVperLarge = 0.5;
  const largeGridV = mVperLarge * MV_PER_PX;
  const smallGridV = (mVperLarge / 5) * MV_PER_PX;

  const vertLargeLines: number[] = [];
  const vertSmallLines: number[] = [];
  for (let x = 0; x <= W; x += smallGridPx) {
    if (Math.abs(Math.round(x / largeGridPx) * largeGridPx - x) < 0.5) {
      vertLargeLines.push(x);
    } else {
      vertSmallLines.push(x);
    }
  }
  const horiLargeLines: number[] = [];
  const horiSmallLines: number[] = [];
  for (let y = 0; y <= H; y += smallGridV) {
    if (Math.abs(Math.round(y / largeGridV) * largeGridV - y) < 0.5) {
      horiLargeLines.push(y);
    } else {
      horiSmallLines.push(y);
    }
  }

  return (
    <div className="relative">
      {showLabel && (
        <div
          className="absolute top-1 left-1 z-10 font-bold"
          style={{ fontSize: 9, color: cfg.color, textShadow: "0 0 4px #000" }}
        >
          {name}
        </div>
      )}
      <svg width={W} height={H} style={{ display: "block" }}>
        {/* Background */}
        <rect x={0} y={0} width={W} height={H} fill="#080f1a" />

        {/* Small grid */}
        {vertSmallLines.map((x) => (
          <line key={`vs${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#0e2a1a" strokeWidth={0.4} />
        ))}
        {horiSmallLines.map((y) => (
          <line key={`hs${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#0e2a1a" strokeWidth={0.4} />
        ))}

        {/* Large grid */}
        {vertLargeLines.map((x) => (
          <line key={`vl${x}`} x1={x} y1={0} x2={x} y2={H} stroke="#163a20" strokeWidth={0.8} />
        ))}
        {horiLargeLines.map((y) => (
          <line key={`hl${y}`} x1={0} y1={y} x2={W} y2={y} stroke="#163a20" strokeWidth={0.8} />
        ))}

        {/* Baseline */}
        <line x1={0} y1={baseline} x2={W} y2={baseline} stroke="#1a4030" strokeWidth={0.5} />

        {/* Waveform */}
        <path d={path} fill="none" stroke={cfg.color} strokeWidth={1.4} />

        {/* Moving cursor glow area */}
        <rect
          x={cursorX - 1}
          y={0}
          width={3}
          height={H}
          fill={cfg.color}
          fillOpacity={0.06}
        />
        <line
          x1={cursorX}
          y1={0}
          x2={cursorX}
          y2={H}
          stroke="#f59e0b"
          strokeWidth={0.8}
          strokeOpacity={0.7}
        />
        {/* Cursor dot */}
        <circle
          cx={cursorX}
          cy={Math.max(2, Math.min(H - 2, curY))}
          r={2}
          fill="#f59e0b"
          style={{ filter: "drop-shadow(0 0 3px #f59e0b)" }}
        />
      </svg>
    </div>
  );
}

// The standard 12-lead display in clinical 4-column format
function TwelveLeadDisplay({ t }: { t: number }) {
  // Standard clinical layout: 4 columns of 3 rows
  // Col: I, II, III | aVR, aVL, aVF | V1, V2, V3 | V4, V5, V6
  const COLS = [
    ["I", "II", "III"],
    ["aVR", "aVL", "aVF"],
    ["V1", "V2", "V3"],
    ["V4", "V5", "V6"],
  ];
  const W = 290;
  const H = 60;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#080f1a", border: "1px solid #163a20" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: "#0d1f10", borderBottom: "1px solid #163a20" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-bold text-emerald-400">12-Lead EKG Strip</span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
          <span>25 mm/s</span>
          <span>10 mm/mV</span>
          <span>75 bpm</span>
          <span className="text-yellow-400">⏱ {t.toFixed(0)} ms</span>
        </div>
      </div>

      {/* 1mV calibration pulse + lead label legend */}
      <div className="flex items-center gap-3 px-3 pt-1" style={{ fontSize: 8, color: "#475569" }}>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#38bdf8" }} />
          <span>Limb (I, II, III)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#a78bfa" }} />
          <span>Augmented (aVR, aVL, aVF)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: "#fb923c" }} />
          <span>Precordial (V1–V6)</span>
        </div>
      </div>

      {/* The 4-column, 3-row lead grid */}
      <div className="grid grid-cols-4 divide-x" style={{ borderColor: "#163a20" }}>
        {COLS.map((col, ci) => (
          <div key={ci} className="flex flex-col divide-y" style={{ borderColor: "#163a20" }}>
            {col.map((lead) => (
              <div key={lead} className="relative" style={{ borderColor: "#163a20" }}>
                <LeadStrip name={lead} t={t} W={W} H={H} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Rhythm strip: Lead II full width */}
      <div style={{ borderTop: "1px solid #163a20" }}>
        <div className="px-2 pt-1" style={{ fontSize: 8, color: "#34d399" }}>
          II — Rhythm Strip
        </div>
        <LeadStrip name="II" t={t} W={1160} H={52} showLabel={false} />
      </div>

      {/* Measurements footer */}
      <div
        className="flex items-center gap-6 px-3 py-1.5 flex-wrap"
        style={{ background: "#0d1f10", borderTop: "1px solid #163a20" }}
      >
        {[
          { label: "Rate", value: "75 bpm", ok: true },
          { label: "PR", value: "165 ms", ok: true },
          { label: "QRS", value: "90 ms", ok: true },
          { label: "QT/QTc", value: "455/416 ms", ok: true },
          { label: "P Axis", value: "45°", ok: true },
          { label: "QRS Axis", value: "51°", ok: true },
          { label: "T Axis", value: "40°", ok: true },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-1.5">
            <span style={{ fontSize: 8, color: "#475569" }}>{m.label}:</span>
            <span style={{ fontSize: 9, fontWeight: "bold", color: m.ok ? "#34d399" : "#f87171" }}>
              {m.value}
            </span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="rounded px-2 py-0.5"
            style={{ background: "#10b98122", border: "1px solid #10b98166", fontSize: 8, color: "#34d399" }}
          >
            ✓ Normal Sinus Rhythm
          </div>
        </div>
      </div>
    </div>
  );
}

function BellWaveform({ t }: { t: number }) {
  const W = 200;
  const H = 60;
  const depolPts: [number, number][] = [];
  const repolPts: [number, number][] = [];
  for (let i = 0; i <= W; i++) {
    const ms = (i / W) * 400;
    const d = bell(ms, 80, 4);
    const r = bell(ms, 80 + 280, 30) * 0.3;
    depolPts.push([i, H / 2 - d * (H / 2.2)]);
    repolPts.push([i, H / 2 - r * (H / 2.2)]);
  }
  const dd = depolPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const rd = repolPts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const curX = (t / 800) * W * 2;
  const clampedX = Math.min(curX, W);
  return (
    <svg width={W} height={H} className="overflow-visible">
      <rect x={0} y={0} width={W} height={H} fill="#0f172a" rx={4} />
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#1e3a4a" strokeWidth={0.5} />
      <path d={dd} fill="none" stroke="#8b5cf6" strokeWidth={1.5} />
      <path d={rd} fill="none" stroke="#10b981" strokeWidth={1.5} strokeDasharray="3,2" />
      {clampedX <= W && (
        <line x1={clampedX} y1={0} x2={clampedX} y2={H} stroke="#f59e0b" strokeWidth={0.5} strokeOpacity={0.6} />
      )}
      <text x={6} y={12} fontSize={7} fill="#8b5cf6">depol</text>
      <text x={6} y={22} fontSize={7} fill="#10b981">repol (×0.3)</text>
    </svg>
  );
}

function ConductionFlow({ t }: { t: number }) {
  const nodes = [
    { id: "sa",  label: "SA Node",    x: 50, y: 20,  color: COLORS.sa,      delay: 0   },
    { id: "av",  label: "AV Node",    x: 50, y: 80,  color: COLORS.av,      delay: 130 },
    { id: "his", label: "His Bundle", x: 50, y: 140, color: COLORS.his,     delay: 140 },
    { id: "lbb", label: "LBB",        x: 10, y: 200, color: COLORS.lbb,     delay: 150 },
    { id: "rbb", label: "RBB",        x: 90, y: 200, color: COLORS.rbb,     delay: 145 },
    { id: "lv",  label: "LV",         x: 10, y: 260, color: COLORS.segment, delay: 165 },
    { id: "rv",  label: "RV",         x: 90, y: 260, color: COLORS.segment, delay: 170 },
  ];
  const edges = [
    ["sa","av"],["av","his"],["his","lbb"],["his","rbb"],["lbb","lv"],["rbb","rv"],
  ];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <svg width={130} height={290} className="overflow-visible">
      {edges.map(([a, b]) => {
        const na = nodeMap[a]; const nb = nodeMap[b];
        const active = t > na.delay && t < nb.delay + 80;
        return (
          <line key={`${a}-${b}`} x1={na.x+12} y1={na.y+12} x2={nb.x+12} y2={nb.y+12}
            stroke={active ? "#f59e0b" : "#334155"} strokeWidth={active ? 2 : 1}
            strokeDasharray={active ? "none" : "4,3"} />
        );
      })}
      {nodes.map((n) => {
        const active = t > n.delay && t < n.delay + 90;
        return (
          <g key={n.id}>
            <circle cx={n.x+12} cy={n.y+12} r={12}
              fill={active ? n.color : "#1e293b"} stroke={n.color}
              strokeWidth={active ? 2 : 1}
              style={{ filter: active ? `drop-shadow(0 0 6px ${n.color})` : "none" }} />
            <text x={n.x+12} y={n.y+16} textAnchor="middle" fontSize={6}
              fill={active ? "#0f172a" : n.color} fontWeight="bold">
              {n.label.split(" ").map((w, i) => (
                <tspan key={i} x={n.x+12} dy={i===0?0:8}>{w}</tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SegmentGrid({ t }: { t: number }) {
  const segs = [
    { id: "sept-endo", act: 5,  label: "Sept"    },
    { id: "lv-ant",   act: 20, label: "LV Ant"  },
    { id: "lv-lat",   act: 60, label: "LV Lat"  },
    { id: "lv-inf",   act: 40, label: "LV Inf"  },
    { id: "lv-post",  act: 65, label: "LV Post" },
    { id: "lv-apex",  act: 50, label: "LV Apex" },
    { id: "rv-free",  act: 20, label: "RV Free" },
    { id: "rv-out",   act: 10, label: "RV Out"  },
    { id: "rv-inf",   act: 25, label: "RV Inf"  },
  ];
  return (
    <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900 rounded-lg">
      {segs.map((s) => {
        const dt = t - (165 + s.act);
        const active = dt > -20 && dt < 40;
        const repol  = t > (165 + s.act + 280) && t < (165 + s.act + 340);
        return (
          <div key={s.id} className="rounded text-center py-1 transition-all duration-75"
            style={{
              background: repol ? "#10b98133" : active ? "#8b5cf633" : "#0f172a",
              border: `1px solid ${repol ? "#10b981" : active ? "#8b5cf6" : "#334155"}`,
              boxShadow: active ? "0 0 8px #8b5cf6" : repol ? "0 0 8px #10b981" : "none",
            }}>
            <div style={{ fontSize: 8, color: repol ? "#10b981" : active ? "#c4b5fd" : "#64748b" }}>{s.label}</div>
            <div style={{ fontSize: 7, color: "#475569" }}>{s.act}ms</div>
          </div>
        );
      })}
    </div>
  );
}

function DipolArrow({ t }: { t: number }) {
  const qrs = t > 165 && t < 255;
  const tw  = t > 380 && t < 500;
  const mag = qrs ? 1 : tw ? 0.27 : 0.05;
  const angle = qrs ? 51 : tw ? 40 : 0;
  const cx = 50, cy = 50, len = 30 * mag;
  const rad = ((angle - 90) * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * len;
  const ey = cy + Math.sin(rad) * len;
  return (
    <svg width={100} height={100}>
      <circle cx={cx} cy={cy} r={45} fill="none" stroke="#1e3a4a" strokeWidth={0.5} />
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg) => {
        const r2 = ((deg-90)*Math.PI)/180;
        return (
          <text key={deg} x={cx+Math.cos(r2)*42} y={cy+Math.sin(r2)*42}
            fontSize={5} textAnchor="middle" dominantBaseline="middle" fill="#334155">
            {deg}°
          </text>
        );
      })}
      <line x1={cx} y1={5} x2={cx} y2={95} stroke="#1e3a4a" strokeWidth={0.5} />
      <line x1={5}  y1={cy} x2={95} y2={cy} stroke="#1e3a4a" strokeWidth={0.5} />
      {mag > 0.1 && (
        <>
          <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#f59e0b" strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 4px #f59e0b)" }} />
          <circle cx={ex} cy={ey} r={3} fill="#f59e0b" />
          <text x={ex+4} y={ey-2} fontSize={7} fill="#f59e0b">{angle}°</text>
        </>
      )}
      <text x={cx} y={cy-2} fontSize={7} textAnchor="middle" fill={COLORS.muted}>Cardiac</text>
      <text x={cx} y={cy+7} fontSize={7} textAnchor="middle" fill={COLORS.muted}>Vector</text>
    </svg>
  );
}

function SectionCard({ title, color, children, subtitle }: {
  title: string; color: string; children: React.ReactNode; subtitle?: string;
}) {
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: COLORS.card, border: `1px solid ${color}33` }}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold" style={{ color }}>{title}</span>
        {subtitle && <span className="text-xs ml-auto" style={{ color: COLORS.muted }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

export function EkgSystemViz() {
  const t = useAnimatedValue(800);
  const [phase, setPhase] = useState("diastole");
  const [activeTab, setActiveTab] = useState<"system" | "strip">("system");

  useEffect(() => {
    if (t < 80)       setPhase("P wave");
    else if (t < 165) setPhase("PR interval");
    else if (t < 255) setPhase("QRS complex");
    else if (t < 380) setPhase("ST segment");
    else if (t < 500) setPhase("T wave");
    else              setPhase("diastole");
  }, [t]);

  return (
    <div className="min-h-screen p-4 font-mono" style={{ background: COLORS.bg, color: COLORS.text }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold" style={{ color: COLORS.accent }}>
            12-Lead EKG Simulator — Physics Engine
          </h1>
          <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
            Dipole Summation Model · 34 Myocardial Segments · Durrer 1970 Activation
          </p>
          <div className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b" }}>
            ⏱ {t.toFixed(0)} ms — {phase}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-3">
          {(["system", "strip"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab ? "#0ea5e922" : "#1e293b",
                border: `1px solid ${activeTab === tab ? "#38bdf8" : "#334155"}`,
                color: activeTab === tab ? "#38bdf8" : "#64748b",
                cursor: "pointer",
              }}
            >
              {tab === "system" ? "⚙ System Architecture" : "📈 12-Lead EKG Strip"}
            </button>
          ))}
        </div>

        {/* ── TAB 1: System Architecture ── */}
        {activeTab === "system" && (
          <>
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-3">
                <SectionCard title="Conduction System" color={COLORS.sa} subtitle="Dijkstra">
                  <ConductionFlow t={t} />
                  <div className="text-center mt-1" style={{ fontSize: 8, color: COLORS.muted }}>
                    SA(0ms) → AV(130ms) → His(140ms)<br />LBB(150ms) / RBB(145ms)
                  </div>
                </SectionCard>
              </div>
              <div className="col-span-3">
                <SectionCard title="Heart Model" color={COLORS.segment} subtitle="34 segments">
                  <div className="text-xs mt-1 mb-1 space-y-0.5" style={{ color: COLORS.muted, fontSize: 8 }}>
                    <div>• Durrer 1970 activation times</div>
                    <div>• Streeter 1979 fiber directions</div>
                    <div>• Antzelevitch APD gradients</div>
                  </div>
                  <SegmentGrid t={t} />
                  <div className="flex gap-2 mt-1" style={{ fontSize: 7 }}>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm bg-purple-500 opacity-50" />
                      <span style={{ color: COLORS.muted }}>depol</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500 opacity-50" />
                      <span style={{ color: COLORS.muted }}>repol</span>
                    </span>
                  </div>
                </SectionCard>
              </div>
              <div className="col-span-3">
                <SectionCard title="Dual-Bell Signal Model" color="#8b5cf6" subtitle="dVm/dt">
                  <div className="mt-1"><BellWaveform t={t} /></div>
                  <div className="mt-2 rounded p-2" style={{ background: "#0f172a", fontSize: 8, color: COLORS.muted }}>
                    <div style={{ color: "#c4b5fd" }}>bell(t, t₀, τ) = 4·σ(x)·(1−σ(x))</div>
                    <div className="mt-1">signal = depol + 0.30·repol</div>
                    <div className="mt-1">dipole = fiberDir × mass × signal × GAIN</div>
                  </div>
                  <div className="mt-2"><DipolArrow t={t} /></div>
                </SectionCard>
              </div>
              <div className="col-span-3">
                <SectionCard title="Lead Output" color={COLORS.lead} subtitle="dot product">
                  <div className="mt-1 text-xs" style={{ color: COLORS.muted, fontSize: 8 }}>
                    V_lead = Σ(dipole_i · leadVec)
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-1">
                    {["I","II","aVR","V1","V4","V6"].map((name) => {
                      const cfg = LEAD_CONFIG[name];
                      const v = ecgVoltage(t, cfg);
                      const pct = Math.max(-1, Math.min(1, v));
                      return (
                        <div key={name} className="bg-slate-900 rounded p-1 text-center">
                          <div style={{ fontSize: 8, color: cfg.color, marginBottom: 2 }}>{name}</div>
                          <div className="relative h-3 w-full rounded overflow-hidden bg-slate-800">
                            <div className="absolute inset-y-0 transition-all"
                              style={{
                                left: pct < 0 ? `${50 + pct * 50}%` : "50%",
                                width: `${Math.abs(pct) * 50}%`,
                                background: pct > 0 ? "#06b6d4" : "#ef4444",
                              }} />
                            <div className="absolute inset-0 flex items-center justify-center"
                              style={{ fontSize: 6, color: "#f1f5f9" }}>
                              {v.toFixed(2)}mV
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </div>
            </div>

            {/* Pipeline */}
            <div className="mt-3 rounded-lg p-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
              <div className="text-xs font-bold mb-2" style={{ color: COLORS.accent }}>Data Flow Pipeline</div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {[
                  { label: "SA Node",          sub: "0ms pacemaker",     color: COLORS.sa      },
                  { label: "→" },
                  { label: "AV + His-Purkinje",sub: "130ms delay",       color: COLORS.av      },
                  { label: "→" },
                  { label: "Dijkstra BFS",     sub: "activation times",  color: "#a78bfa"      },
                  { label: "→" },
                  { label: "34 Segments",      sub: "bell dipoles",      color: COLORS.segment },
                  { label: "→" },
                  { label: "Σ Dipole Sum",     sub: "3D cardiac vector", color: "#f59e0b"      },
                  { label: "→" },
                  { label: "Lead Vectors",     sub: "Malmivuo 1995",     color: COLORS.lead    },
                  { label: "→" },
                  { label: "12-Lead ECG",      sub: "mV waveforms",      color: "#34d399"      },
                ].map((step, i) =>
                  step.label === "→" ? (
                    <div key={i} className="text-slate-500 text-sm px-1 shrink-0">→</div>
                  ) : (
                    <div key={i} className="rounded px-2 py-1 shrink-0 text-center"
                      style={{ background: `${step.color}15`, border: `1px solid ${step.color}44`, minWidth: 80 }}>
                      <div style={{ fontSize: 9, color: step.color, fontWeight: "bold" }}>{step.label}</div>
                      <div style={{ fontSize: 7, color: COLORS.muted }}>{step.sub}</div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-3 grid grid-cols-6 gap-2">
              {[
                { label: "QRS",    value: "90ms",    target: "80–100ms",  ok: true  },
                { label: "PR",     value: "165ms",   target: "120–200ms", ok: true  },
                { label: "QT",     value: "455ms",   target: "360–420ms", ok: false },
                { label: "Axis",   value: "51°",     target: "0–90°",     ok: true  },
                { label: "R-wave", value: "1.00mV",  target: "0.6–1.5mV", ok: true  },
                { label: "ST",     value: "0.01mV",  target: "~0mV",      ok: true  },
              ].map((m) => (
                <div key={m.label} className="rounded-lg p-2 text-center"
                  style={{ background: m.ok ? "#10b98111" : "#ef444411", border: `1px solid ${m.ok ? "#10b981" : "#ef4444"}44` }}>
                  <div style={{ fontSize: 8, color: COLORS.muted }}>{m.label}</div>
                  <div style={{ fontSize: 12, fontWeight: "bold", color: m.ok ? "#34d399" : "#f87171" }}>{m.value}</div>
                  <div style={{ fontSize: 7, color: "#475569" }}>{m.target}</div>
                </div>
              ))}
            </div>

            {/* Pathologies */}
            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <div className="text-xs" style={{ color: COLORS.muted }}>Pathologies modeled:</div>
              {["STEMI","LBBB","RBBB","WPW","AF","VT","AV Block I/II/III","LVH"].map((p) => (
                <span key={p} className="rounded-full px-2 py-0.5 text-xs"
                  style={{ background: "#ef444411", border: "1px solid #ef444444", color: "#fca5a5" }}>
                  {p}
                </span>
              ))}
            </div>
          </>
        )}

        {/* ── TAB 2: Full 12-Lead Strip ── */}
        {activeTab === "strip" && (
          <div className="mt-1">
            <TwelveLeadDisplay t={t} />

            {/* Per-lead annotations */}
            <div className="mt-3 grid grid-cols-4 gap-2">
              {Object.entries(LEAD_CONFIG).map(([name, cfg]) => {
                const v = ecgVoltage(t, cfg);
                return (
                  <div key={name} className="rounded-lg p-2 flex items-center gap-2"
                    style={{ background: COLORS.card, border: `1px solid ${cfg.color}33` }}>
                    <span className="font-bold text-sm w-8 shrink-0" style={{ color: cfg.color }}>{name}</span>
                    <div className="flex-1">
                      <div className="relative h-2.5 w-full rounded overflow-hidden bg-slate-800">
                        <div className="absolute inset-y-0"
                          style={{
                            left: v < 0 ? `${Math.max(0, 50 + v * 35)}%` : "50%",
                            width: `${Math.min(50, Math.abs(v) * 35)}%`,
                            background: v > 0 ? cfg.color : "#ef4444",
                            opacity: 0.7,
                          }} />
                      </div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap" style={{ fontSize: 9, color: COLORS.muted, width: 60, textAlign: "right" }}>
                      {v.toFixed(3)} mV
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Normal finding notes */}
            <div className="mt-3 rounded-lg p-3" style={{ background: COLORS.card, border: "1px solid #334155" }}>
              <div className="text-xs font-bold mb-2" style={{ color: COLORS.accent }}>Normal EKG Findings</div>
              <div className="grid grid-cols-3 gap-x-6 gap-y-1" style={{ fontSize: 8, color: COLORS.muted }}>
                {[
                  "Lead I, II, aVF: upright QRS (normal axis ~51°)",
                  "aVR: deeply negative QRS (normal — inverted axis lead)",
                  "V1: rS pattern — small r, dominant S (septal depol away)",
                  "V1→V6: R-wave progression (r grows, S shrinks left→right)",
                  "V5/V6: tall R, no S (lateral LV mass dominates)",
                  "P wave upright in II, inverted in aVR (normal sinus)",
                  "T waves concordant with QRS in all leads except aVR",
                  "PR 165ms: slow AV nodal conduction (normal range)",
                  "QT/QTc 455/416ms: borderline but corrected within range",
                ].map((note, i) => (
                  <div key={i} className="flex gap-1">
                    <span style={{ color: "#34d399" }}>•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
