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

function useAnimatedValue(targetMs: number, cycleMs = 800) {
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

function EcgWaveform({ t }: { t: number }) {
  const W = 280;
  const H = 80;
  const pts: [number, number][] = [];
  for (let i = 0; i <= W; i++) {
    const ms = (i / W) * 800;
    const p = bell(ms, 40, 6) * 0.18;
    const q = -bell(ms, 165, 4) * 0.09;
    const r = bell(ms, 176, 5) * 1.0;
    const s = -bell(ms, 190, 5) * 0.07;
    const twave = bell(ms, 420, 30) * 0.27;
    const v = p + q + r + s + twave;
    pts.push([i, H / 2 - v * (H / 2.4)]);
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
  const curX = (t / 800) * W;
  const curY = pts[Math.round(curX)]?.[1] ?? H / 2;

  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id="ecg-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.1" />
          <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="#0f172a" rx={6} />
      <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#1e3a4a" strokeWidth={0.5} />
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={f * W} y1={0} x2={f * W} y2={H} stroke="#1e3a4a" strokeWidth={0.5} />
      ))}
      <path d={d} fill="none" stroke="#06b6d4" strokeWidth={1.5} />
      <circle cx={curX} cy={curY} r={3} fill="#f59e0b" />
      <line x1={curX} y1={0} x2={curX} y2={H} stroke="#f59e0b" strokeWidth={0.5} strokeOpacity={0.5} />
    </svg>
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
    { id: "sa", label: "SA Node", x: 50, y: 20, color: COLORS.sa, delay: 0 },
    { id: "av", label: "AV Node", x: 50, y: 80, color: COLORS.av, delay: 130 },
    { id: "his", label: "His Bundle", x: 50, y: 140, color: COLORS.his, delay: 140 },
    { id: "lbb", label: "LBB", x: 10, y: 200, color: COLORS.lbb, delay: 150 },
    { id: "rbb", label: "RBB", x: 90, y: 200, color: COLORS.rbb, delay: 145 },
    { id: "lv", label: "LV", x: 10, y: 260, color: COLORS.segment, delay: 165 },
    { id: "rv", label: "RV", x: 90, y: 260, color: COLORS.segment, delay: 170 },
  ];
  const edges = [
    ["sa", "av"], ["av", "his"], ["his", "lbb"], ["his", "rbb"],
    ["lbb", "lv"], ["rbb", "rv"],
  ];
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  return (
    <svg width={130} height={290} className="overflow-visible">
      {edges.map(([a, b]) => {
        const na = nodeMap[a];
        const nb = nodeMap[b];
        const active = t > na.delay && t < nb.delay + 80;
        return (
          <line
            key={`${a}-${b}`}
            x1={na.x + 12} y1={na.y + 12}
            x2={nb.x + 12} y2={nb.y + 12}
            stroke={active ? "#f59e0b" : "#334155"}
            strokeWidth={active ? 2 : 1}
            strokeDasharray={active ? "none" : "4,3"}
          />
        );
      })}
      {nodes.map((n) => {
        const active = t > n.delay && t < n.delay + 90;
        return (
          <g key={n.id}>
            <circle
              cx={n.x + 12} cy={n.y + 12} r={12}
              fill={active ? n.color : "#1e293b"}
              stroke={n.color}
              strokeWidth={active ? 2 : 1}
              style={{ filter: active ? `drop-shadow(0 0 6px ${n.color})` : "none" }}
            />
            <text x={n.x + 12} y={n.y + 16} textAnchor="middle" fontSize={6} fill={active ? "#0f172a" : n.color} fontWeight="bold">
              {n.label.split(" ").map((w, i) => (
                <tspan key={i} x={n.x + 12} dy={i === 0 ? 0 : 8}>{w}</tspan>
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
    { id: "sept-endo", act: 5, label: "Sept" },
    { id: "lv-ant", act: 20, label: "LV Ant" },
    { id: "lv-lat", act: 60, label: "LV Lat" },
    { id: "lv-inf", act: 40, label: "LV Inf" },
    { id: "lv-post", act: 65, label: "LV Post" },
    { id: "lv-apex", act: 50, label: "LV Apex" },
    { id: "rv-free", act: 20, label: "RV Free" },
    { id: "rv-out", act: 10, label: "RV Out" },
    { id: "rv-inf", act: 25, label: "RV Inf" },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 p-2 bg-slate-900 rounded-lg">
      {segs.map((s) => {
        const dt = t - (165 + s.act);
        const active = dt > -20 && dt < 40;
        const repol = t > (165 + s.act + 280) && t < (165 + s.act + 340);
        return (
          <div
            key={s.id}
            className="rounded text-center py-1 transition-all duration-75"
            style={{
              background: repol ? "#10b98133" : active ? "#8b5cf633" : "#0f172a",
              border: `1px solid ${repol ? "#10b981" : active ? "#8b5cf6" : "#334155"}`,
              boxShadow: active ? `0 0 8px #8b5cf6` : repol ? `0 0 8px #10b981` : "none",
            }}
          >
            <div style={{ fontSize: 8, color: repol ? "#10b981" : active ? "#c4b5fd" : "#64748b" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 7, color: "#475569" }}>{s.act}ms</div>
          </div>
        );
      })}
    </div>
  );
}

function LeadPanel({ t }: { t: number }) {
  const leads = [
    { name: "I", vec: [1, 0], peak: 0.93 },
    { name: "II", vec: [0.5, 0.87], peak: 1.00 },
    { name: "III", vec: [-0.5, 0.87], peak: 0.43 },
    { name: "aVR", vec: [-0.87, -0.5], peak: -1.09 },
    { name: "V1", vec: [0, 0, 1], peak: 0.80 },
    { name: "V5", vec: [0.7, 0, 0.7], peak: 1.53 },
  ];

  return (
    <div className="grid grid-cols-3 gap-1 p-2">
      {leads.map((l) => {
        const ms = t;
        const p = bell(ms, 40, 6) * 0.18;
        const r = bell(ms, 176, 5) * l.peak;
        const twave = bell(ms, 420, 30) * l.peak * 0.27;
        const v = (p + r + twave);
        const pct = Math.max(-1, Math.min(1, v));
        return (
          <div key={l.name} className="bg-slate-900 rounded p-1 text-center">
            <div style={{ fontSize: 8, color: COLORS.lead, marginBottom: 2 }}>{l.name}</div>
            <div className="relative h-4 w-full rounded overflow-hidden bg-slate-800">
              <div
                className="absolute inset-y-0 transition-all duration-50"
                style={{
                  left: pct < 0 ? `${50 + pct * 50}%` : "50%",
                  width: `${Math.abs(pct) * 50}%`,
                  background: pct > 0 ? "#06b6d4" : "#ef4444",
                  opacity: 0.8,
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 7, color: "#f1f5f9" }}>
                {v.toFixed(2)}mV
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DipolArrow({ t }: { t: number }) {
  const ms = t;
  const qrs = ms > 165 && ms < 255;
  const tw = ms > 380 && ms < 500;
  const mag = qrs ? 1 : tw ? 0.27 : 0.05;
  const angle = qrs ? 51 : tw ? 40 : 0;
  const cx = 50, cy = 50, len = 30 * mag;
  const rad = ((angle - 90) * Math.PI) / 180;
  const ex = cx + Math.cos(rad) * len;
  const ey = cy + Math.sin(rad) * len;

  return (
    <svg width={100} height={100} className="overflow-visible">
      <circle cx={cx} cy={cy} r={45} fill="none" stroke="#1e3a4a" strokeWidth={0.5} />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const r2 = ((deg - 90) * Math.PI) / 180;
        return (
          <text
            key={deg}
            x={cx + Math.cos(r2) * 42}
            y={cy + Math.sin(r2) * 42}
            fontSize={5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#334155"
          >
            {deg}°
          </text>
        );
      })}
      <line x1={cx} y1={5} x2={cx} y2={95} stroke="#1e3a4a" strokeWidth={0.5} />
      <line x1={5} y1={cy} x2={95} y2={cy} stroke="#1e3a4a" strokeWidth={0.5} />
      {mag > 0.1 && (
        <>
          <line
            x1={cx} y1={cy} x2={ex} y2={ey}
            stroke="#f59e0b"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 4px #f59e0b)" }}
          />
          <circle cx={ex} cy={ey} r={3} fill="#f59e0b" />
          <text x={ex + 4} y={ey - 2} fontSize={7} fill="#f59e0b">{angle}°</text>
        </>
      )}
      <text x={cx} y={cy - 2} fontSize={7} textAnchor="middle" fill={COLORS.muted}>
        Cardiac
      </text>
      <text x={cx} y={cy + 7} fontSize={7} textAnchor="middle" fill={COLORS.muted}>
        Vector
      </text>
    </svg>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center text-slate-500 text-xs">
      <svg width={16} height={20}>
        <path d="M8,0 L8,14 M4,10 L8,16 L12,10" stroke="#475569" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function SectionCard({
  title, color, children, subtitle,
}: {
  title: string; color: string; children: React.ReactNode; subtitle?: string;
}) {
  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-1"
      style={{ background: COLORS.card, border: `1px solid ${color}33` }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-xs font-semibold" style={{ color }}>
          {title}
        </span>
        {subtitle && (
          <span className="text-xs ml-auto" style={{ color: COLORS.muted }}>
            {subtitle}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

export function EkgSystemViz() {
  const t = useAnimatedValue(0, 800);
  const [phase, setPhase] = useState("diastole");

  useEffect(() => {
    if (t < 80) setPhase("P wave");
    else if (t < 165) setPhase("PR interval");
    else if (t < 255) setPhase("QRS complex");
    else if (t < 380) setPhase("ST segment");
    else if (t < 500) setPhase("T wave");
    else setPhase("diastole");
  }, [t]);

  return (
    <div
      className="min-h-screen p-4 font-mono"
      style={{ background: COLORS.bg, color: COLORS.text }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold" style={{ color: COLORS.accent }}>
            12-Lead EKG Simulator — Physics Engine
          </h1>
          <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
            Dipole Summation Model · 34 Myocardial Segments · Durrer 1970 Activation
          </p>
          <div
            className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold"
            style={{ background: "#f59e0b22", border: "1px solid #f59e0b", color: "#f59e0b" }}
          >
            ⏱ {t.toFixed(0)} ms — {phase}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Column 1: Conduction system */}
          <div className="col-span-3 flex flex-col gap-2">
            <SectionCard title="Conduction System" color={COLORS.sa} subtitle="Dijkstra">
              <ConductionFlow t={t} />
              <div className="text-center mt-1" style={{ fontSize: 8, color: COLORS.muted }}>
                SA(0ms) → AV(130ms) → His(140ms)<br />
                LBB(150ms) / RBB(145ms)
              </div>
            </SectionCard>
          </div>

          {/* Column 2: Heart segments */}
          <div className="col-span-3 flex flex-col gap-2">
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

          {/* Column 3: Signal model */}
          <div className="col-span-3 flex flex-col gap-2">
            <SectionCard title="Dual-Bell Signal Model" color="#8b5cf6" subtitle="dVm/dt">
              <div className="mt-1">
                <BellWaveform t={t} />
              </div>
              <div className="mt-2 rounded p-2" style={{ background: "#0f172a", fontSize: 8, color: COLORS.muted }}>
                <div style={{ color: "#c4b5fd" }}>bell(t, t₀, τ) = 4·σ(x)·(1−σ(x))</div>
                <div className="mt-1">signal = depol + 0.30·repol</div>
                <div className="mt-1">dipole = fiberDir × mass × signal × GAIN</div>
              </div>
              <div className="mt-2">
                <DipolArrow t={t} />
              </div>
            </SectionCard>
          </div>

          {/* Column 4: Leads */}
          <div className="col-span-3 flex flex-col gap-2">
            <SectionCard title="12-Lead Output" color={COLORS.lead} subtitle="dot product">
              <div className="mt-1">
                <EcgWaveform t={t} />
              </div>
              <div className="text-xs mt-1 mb-1" style={{ color: COLORS.muted, fontSize: 8 }}>
                V_lead = Σ(dipole_i · leadVec) / |leadVec|
              </div>
              <LeadPanel t={t} />
            </SectionCard>
          </div>
        </div>

        {/* Pipeline flow row */}
        <div className="mt-3 flex items-start gap-2">
          <div className="flex-1 rounded-lg p-2" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="text-xs font-bold mb-2" style={{ color: COLORS.accent }}>Data Flow Pipeline</div>
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {[
                { label: "SA Node", sub: "0ms pacemaker", color: COLORS.sa },
                { label: "→" },
                { label: "AV + His-Purkinje", sub: "130ms delay", color: COLORS.av },
                { label: "→" },
                { label: "Dijkstra BFS", sub: "activation times", color: "#a78bfa" },
                { label: "→" },
                { label: "34 Segments", sub: "bell dipoles", color: COLORS.segment },
                { label: "→" },
                { label: "Σ Dipole Sum", sub: "3D cardiac vector", color: "#f59e0b" },
                { label: "→" },
                { label: "Lead Vectors", sub: "Malmivuo 1995", color: COLORS.lead },
                { label: "→" },
                { label: "12-Lead ECG", sub: "mV waveforms", color: "#34d399" },
              ].map((step, i) =>
                step.label === "→" ? (
                  <div key={i} className="text-slate-500 text-sm px-1 shrink-0">→</div>
                ) : (
                  <div
                    key={i}
                    className="rounded px-2 py-1 shrink-0 text-center"
                    style={{ background: `${step.color}15`, border: `1px solid ${step.color}44`, minWidth: 80 }}
                  >
                    <div style={{ fontSize: 9, color: step.color, fontWeight: "bold" }}>{step.label}</div>
                    <div style={{ fontSize: 7, color: COLORS.muted }}>{step.sub}</div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="mt-3 grid grid-cols-6 gap-2">
          {[
            { label: "QRS", value: "90ms", target: "80–100ms", ok: true },
            { label: "PR", value: "165ms", target: "120–200ms", ok: true },
            { label: "QT", value: "455ms", target: "360–420ms", ok: false },
            { label: "Axis", value: "51°", target: "0–90°", ok: true },
            { label: "R-wave", value: "1.00mV", target: "0.6–1.5mV", ok: true },
            { label: "ST", value: "0.01mV", target: "~0mV", ok: true },
          ].map((m) => (
            <div
              key={m.label}
              className="rounded-lg p-2 text-center"
              style={{
                background: m.ok ? "#10b98111" : "#ef444411",
                border: `1px solid ${m.ok ? "#10b981" : "#ef4444"}44`,
              }}
            >
              <div style={{ fontSize: 8, color: COLORS.muted }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: "bold", color: m.ok ? "#34d399" : "#f87171" }}>
                {m.value}
              </div>
              <div style={{ fontSize: 7, color: "#475569" }}>{m.target}</div>
            </div>
          ))}
        </div>

        {/* Pathology chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="text-xs mr-1" style={{ color: COLORS.muted }}>Pathologies modeled:</div>
          {["STEMI", "LBBB", "RBBB", "WPW", "AF", "VT", "AV Block I/II/III", "LVH"].map((p) => (
            <span
              key={p}
              className="rounded-full px-2 py-0.5 text-xs"
              style={{ background: "#ef444411", border: "1px solid #ef444444", color: "#fca5a5" }}
            >
              {p}
            </span>
          ))}
          <div className="text-xs" style={{ color: COLORS.muted }}>
            → modify tissue properties (health, injuryCurrent, conductionVelocity)
          </div>
        </div>
      </div>
    </div>
  );
}
