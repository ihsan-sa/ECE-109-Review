import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// ─── KaTeX Components (copy verbatim) ───

function Eq({ children, display = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && window.katex) {
      try {
        window.katex.render(children, ref.current, { displayMode: display, throwOnError: false, trust: true });
      } catch (e) { ref.current.textContent = children; }
    }
  }, [children, display]);
  return display ? <div className="eq-block"><span ref={ref} /></div> : <span ref={ref} className="eq-inline" />;
}

function M({ children }) { return <Eq display={false}>{children}</Eq>; }

// ─── Topic Context for Chatbot ───

const TOPIC_CONTEXT = {
  "wave-particle": `Topic: Wave-Particle Duality. Covers: Historical context (Newton's corpuscular theory, Maxwell's EM waves, Planck/Einstein quantum mechanics). Energy quantization E = hf where h = 6.63e-34 Js is Planck's constant, f is frequency. De Broglie wavelength lambda = h/p relating wavelength to momentum. Wave-particle duality: light is both wave and particle (photon). Photoelectric effect: KE_m = hf - Phi_metal where Phi_metal is work function. Photon energy E_ph = hf = hbar*omega, photon momentum p = h/lambda = hf/c. Electron double-slit experiment demonstrating matter waves.`,
  "wave-equation": `Topic: Wave Equation. Covers: Classical wave equation nabla^2 u - (1/c^2)(d^2u/dt^2) = 0. EM wave equation for E-field in 1D: (d^2/dz^2)E(z,t) - (1/c^2)(d^2/dt^2)E(z,t) = 0. Solution: E(z,t) = E_0 cos(kz - omega*t + phi_0). Complex exponential form: e^{ikz}e^{-i*omega*t}. Superposition principle for linear equations. Wave parameters: omega = 2*pi/T (angular frequency), k = 2*pi/lambda (wavenumber), k = omega/c. Vector calculus: curl (nabla cross A), divergence (nabla dot A), gradient (nabla alpha), scalar Laplacian nabla^2 alpha, vector Laplacian nabla^2 A. Transverse vs longitudinal waves. Standing waves.`,
  "qm-formalism": `Topic: QM Formalism. Covers: Wavefunctions Psi(x,y,z,t) are complex-valued normed functions. |Psi|^2 dx dy dz is the probability of finding particle in volume element at (x,y,z) at time t (Born interpretation). Normalization: integral |Psi|^2 dV = 1. Psi and nabla Psi must be continuous. Operators: momentum operator p-hat = (hbar/i) nabla = -i*hbar*(d/dx) in 1D. Expectation values: E[X] = integral x*f(x) dx for continuous variable; for QM observable A: langle A rangle = integral psi* A-hat psi dx. Ket notation |psi rangle. Probability density function properties: f(x) >= 0, integral f(x) dx = 1.`,
  "schrodinger": `Topic: Schrodinger Equation. Covers: Time-dependent SE: i*hbar*(d/dt)|psi rangle = H-hat|psi rangle where H-hat is the Hamiltonian operator. Classical Hamiltonian: H = p^2/(2m) + V(x) = KE + PE. QM Hamiltonian: H-hat = -(hbar^2)/(2m)*nabla^2 + V(r). Time evolution operator: |psi(t) rangle = U(t)|psi(0) rangle where U(t) = exp(-i*H-hat*t/hbar). Stationary states: H-hat|psi_n rangle = E_n|psi_n rangle (eigenvalue equation). Time-independent SE in 1D: (d^2 psi)/(dx^2) + (2m_e/hbar^2)(E - V)*psi = 0. Free electron solution: psi = A*exp(jkx) where k = sqrt(2m_e*E)/hbar.`,
  "infinite-well": `Topic: Infinite Potential Well. Covers: 1D square well of width a with V = 0 inside (0 < x < a) and V = infinity outside. Boundary conditions: psi(0) = psi(a) = 0. Wavefunctions: psi_n(x) = sqrt(2/a)*sin(n*pi*x/a) for n = 1,2,3,... Energy quantization: E_n = n^2*h^2/(8*m_e*a^2) = n^2*pi^2*hbar^2/(2*m_e*a^2). Energy spacing: Delta E_n = E_{n+1} - E_n = (2n+1)*h^2/(8*m_e*a^2), grows with n. Probability density |psi_n|^2 = (2/a)*sin^2(n*pi*x/a): n-1 nodes inside well, probability peaks between nodes. For n=1 (ground state) max probability at center. Normalization: integral_0^a |psi_n|^2 dx = 1. Zero-point energy: E_1 != 0 (particle always has nonzero minimum energy). Effect of well width: E_n proportional to 1/a^2, narrower well = larger energy spacing. Correspondence principle: as n -> infinity, quantum |psi_n|^2 oscillates rapidly and averages to the classical uniform distribution P(x) = 1/a.`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo, Winter 2026. The Introduction to Quantum Mechanics unit spans Lectures 1-6, covering wave-particle duality, the wave equation, QM formalism (wavefunctions, probability, operators, expectation values), the Schrodinger equation, and the infinite potential well. The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

const MODELS = [
  { model: "claude-sonnet-4-6", label: "Sonnet 4.6", key: "s" },
  { model: "claude-opus-4-6", label: "Opus 4.6", key: "k" },
  { model: "claude-haiku-4-5-20251001", label: "Haiku 4.5", key: "h" },
];

const EFFORT_LEVELS = ["low", "medium", "high", "max"];

// ─── Theme-Aware Graph Colors (copy verbatim) ───

const IMG = import.meta.env.BASE_URL + "images/";
const VID = import.meta.env.BASE_URL + "videos/";

const THEMES_G = {
  dark:  { bg: "#13151c", ax: "#6b7084", gold: "#c8a45a", blue: "#4a90d9", red: "#e06c75", grn: "#69b578", txt: "#9498ac", ltxt: "#b0b4c4", purple: "#a077d4", orange: "#e0a060" },
  light: { bg: "#f0efe8", ax: "#888", gold: "#9a7b2e", blue: "#2a6abf", red: "#c0392b", grn: "#2d8a4e", txt: "#555", ltxt: "#333", purple: "#7b5bb5", orange: "#c4822e" },
};
let G = THEMES_G.light;

// ─── Default Graph Parameters ───

const DEFAULT_GRAPH_PARAMS = {
  infiniteWellWavefunctions: { nMax: 4, showProbability: false },
  probabilityDensity: { nMax: 4 },
  energyLevelDiagram: { nMax: 6, wellWidth_nm: 1.0 },
};

// ─── Graph Components ───

function InfiniteWellWavefunctions({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.infiniteWellWavefunctions, ...params };
  const w = 500, h = 340, ox = 60, oy = 310, plotW = 360, plotH = 270;
  const nMax = Math.min(p.nMax, 6);
  const colors = [G.gold, G.blue, G.red, G.grn, G.purple, G.orange];
  const energyScale = plotH / (nMax * nMax + 1);
  const xScale = plotW;

  const curves = [];
  for (let n = 1; n <= nMax; n++) {
    const En_y = oy - n * n * energyScale;
    const amp = energyScale * 0.35;
    let d = "";
    for (let i = 0; i <= 200; i++) {
      const xNorm = i / 200;
      const x = ox + xNorm * xScale;
      let val;
      if (p.showProbability) {
        val = Math.pow(Math.sin(n * Math.PI * xNorm), 2);
      } else {
        val = Math.sin(n * Math.PI * xNorm);
      }
      const y = En_y - val * amp;
      d += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    curves.push({ n, d, En_y, color: colors[(n - 1) % colors.length] });
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>{p.showProbability ? "Probability density of infinite well wavefunctions" : "Wavefunctions in an infinite potential well"}</title>
        <defs>
          <marker id={`ah-wf${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {p.showProbability ? "Probability Density |psi_n(x)|^2" : "Wavefunctions psi_n(x) in Infinite Well"}
        </text>
        {/* Well walls */}
        <line x1={ox} y1={oy} x2={ox} y2={25} stroke={G.ltxt} strokeWidth="3"/>
        <line x1={ox + xScale} y1={oy} x2={ox + xScale} y2={25} stroke={G.ltxt} strokeWidth="3"/>
        {/* Bottom */}
        <line x1={ox} y1={oy} x2={ox + xScale} y2={oy} stroke={G.ax} strokeWidth="1"/>
        {/* Energy levels and curves */}
        {curves.map(c => (
          <g key={c.n}>
            <line x1={ox} y1={c.En_y} x2={ox + xScale} y2={c.En_y} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3"/>
            <path d={c.d} fill="none" stroke={c.color} strokeWidth="2"/>
            <text x={ox + xScale + 8} y={c.En_y + 4} fill={c.color} fontSize="10" fontFamily="'IBM Plex Mono'">
              n={c.n}
            </text>
            <text x={ox - 8} y={c.En_y + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">
              E_{c.n}
            </text>
          </g>
        ))}
        {/* x-axis labels */}
        <text x={ox} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + xScale} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        <text x={ox + xScale / 2} y={oy + 28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">x</text>
      </svg>
    </div>
  );
}

function ProbabilityDensity({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.probabilityDensity, ...params };
  const w = 500, h = 320, ox = 60, oy = 290, plotW = 360, plotH = 250;
  const nMax = Math.min(p.nMax, 6);
  const colors = [G.gold, G.blue, G.red, G.grn, G.purple, G.orange];
  const yMax = 2.2;
  const yScale = plotH / yMax;

  const curves = [];
  for (let n = 1; n <= nMax; n++) {
    let d = "";
    for (let i = 0; i <= 200; i++) {
      const xNorm = i / 200;
      const x = ox + xNorm * plotW;
      const val = (2.0) * Math.pow(Math.sin(n * Math.PI * xNorm), 2);
      const y = oy - Math.min(val, yMax) * yScale;
      d += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    curves.push({ n, d, color: colors[(n - 1) % colors.length] });
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Probability density distributions for infinite well states</title>
        <defs>
          <marker id={`ah-pd${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Probability Density |psi_n(x)|^2 = (2/a) sin^2(n*pi*x/a)"}
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 20} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-pd${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-pd${mid})`}/>
        {/* Tick marks */}
        <line x1={ox} y1={oy - yScale} x2={ox - 4} y2={oy - yScale} stroke={G.ax} strokeWidth="1"/>
        <text x={ox - 8} y={oy - yScale + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">1/a</text>
        <line x1={ox} y1={oy - 2 * yScale} x2={ox - 4} y2={oy - 2 * yScale} stroke={G.ax} strokeWidth="1"/>
        <text x={ox - 8} y={oy - 2 * yScale + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">2/a</text>
        {/* Curves */}
        {curves.map(c => (
          <g key={c.n}>
            <path d={c.d} fill="none" stroke={c.color} strokeWidth="2"/>
            <text x={ox + plotW + 8} y={30 + (c.n - 1) * 16} fill={c.color} fontSize="10" fontFamily="'IBM Plex Mono'">
              n={c.n}
            </text>
          </g>
        ))}
        {/* Labels */}
        <text x={ox} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + plotW} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        <text x={ox + plotW / 2} y={oy + 28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">x</text>
        <text x={ox - 30} y={20} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">|psi|^2</text>
      </svg>
    </div>
  );
}

function EnergyLevelDiagram({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.energyLevelDiagram, ...params };
  const w = 400, h = 360, ox = 80, oy = 330, plotH = 290;
  const nMax = Math.min(p.nMax, 8);
  const a_m = p.wellWidth_nm * 1e-9;
  const me = 9.109e-31;
  const hbar = 1.055e-34;
  const E1_J = (Math.PI * Math.PI * hbar * hbar) / (2 * me * a_m * a_m);
  const E1_eV = E1_J / 1.602e-19;
  const EnMax = nMax * nMax * E1_eV;
  const yScale = plotH / (EnMax * 1.1);
  const lineW = 200;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Energy level diagram for infinite potential well</title>
        <defs>
          <marker id={`ah-el${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Energy Levels: a = " + p.wellWidth_nm + " nm"}
        </text>
        {/* Energy axis */}
        <line x1={ox - 10} y1={oy} x2={ox - 10} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-el${mid})`}/>
        <text x={ox - 25} y={18} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E (eV)</text>
        {/* Energy levels */}
        {Array.from({ length: nMax }, (_, i) => i + 1).map(n => {
          const En = n * n * E1_eV;
          const y = oy - En * yScale;
          const colors = [G.gold, G.blue, G.red, G.grn, G.purple, G.orange, G.gold, G.blue];
          return (
            <g key={n}>
              <line x1={ox} y1={y} x2={ox + lineW} y2={y} stroke={colors[(n - 1) % colors.length]} strokeWidth="2.5"/>
              <text x={ox + lineW + 8} y={y + 4} fill={colors[(n - 1) % colors.length]} fontSize="10" fontFamily="'IBM Plex Mono'">
                n={n}
              </text>
              <text x={ox - 16} y={y + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">
                {En.toFixed(1)}
              </text>
            </g>
          );
        })}
        {/* Base line at E=0 */}
        <line x1={ox} y1={oy} x2={ox + lineW} y2={oy} stroke={G.ax} strokeWidth="1" strokeDasharray="4,3"/>
        <text x={ox - 16} y={oy + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">0</text>
        {/* Note about n^2 scaling */}
        <text x={ox + lineW / 2} y={oy + 20} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"E_n proportional to n^2; E_1 = " + E1_eV.toFixed(2) + " eV"}
        </text>
      </svg>
    </div>
  );
}

// ─── Schrodinger Equation Visualizations ───

function StationaryVsNonStationary({ mid = "" }) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(true);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  useEffect(() => {
    if (!playing) { rafRef.current && cancelAnimationFrame(rafRef.current); return; }
    const step = (ts) => {
      if (lastRef.current) setTime(t => t + (ts - lastRef.current) * 0.002);
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { rafRef.current && cancelAnimationFrame(rafRef.current); lastRef.current = 0; };
  }, [playing]);

  const w = 540, h = 300, ox = 45, plotW = 195, plotH = 110, gap = 50;
  const ox2 = ox + plotW + gap;
  const oy1 = 80, oy2 = 230;
  // Normalized frequencies: E_n proportional to n^2, use omega_1 = 1
  const omega1 = 1, omega2 = 4;
  const N = 150;

  const makePath = (oxP, oyP, fn) => {
    let d = "";
    for (let i = 0; i <= N; i++) {
      const xN = i / N;
      const x = oxP + xN * plotW;
      const y = oyP - fn(xN) * (plotH * 0.42);
      d += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  };

  // Eigenstate psi_2: Re part oscillates in time, |psi|^2 frozen
  const eigenRe = (xN) => Math.sin(2 * Math.PI * xN) * Math.cos(omega2 * time);
  const eigenIm = (xN) => -Math.sin(2 * Math.PI * xN) * Math.sin(omega2 * time);
  const eigenProb = (xN) => Math.pow(Math.sin(2 * Math.PI * xN), 2);

  // Superposition psi_1 + psi_2 (unnormalized for visual clarity)
  const superRe = (xN) => {
    const c = 1 / Math.sqrt(2);
    return c * (Math.sin(Math.PI * xN) * Math.cos(omega1 * time) + Math.sin(2 * Math.PI * xN) * Math.cos(omega2 * time));
  };
  const superIm = (xN) => {
    const c = 1 / Math.sqrt(2);
    return c * (-Math.sin(Math.PI * xN) * Math.sin(omega1 * time) - Math.sin(2 * Math.PI * xN) * Math.sin(omega2 * time));
  };
  const superProb = (xN) => {
    const c = 1 / Math.sqrt(2);
    const re = c * (Math.sin(Math.PI * xN) * Math.cos(omega1 * time) + Math.sin(2 * Math.PI * xN) * Math.cos(omega2 * time));
    const im = c * (-Math.sin(Math.PI * xN) * Math.sin(omega1 * time) - Math.sin(2 * Math.PI * xN) * Math.sin(omega2 * time));
    return re * re + im * im;
  };

  const panelLabel = (x, y, text) => (
    <text x={x} y={y} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">{text}</text>
  );
  const wellWalls = (oxP, oyP) => (
    <g>
      <line x1={oxP} y1={oyP + plotH * 0.42} x2={oxP} y2={oyP - plotH * 0.5} stroke={G.ltxt} strokeWidth="2" />
      <line x1={oxP + plotW} y1={oyP + plotH * 0.42} x2={oxP + plotW} y2={oyP - plotH * 0.5} stroke={G.ltxt} strokeWidth="2" />
      <line x1={oxP} y1={oyP} x2={oxP + plotW} y2={oyP} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,3" />
    </g>
  );
  const rowLabel = (y, text) => (
    <text x={10} y={y} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="start" dominantBaseline="middle">{text}</text>
  );

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn" onClick={() => setPlaying(p => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button className="ctrl-btn" onClick={() => { setTime(0); lastRef.current = 0; }}>
          Reset
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Stationary eigenstate vs non-stationary superposition comparison</title>
        {/* Column headers */}
        {panelLabel(ox + plotW / 2, 14, "Eigenstate (n=2)")}
        {panelLabel(ox2 + plotW / 2, 14, "Superposition (n=1 + n=2)")}

        {/* Row labels */}
        {rowLabel(oy1, "Re/Im")}
        {rowLabel(oy2, "|psi|^2")}

        {/* Top-left: eigenstate Re/Im */}
        {wellWalls(ox, oy1)}
        <path d={makePath(ox, oy1, eigenRe)} fill="none" stroke={G.blue} strokeWidth="1.8" />
        <path d={makePath(ox, oy1, eigenIm)} fill="none" stroke={G.red} strokeWidth="1.2" strokeDasharray="4,3" />

        {/* Top-right: superposition Re/Im */}
        {wellWalls(ox2, oy1)}
        <path d={makePath(ox2, oy1, superRe)} fill="none" stroke={G.blue} strokeWidth="1.8" />
        <path d={makePath(ox2, oy1, superIm)} fill="none" stroke={G.red} strokeWidth="1.2" strokeDasharray="4,3" />

        {/* Bottom-left: eigenstate |psi|^2 */}
        {wellWalls(ox, oy2)}
        <path d={makePath(ox, oy2, eigenProb)} fill="none" stroke={G.gold} strokeWidth="2" />

        {/* Bottom-right: superposition |psi|^2 */}
        {wellWalls(ox2, oy2)}
        <path d={makePath(ox2, oy2, superProb)} fill="none" stroke={G.gold} strokeWidth="2" />

        {/* Legend */}
        <line x1={ox} y1={h - 8} x2={ox + 20} y2={h - 8} stroke={G.blue} strokeWidth="1.8" />
        <text x={ox + 24} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Re</text>
        <line x1={ox + 50} y1={h - 8} x2={ox + 70} y2={h - 8} stroke={G.red} strokeWidth="1.2" strokeDasharray="4,3" />
        <text x={ox + 74} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Im</text>
        <line x1={ox + 100} y1={h - 8} x2={ox + 120} y2={h - 8} stroke={G.gold} strokeWidth="2" />
        <text x={ox + 124} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">|psi|^2</text>
      </svg>
    </div>
  );
}

function HamiltonianDecomposition({ mid = "" }) {
  const [nState, setNState] = useState(1);
  const w = 500, h = 300, ox = 55, oy = 170, plotW = 380, plotH = 130;
  const N = 200;
  // Using infinite well: psi_n = sin(n*pi*x/a), V=0 inside
  // -hbar^2/(2m) * d^2psi/dx^2 = (n*pi/a)^2 * hbar^2/(2m) * psi = E_n * psi
  // Normalized so psi has amplitude ~1, KE = n^2 * psi, V = 0

  const psiVal = (xN) => Math.sin(nState * Math.PI * xN);
  const keVal = (xN) => nState * nState * Math.sin(nState * Math.PI * xN); // proportional to n^2 * psi
  // V = 0 inside well, so PE term = 0
  const hPsiVal = (xN) => keVal(xN); // H*psi = KE*psi + 0

  // Scale to fit
  const maxAmp = nState * nState;
  const scale = plotH * 0.9 / Math.max(maxAmp, 1);

  const makePath = (fn, s) => {
    let d = "";
    for (let i = 0; i <= N; i++) {
      const xN = i / N;
      const x = ox + xN * plotW;
      const y = oy - fn(xN) * s;
      d += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  };

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <label style={{ color: G.txt }}>Eigenstate n =</label>
        {[1, 2, 3, 4].map(n => (
          <button key={n} onClick={() => setNState(n)} style={{
            background: n === nState ? G.gold : "none",
            color: n === nState ? "#0a0c10" : G.txt,
            border: `1px solid ${n === nState ? G.gold : G.ax}`,
            borderRadius: 4, padding: "2px 10px", cursor: "pointer", fontFamily: "'IBM Plex Mono'", fontWeight: n === nState ? 600 : 400
          }}>{n}</button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Hamiltonian decomposition into kinetic and potential energy</title>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Hamiltonian Decomposition: H*psi = KE*psi + V*psi"}
        </text>
        {/* Well walls */}
        <line x1={ox} y1={oy + plotH * 0.4} x2={ox} y2={oy - plotH} stroke={G.ltxt} strokeWidth="2" />
        <line x1={ox + plotW} y1={oy + plotH * 0.4} x2={ox + plotW} y2={oy - plotH} stroke={G.ltxt} strokeWidth="2" />
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,3" />
        {/* psi */}
        <path d={makePath(psiVal, scale)} fill="none" stroke={G.blue} strokeWidth="2" />
        {/* KE contribution */}
        <path d={makePath(keVal, scale)} fill="none" stroke={G.red} strokeWidth="1.8" strokeDasharray="6,3" />
        {/* H*psi = E_n * psi (same shape as psi, scaled by n^2) */}
        <path d={makePath(hPsiVal, scale)} fill="none" stroke={G.gold} strokeWidth="2" strokeDasharray="2,2" />
        {/* x-axis labels */}
        <text x={ox} y={oy + plotH * 0.4 + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + plotW} y={oy + plotH * 0.4 + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        {/* Legend */}
        <line x1={ox} y1={h - 8} x2={ox + 20} y2={h - 8} stroke={G.blue} strokeWidth="2" />
        <text x={ox + 24} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">psi_n(x)</text>
        <line x1={ox + 100} y1={h - 8} x2={ox + 120} y2={h - 8} stroke={G.red} strokeWidth="1.8" strokeDasharray="6,3" />
        <text x={ox + 124} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">KE term (curvature)</text>
        <line x1={ox + 270} y1={h - 8} x2={ox + 290} y2={h - 8} stroke={G.gold} strokeWidth="2" strokeDasharray="2,2" />
        <text x={ox + 294} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">H*psi = E_n*psi</text>
        {/* Note */}
        <text x={w / 2} y={h - 20} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"V = 0 inside well, so H*psi = KE*psi. Note: H*psi = n^2 * psi (same shape!)"}
        </text>
      </svg>
    </div>
  );
}

function TimeEvolutionStepper({ mid = "" }) {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef(null);
  const lastRef = useRef(0);
  const maxSteps = 200;

  useEffect(() => {
    if (!playing) { rafRef.current && cancelAnimationFrame(rafRef.current); return; }
    const tick = (ts) => {
      if (lastRef.current) {
        const dt = (ts - lastRef.current) * 0.06;
        setStep(s => { const ns = s + dt; return ns >= maxSteps ? 0 : ns; });
      }
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { rafRef.current && cancelAnimationFrame(rafRef.current); lastRef.current = 0; };
  }, [playing]);

  const w = 500, h = 260, ox = 55, oy = 140, plotW = 380, plotH = 100;
  const N = 150;
  const t = step * 0.05;
  // Superposition of n=1 and n=2 in infinite well
  const c = 1 / Math.sqrt(2);
  const omega1 = 1, omega2 = 4;

  const reVal = (xN) => c * (Math.sin(Math.PI * xN) * Math.cos(omega1 * t) + Math.sin(2 * Math.PI * xN) * Math.cos(omega2 * t));
  const imVal = (xN) => c * (-Math.sin(Math.PI * xN) * Math.sin(omega1 * t) - Math.sin(2 * Math.PI * xN) * Math.sin(omega2 * t));

  // dpsi/dt = -(i/hbar)*H*psi. For visualization, dpsi_re/dt proportional to H*psi_im, dpsi_im/dt proportional to -H*psi_re
  // H*psi_re = c*(1*sin(pi*x)*cos(w1*t) + 4*sin(2*pi*x)*cos(w2*t)) [En proportional to n^2]
  const dReVal = (xN) => {
    const hIm = c * (-1 * Math.sin(Math.PI * xN) * Math.sin(omega1 * t) - 4 * Math.sin(2 * Math.PI * xN) * Math.sin(omega2 * t));
    return hIm; // proportional to dpsi_re/dt
  };

  const makePath = (fn, sc) => {
    let d = "";
    for (let i = 0; i <= N; i++) {
      const xN = i / N;
      const x = ox + xN * plotW;
      const y = oy - fn(xN) * sc;
      d += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    }
    return d;
  };

  // Arrows showing dpsi/dt at sampled points
  const arrows = [];
  const arrowScale = 8;
  for (let i = 1; i < 10; i++) {
    const xN = i / 10;
    const x = ox + xN * plotW;
    const yRe = oy - reVal(xN) * plotH * 0.85;
    const dy = -dReVal(xN) * arrowScale;
    if (Math.abs(dy) > 0.5) {
      arrows.push(<line key={i} x1={x} y1={yRe} x2={x} y2={yRe + dy} stroke={G.grn} strokeWidth="1.5" markerEnd={`url(#ah-tes${mid})`} />);
    }
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn" onClick={() => setPlaying(p => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button className="ctrl-btn" onClick={() => { setStep(s => Math.min(s + 1, maxSteps)); }}>
          Step
        </button>
        <button className="ctrl-btn" onClick={() => { setStep(0); lastRef.current = 0; }}>
          Reset
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Time evolution stepper showing wavefunction phase rotation</title>
        <defs>
          <marker id={`ah-tes${mid}`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
            <path d="M0,0 L5,2.5 L0,5" fill="none" stroke={G.grn} strokeWidth="1" />
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Time Evolution: psi = (psi_1 + psi_2)/sqrt(2)"}
        </text>
        <text x={w / 2} y="28" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"Green arrows show d(Re psi)/dt at sampled points"}
        </text>
        {/* Well walls */}
        <line x1={ox} y1={oy + plotH * 0.85} x2={ox} y2={oy - plotH * 0.95} stroke={G.ltxt} strokeWidth="2" />
        <line x1={ox + plotW} y1={oy + plotH * 0.85} x2={ox + plotW} y2={oy - plotH * 0.95} stroke={G.ltxt} strokeWidth="2" />
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,3" />
        {/* Wavefunction */}
        <path d={makePath(reVal, plotH * 0.85)} fill="none" stroke={G.blue} strokeWidth="2" />
        <path d={makePath(imVal, plotH * 0.85)} fill="none" stroke={G.red} strokeWidth="1.2" strokeDasharray="4,3" />
        {/* Arrows */}
        {arrows}
        {/* x-axis */}
        <text x={ox} y={oy + plotH * 0.85 + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + plotW} y={oy + plotH * 0.85 + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        {/* Legend */}
        <line x1={ox} y1={h - 8} x2={ox + 20} y2={h - 8} stroke={G.blue} strokeWidth="2" />
        <text x={ox + 24} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Re(psi)</text>
        <line x1={ox + 90} y1={h - 8} x2={ox + 110} y2={h - 8} stroke={G.red} strokeWidth="1.2" strokeDasharray="4,3" />
        <text x={ox + 114} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Im(psi)</text>
        <line x1={ox + 180} y1={h - 8} x2={ox + 200} y2={h - 8} stroke={G.grn} strokeWidth="1.5" />
        <text x={ox + 204} y={h - 5} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">d(Re psi)/dt</text>
      </svg>
    </div>
  );
}

function InfiniteWell2D({ mid = "" }) {
  const [nx, setNx] = useState(1);
  const [ny, setNy] = useState(1);
  const canvasRef = useRef(null);
  const gridSize = 100;

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const sz = gridSize;
    const imgData = ctx.createImageData(sz, sz);
    let maxVal = 0;
    const vals = new Float64Array(sz * sz);
    for (let iy = 0; iy < sz; iy++) {
      for (let ix = 0; ix < sz; ix++) {
        const xN = (ix + 0.5) / sz;
        const yN = (iy + 0.5) / sz;
        const val = Math.pow(Math.sin(nx * Math.PI * xN) * Math.sin(ny * Math.PI * yN), 2);
        vals[iy * sz + ix] = val;
        if (val > maxVal) maxVal = val;
      }
    }
    // Gold-to-dark colormap
    for (let i = 0; i < sz * sz; i++) {
      const t = vals[i] / (maxVal || 1);
      const idx = i * 4;
      imgData.data[idx] = Math.round(10 + t * 190);     // R
      imgData.data[idx + 1] = Math.round(10 + t * 154);  // G
      imgData.data[idx + 2] = Math.round(15 + t * 75);   // B
      imgData.data[idx + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }, [nx, ny]);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span style={{ color: G.gold, fontSize: 11, fontFamily: "'IBM Plex Mono'", fontWeight: 600 }}>
          {"2D Infinite Well: |psi(x,y)|^2 = (4/a^2) sin^2(nx*pi*x/a) sin^2(ny*pi*y/a)"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <label style={{ color: G.txt }}>n_x =</label>
        <input type="range" min="1" max="6" step="1" value={nx} onChange={e => setNx(parseInt(e.target.value))} style={{ width: 80, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 16 }}>{nx}</span>
        <label style={{ color: G.txt, marginLeft: 12 }}>n_y =</label>
        <input type="range" min="1" max="6" step="1" value={ny} onChange={e => setNy(parseInt(e.target.value))} style={{ width: 80, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 16 }}>{ny}</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-block", position: "relative" }}>
          <canvas ref={canvasRef} width={gridSize} height={gridSize}
            style={{ width: 250, height: 250, imageRendering: "pixelated", border: `1px solid ${G.ax}`, borderRadius: 4, display: "block" }} />
          {/* Axis labels */}
          <span style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", color: G.txt, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}>x</span>
          <span style={{ position: "absolute", top: "50%", left: -16, transform: "translateY(-50%) rotate(-90deg)", color: G.txt, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}>y</span>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 10, color: G.txt, fontSize: 10, fontFamily: "'IBM Plex Mono'" }}>
        {`Nodes: ${nx - 1} in x, ${ny - 1} in y | E = (${nx}^2 + ${ny}^2) * E_1 = ${nx * nx + ny * ny} * E_1`}
      </div>
    </div>
  );
}

// ─── Interactive Components ───

function WellWidthExplorer({ mid = "" }) {
  const [wellWidth, setWellWidth] = useState(1.0);
  const w = 420, h = 300, ox = 80, oy = 270, plotH = 230;
  const nMax = 4;
  const a_m = wellWidth * 1e-9;
  const me = 9.109e-31;
  const hbar = 1.055e-34;
  const E1_J = (Math.PI * Math.PI * hbar * hbar) / (2 * me * a_m * a_m);
  const E1_eV = E1_J / 1.602e-19;
  const EnMax = nMax * nMax * E1_eV;
  const yScale = plotH / (EnMax * 1.15);
  const lineW = 180;
  const colors = [G.gold, G.blue, G.red, G.grn];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <label style={{ color: G.txt }}>Well width a =</label>
        <input type="range" min="0.2" max="3.0" step="0.05" value={wellWidth}
          onChange={e => setWellWidth(parseFloat(e.target.value))}
          style={{ width: 140, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 50 }}>{wellWidth.toFixed(2)} nm</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Energy levels versus well width for infinite potential well</title>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Energy Levels vs Well Width"}
        </text>
        <line x1={ox - 10} y1={oy} x2={ox - 10} y2={20} stroke={G.ax} strokeWidth="1"/>
        <text x={ox - 25} y={18} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E (eV)</text>
        {Array.from({ length: nMax }, (_, i) => i + 1).map(n => {
          const En = n * n * E1_eV;
          const y = oy - En * yScale;
          return (
            <g key={n}>
              <line x1={ox} y1={y} x2={ox + lineW} y2={y} stroke={colors[(n - 1) % colors.length]} strokeWidth="2.5"/>
              <text x={ox + lineW + 8} y={y + 4} fill={colors[(n - 1) % colors.length]} fontSize="10" fontFamily="'IBM Plex Mono'">
                n={n}: {En.toFixed(2)} eV
              </text>
            </g>
          );
        })}
        <line x1={ox} y1={oy} x2={ox + lineW} y2={oy} stroke={G.ax} strokeWidth="1" strokeDasharray="4,3"/>
        <text x={ox - 16} y={oy + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">0</text>
        <text x={ox + lineW / 2} y={oy + 18} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"E_1 = " + E1_eV.toFixed(2) + " eV   |   E_1 scales as 1/a^2"}
        </text>
      </svg>
    </div>
  );
}

function ClassicalQuantumComparison({ mid = "" }) {
  const [n, setN] = useState(1);
  const w = 500, h = 260, ox = 60, oy = 230, plotW = 360, plotH = 190;
  const yMax = 2.5;
  const yScale = plotH / yMax;

  let quantumD = "";
  for (let i = 0; i <= 200; i++) {
    const xNorm = i / 200;
    const x = ox + xNorm * plotW;
    const val = 2.0 * Math.pow(Math.sin(n * Math.PI * xNorm), 2);
    const y = oy - Math.min(val, yMax) * yScale;
    quantumD += (i === 0 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
  }

  // Classical probability: uniform 1/a (normalized val = 1.0 in our units)
  const classicalY = oy - 1.0 * yScale;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <label style={{ color: G.txt }}>Quantum number n =</label>
        <input type="range" min="1" max="20" step="1" value={n}
          onChange={e => setN(parseInt(e.target.value))}
          style={{ width: 140, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 30 }}>{n}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Quantum versus classical probability distribution comparison</title>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"Quantum vs Classical Probability (Correspondence Principle)"}
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 20} y2={oy} stroke={G.ax} strokeWidth="1"/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1"/>
        {/* Classical uniform distribution */}
        <line x1={ox} y1={classicalY} x2={ox + plotW} y2={classicalY} stroke={G.red} strokeWidth="2" strokeDasharray="6,4"/>
        {/* Quantum probability density */}
        <path d={quantumD} fill="none" stroke={G.blue} strokeWidth="2"/>
        {/* Legend */}
        <line x1={ox + plotW - 120} y1={28} x2={ox + plotW - 100} y2={28} stroke={G.blue} strokeWidth="2"/>
        <text x={ox + plotW - 96} y={32} fill={G.blue} fontSize="10" fontFamily="'IBM Plex Mono'">Quantum</text>
        <line x1={ox + plotW - 120} y1={42} x2={ox + plotW - 100} y2={42} stroke={G.red} strokeWidth="2" strokeDasharray="6,4"/>
        <text x={ox + plotW - 96} y={46} fill={G.red} fontSize="10" fontFamily="'IBM Plex Mono'">Classical</text>
        {/* Labels */}
        <text x={ox} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + plotW} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        <text x={ox + plotW / 2} y={oy + 28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">x</text>
        <text x={ox - 8} y={classicalY + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">1/a</text>
      </svg>
      <p style={{ textAlign: "center", fontSize: 11, color: G.txt, fontFamily: "'IBM Plex Mono', monospace", margin: "8px 0 0" }}>
        {n >= 10 ? "At large n, the quantum probability oscillates rapidly and averages to the classical uniform distribution." : n >= 5 ? "The oscillations are becoming faster. The average approaches 1/a." : "At low n, the quantum distribution is clearly non-uniform. Try increasing n."}
      </p>
    </div>
  );
}

function StandingWaveAnimation({ mid = "" }) {
  const [playing, setPlaying] = useState(false);
  const [freq, setFreq] = useState(1.0);
  const phaseRef = useRef(0);
  const frameRef = useRef(null);
  const svgRef = useRef(null);
  const lastTimeRef = useRef(null);

  const w = 600, h = 250, ox = 40, oy = 125, plotW = 520, amp = 45;
  const nPoints = 200;

  const drawFrame = useCallback((timestamp) => {
    if (!svgRef.current) return;
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    phaseRef.current += 2 * Math.PI * freq * dt;

    const phi = phaseRef.current;
    let dRight = "", dLeft = "", dStanding = "";
    const nodeXs = [];
    const antinodeXs = [];
    const k = 4 * Math.PI / plotW;

    for (let i = 0; i <= nPoints; i++) {
      const xNorm = i / nPoints;
      const xPx = ox + xNorm * plotW;
      const xVal = xNorm * plotW;
      const yRight = -amp * 0.4 * Math.sin(k * xVal - phi);
      const yLeft = -amp * 0.4 * Math.sin(k * xVal + phi);
      const yStand = -amp * 0.8 * Math.cos(k * xVal) * Math.cos(phi);
      dRight += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + yRight).toFixed(1);
      dLeft += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + yLeft).toFixed(1);
      dStanding += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + yStand).toFixed(1);
    }

    // Find nodes: cos(k*x) = 0 => k*x = pi/2 + m*pi
    for (let m = 0; m < 20; m++) {
      const xVal = (Math.PI / 2 + m * Math.PI) / k;
      if (xVal >= 0 && xVal <= plotW) nodeXs.push(ox + xVal);
    }
    // Find antinodes: cos(k*x) = +-1 => k*x = m*pi
    for (let m = 0; m <= 20; m++) {
      const xVal = (m * Math.PI) / k;
      if (xVal >= 0 && xVal <= plotW) antinodeXs.push(ox + xVal);
    }

    const svg = svgRef.current;
    const pathRight = svg.querySelector(`[data-id="right${mid}"]`);
    const pathLeft = svg.querySelector(`[data-id="left${mid}"]`);
    const pathStand = svg.querySelector(`[data-id="stand${mid}"]`);
    const nodesG = svg.querySelector(`[data-id="nodes${mid}"]`);
    const antinodesG = svg.querySelector(`[data-id="antinodes${mid}"]`);

    if (pathRight) pathRight.setAttribute("d", dRight);
    if (pathLeft) pathLeft.setAttribute("d", dLeft);
    if (pathStand) pathStand.setAttribute("d", dStanding);

    if (nodesG) {
      nodesG.innerHTML = "";
      nodeXs.forEach(nx => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", nx.toFixed(1));
        c.setAttribute("cy", oy);
        c.setAttribute("r", "4");
        c.setAttribute("fill", G.red);
        c.setAttribute("opacity", "0.8");
        nodesG.appendChild(c);
        if (nodeXs.indexOf(nx) === 0) {
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", nx.toFixed(1));
          t.setAttribute("y", (oy + 16).toString());
          t.setAttribute("fill", G.red);
          t.setAttribute("font-size", "9");
          t.setAttribute("font-family", "'IBM Plex Mono'");
          t.setAttribute("text-anchor", "middle");
          t.textContent = "nodes";
          nodesG.appendChild(t);
        }
      });
    }
    if (antinodesG) {
      antinodesG.innerHTML = "";
      antinodeXs.forEach(ax => {
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", ax.toFixed(1));
        c.setAttribute("cy", oy);
        c.setAttribute("r", "4");
        c.setAttribute("fill", G.grn);
        c.setAttribute("opacity", "0.8");
        antinodesG.appendChild(c);
        if (antinodeXs.indexOf(ax) === 0) {
          const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
          t.setAttribute("x", ax.toFixed(1));
          t.setAttribute("y", (oy - 12).toString());
          t.setAttribute("fill", G.grn);
          t.setAttribute("font-size", "9");
          t.setAttribute("font-family", "'IBM Plex Mono'");
          t.setAttribute("text-anchor", "middle");
          t.textContent = "antinodes";
          nodesG.appendChild(t);
        }
      });
    }

    frameRef.current = requestAnimationFrame(drawFrame);
  }, [freq, mid]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      frameRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing, drawFrame]);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn"
          onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}
        >{playing ? "Pause" : "Play"}</button>
        <label style={{ color: G.txt }}>Freq:</label>
        <input type="range" min="0.5" max="3.0" step="0.1" value={freq}
          onClick={e => e.stopPropagation()}
          onChange={e => setFreq(parseFloat(e.target.value))}
          style={{ width: 100, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 45 }}>{freq.toFixed(1)} Hz</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Standing wave formed by superposition of traveling waves</title>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Standing Wave = Right-traveling + Left-traveling
        </text>
        {/* Axis */}
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3"/>
        {/* Wave paths */}
        <path data-id={`right${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.blue} strokeWidth="1.2" opacity="0.5"/>
        <path data-id={`left${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.red} strokeWidth="1.2" opacity="0.5"/>
        <path data-id={`stand${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Node/antinode groups */}
        <g data-id={`nodes${mid}`}/>
        <g data-id={`antinodes${mid}`}/>
        {/* Legend */}
        <line x1={ox} y1={h - 10} x2={ox + 16} y2={h - 10} stroke={G.blue} strokeWidth="1.5" opacity="0.5"/>
        <text x={ox + 20} y={h - 6} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Right-traveling</text>
        <line x1={ox + 120} y1={h - 10} x2={ox + 136} y2={h - 10} stroke={G.red} strokeWidth="1.5" opacity="0.5"/>
        <text x={ox + 140} y={h - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">Left-traveling</text>
        <line x1={ox + 240} y1={h - 10} x2={ox + 256} y2={h - 10} stroke={G.gold} strokeWidth="2.5"/>
        <text x={ox + 260} y={h - 6} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">Standing wave</text>
        <circle cx={ox + 360} cy={h - 10} r="3" fill={G.red} opacity="0.8"/>
        <text x={ox + 366} y={h - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">Node</text>
        <circle cx={ox + 410} cy={h - 10} r="3" fill={G.grn} opacity="0.8"/>
        <text x={ox + 416} y={h - 6} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">Antinode</text>
      </svg>
    </div>
  );
}

function PlaneWaveExplorer({ mid = "" }) {
  const [playing, setPlaying] = useState(false);
  const [k, setK] = useState(3.0);
  const [omega, setOmega] = useState(3.0);
  const [amp, setAmp] = useState(1.0);
  const [phi0, setPhi0] = useState(0);
  const phaseRef = useRef(0);
  const frameRef = useRef(null);
  const svgRef = useRef(null);
  const lastTimeRef = useRef(null);

  const w = 600, h = 200, ox = 50, oy = 100, plotW = 500, plotAmp = 65;
  const nPoints = 300;

  const drawFrame = useCallback((timestamp) => {
    if (!svgRef.current) return;
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    phaseRef.current += omega * dt;

    const svg = svgRef.current;
    const wavePath = svg.querySelector(`[data-id="pw${mid}"]`);
    const envTop = svg.querySelector(`[data-id="envt${mid}"]`);
    const envBot = svg.querySelector(`[data-id="envb${mid}"]`);
    const marker = svg.querySelector(`[data-id="mk${mid}"]`);
    const markerDot = svg.querySelector(`[data-id="mkd${mid}"]`);
    if (!wavePath) return;

    const t = phaseRef.current;
    let d = "";
    for (let i = 0; i <= nPoints; i++) {
      const xNorm = i / nPoints;
      const xPx = ox + xNorm * plotW;
      const z = xNorm * 4 * Math.PI;
      const y = -amp * plotAmp * Math.cos(k * z - t + phi0);
      d += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + y).toFixed(1);
    }
    wavePath.setAttribute("d", d);

    if (envTop && envBot) {
      envTop.setAttribute("y1", oy - amp * plotAmp);
      envTop.setAttribute("y2", oy - amp * plotAmp);
      envBot.setAttribute("y1", oy + amp * plotAmp);
      envBot.setAttribute("y2", oy + amp * plotAmp);
    }

    // wavelength marker
    const lambda = k > 0.3 ? 2 * Math.PI / k : plotW;
    const lambdaPx = Math.min((lambda / (4 * Math.PI)) * plotW, plotW);
    if (marker) {
      marker.setAttribute("x1", ox);
      marker.setAttribute("x2", ox + lambdaPx);
    }
    if (markerDot) {
      markerDot.setAttribute("x", (ox + lambdaPx / 2).toFixed(1));
    }

    frameRef.current = requestAnimationFrame(drawFrame);
  }, [k, omega, amp, phi0, mid]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      frameRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing, drawFrame]);

  // Draw static frame when paused and params change
  useEffect(() => {
    if (playing || !svgRef.current) return;
    const svg = svgRef.current;
    const wavePath = svg.querySelector(`[data-id="pw${mid}"]`);
    const envTop = svg.querySelector(`[data-id="envt${mid}"]`);
    const envBot = svg.querySelector(`[data-id="envb${mid}"]`);
    const marker = svg.querySelector(`[data-id="mk${mid}"]`);
    const markerDot = svg.querySelector(`[data-id="mkd${mid}"]`);
    if (!wavePath) return;
    const t = phaseRef.current;
    let d = "";
    for (let i = 0; i <= nPoints; i++) {
      const xNorm = i / nPoints;
      const xPx = ox + xNorm * plotW;
      const z = xNorm * 4 * Math.PI;
      const y = -amp * plotAmp * Math.cos(k * z - t + phi0);
      d += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + y).toFixed(1);
    }
    wavePath.setAttribute("d", d);
    if (envTop && envBot) {
      envTop.setAttribute("y1", oy - amp * plotAmp);
      envTop.setAttribute("y2", oy - amp * plotAmp);
      envBot.setAttribute("y1", oy + amp * plotAmp);
      envBot.setAttribute("y2", oy + amp * plotAmp);
    }
    const lambda = k > 0.3 ? 2 * Math.PI / k : plotW;
    const lambdaPx = Math.min((lambda / (4 * Math.PI)) * plotW, plotW);
    if (marker) { marker.setAttribute("x1", ox); marker.setAttribute("x2", ox + lambdaPx); }
    if (markerDot) markerDot.setAttribute("x", (ox + lambdaPx / 2).toFixed(1));
  }, [k, omega, amp, phi0, playing, mid]);

  const c_eff = k > 0.01 ? (omega / k).toFixed(2) : "—";
  const lambda_val = k > 0.01 ? (2 * Math.PI / k).toFixed(2) : "—";
  const T_val = omega > 0.01 ? (2 * Math.PI / omega).toFixed(2) : "—";

  const sliderRow = { display: "flex", alignItems: "center", gap: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 };
  const sliderLabel = { color: G.txt, minWidth: 28, textAlign: "right" };
  const sliderVal = { color: G.gold, fontWeight: 600, minWidth: 55 };

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 8, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn"
          onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}
        >{playing ? "Pause" : "Play"}</button>
        <button
          onClick={e => { e.stopPropagation(); phaseRef.current = 0; if (!playing && svgRef.current) { const wp = svgRef.current.querySelector(`[data-id="pw${mid}"]`); if (wp) { let d2 = ""; for (let i = 0; i <= nPoints; i++) { const xN = i / nPoints; const xP = ox + xN * plotW; const z2 = xN * 4 * Math.PI; const y2 = -amp * plotAmp * Math.cos(k * z2 + phi0); d2 += (i === 0 ? "M" : " L") + xP.toFixed(1) + "," + (oy + y2).toFixed(1); } wp.setAttribute("d", d2); } } }}
          style={{ background: G.ax, color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
        >Reset</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 24px", marginBottom: 8 }}>
        <div style={sliderRow}>
          <span style={sliderLabel}>k</span>
          <input type="range" min="0.5" max="8" step="0.1" value={k} onClick={e => e.stopPropagation()} onChange={e => setK(parseFloat(e.target.value))} style={{ width: 90, accentColor: G.gold }} />
          <span style={sliderVal}>{k.toFixed(1)} rad/m</span>
        </div>
        <div style={sliderRow}>
          <span style={sliderLabel}>{"\u03C9"}</span>
          <input type="range" min="0.5" max="8" step="0.1" value={omega} onClick={e => e.stopPropagation()} onChange={e => setOmega(parseFloat(e.target.value))} style={{ width: 90, accentColor: G.blue }} />
          <span style={{ ...sliderVal, color: G.blue }}>{omega.toFixed(1)} rad/s</span>
        </div>
        <div style={sliderRow}>
          <span style={sliderLabel}>E₀</span>
          <input type="range" min="0.1" max="1.0" step="0.05" value={amp} onClick={e => e.stopPropagation()} onChange={e => setAmp(parseFloat(e.target.value))} style={{ width: 90, accentColor: G.gold }} />
          <span style={sliderVal}>{amp.toFixed(2)}</span>
        </div>
        <div style={sliderRow}>
          <span style={sliderLabel}>{"\u03C6\u2080"}</span>
          <input type="range" min="0" max={2 * Math.PI} step="0.1" value={phi0} onClick={e => e.stopPropagation()} onChange={e => setPhi0(parseFloat(e.target.value))} style={{ width: 90, accentColor: G.gold }} />
          <span style={sliderVal}>{phi0.toFixed(1)} rad</span>
        </div>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Plane wave explorer with adjustable wavenumber, frequency, and amplitude</title>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3"/>
        <line x1={ox} y1={oy - plotAmp - 10} x2={ox} y2={oy + plotAmp + 10} stroke={G.ax} strokeWidth="0.5"/>
        <text x={ox + plotW + 5} y={oy + 4} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="start">z</text>
        <text x={ox - 5} y={oy - plotAmp - 12} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">E</text>
        {/* Amplitude envelope */}
        <line data-id={`envt${mid}`} x1={ox} y1={oy - amp * plotAmp} x2={ox + plotW} y2={oy - amp * plotAmp} stroke={G.txt} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4"/>
        <line data-id={`envb${mid}`} x1={ox} y1={oy + amp * plotAmp} x2={ox + plotW} y2={oy + amp * plotAmp} stroke={G.txt} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.4"/>
        {/* Wavelength marker */}
        <line data-id={`mk${mid}`} x1={ox} y1={h - 14} x2={ox + 80} y2={h - 14} stroke={G.gold} strokeWidth="2"/>
        <text data-id={`mkd${mid}`} x={ox + 40} y={h - 4} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"\u03BB"}</text>
        {/* Wave path */}
        <path data-id={`pw${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.gold} strokeWidth="2"/>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: G.txt, marginTop: 4, flexWrap: "wrap" }}>
        <span>{"\u03BB"} = {lambda_val}</span>
        <span>T = {T_val}</span>
        <span>c = {"\u03C9"}/k = {c_eff}</span>
        <span style={{ color: Math.abs(omega / k - 1) > 0.02 ? G.red : G.grn, fontWeight: 600 }}>
          {Math.abs(omega / k - 1) < 0.02 ? "\u03C9 = kc  \u2713" : "\u03C9 \u2260 kc"}
        </span>
      </div>
    </div>
  );
}

function CurvaturePropagationAnimation({ mid = "" }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const phaseRef = useRef(0);
  const frameRef = useRef(null);
  const svgRef = useRef(null);
  const lastTimeRef = useRef(null);

  const w = 600, h = 280, ox = 40, oy = 140, plotW = 520, amp = 50;
  const nPoints = 200;
  const k = 2 * Math.PI / (plotW * 0.6);
  const nArrows = 15;

  const drawFrame = useCallback((timestamp) => {
    if (!svgRef.current) return;
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    phaseRef.current += 2 * Math.PI * speed * dt;

    const phi = phaseRef.current;
    const svg = svgRef.current;

    // Draw wave
    let dWave = "";
    for (let i = 0; i <= nPoints; i++) {
      const xNorm = i / nPoints;
      const xPx = ox + xNorm * plotW;
      const xVal = xNorm * plotW;
      const yVal = -amp * Math.sin(k * xVal - phi);
      dWave += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + (oy + yVal).toFixed(1);
    }

    const wavePath = svg.querySelector(`[data-id="cwave${mid}"]`);
    if (wavePath) wavePath.setAttribute("d", dWave);

    // Draw curvature shading and acceleration arrows
    const arrowsG = svg.querySelector(`[data-id="carrows${mid}"]`);
    const shadingG = svg.querySelector(`[data-id="cshading${mid}"]`);
    if (arrowsG) arrowsG.innerHTML = "";
    if (shadingG) shadingG.innerHTML = "";

    for (let i = 0; i < nArrows; i++) {
      const xNorm = (i + 1) / (nArrows + 1);
      const xPx = ox + xNorm * plotW;
      const xVal = xNorm * plotW;
      const u = Math.sin(k * xVal - phi);
      const curvature = -k * k * Math.sin(k * xVal - phi); // d^2u/dx^2
      const yPx = oy - amp * u;

      // Arrow showing acceleration direction (proportional to curvature)
      const arrowLen = curvature * amp * 0.35 / (k * k);
      if (Math.abs(arrowLen) > 2) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", xPx.toFixed(1));
        line.setAttribute("y1", yPx.toFixed(1));
        line.setAttribute("x2", xPx.toFixed(1));
        line.setAttribute("y2", (yPx - arrowLen).toFixed(1));
        line.setAttribute("stroke", arrowLen > 0 ? G.grn : G.red);
        line.setAttribute("stroke-width", "2");
        line.setAttribute("marker-end", arrowLen > 0 ? `url(#aup${mid})` : `url(#adn${mid})`);
        arrowsG.appendChild(line);
      } else {
        // Inflection point marker
        const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        c.setAttribute("cx", xPx.toFixed(1));
        c.setAttribute("cy", yPx.toFixed(1));
        c.setAttribute("r", "3");
        c.setAttribute("fill", G.orange);
        c.setAttribute("opacity", "0.8");
        arrowsG.appendChild(c);
      }
    }

    frameRef.current = requestAnimationFrame(drawFrame);
  }, [speed, mid]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      frameRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing, drawFrame]);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn"
          onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}
        >{playing ? "Pause" : "Play"}</button>
        <label style={{ color: G.txt }}>Speed:</label>
        <input type="range" min="0.3" max="2.5" step="0.1" value={speed}
          onClick={e => e.stopPropagation()}
          onChange={e => setSpeed(parseFloat(e.target.value))}
          style={{ width: 100, accentColor: G.gold }} />
        <span style={{ color: G.gold, fontWeight: 600, minWidth: 45 }}>{speed.toFixed(1)}x</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Wave curvature and acceleration driving propagation</title>
        <defs>
          <marker id={`aup${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.grn} strokeWidth="1.2"/>
          </marker>
          <marker id={`adn${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.red} strokeWidth="1.2"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Curvature Drives Propagation
        </text>
        {/* Equilibrium axis */}
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3"/>
        {/* Wave path */}
        <path data-id={`cwave${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.gold} strokeWidth="2.2"/>
        {/* Arrow and shading groups */}
        <g data-id={`cshading${mid}`}/>
        <g data-id={`carrows${mid}`}/>
        {/* Legend */}
        <line x1={ox} y1={h - 30} x2={ox + 12} y2={h - 38} stroke={G.grn} strokeWidth="2"/>
        <text x={ox + 16} y={h - 30} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">Accel up (trough, concave up)</text>
        <line x1={ox + 220} y1={h - 38} x2={ox + 232} y2={h - 30} stroke={G.red} strokeWidth="2"/>
        <text x={ox + 236} y={h - 30} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">Accel down (peak, concave down)</text>
        <circle cx={ox + 455} cy={h - 34} r="3" fill={G.orange} opacity="0.8"/>
        <text x={ox + 462} y={h - 30} fill={G.orange} fontSize="9" fontFamily="'IBM Plex Mono'">Zero accel</text>
        <text x={w / 2} y={h - 10} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Each point accelerates toward its neighbors; this cascade shifts the wave forward at speed c
        </text>
      </svg>
    </div>
  );
}

function TimeEvolvingWavefunction({ mid = "" }) {
  const [playing, setPlaying] = useState(false);
  const [theta, setTheta] = useState(0.5);
  const phaseRef = useRef(0);
  const frameRef = useRef(null);
  const svgRef = useRef(null);
  const lastTimeRef = useRef(null);

  const w = 600, h = 250, ox = 50, oy = 220, plotW = 500, plotH = 180;
  const nPoints = 200;
  // E1 and E2 in arbitrary units; omega_beat = (E2-E1)/hbar
  // E_n proportional to n^2, so E2/E1 = 4. Use omega1 = 1, omega2 = 4.
  const omega1 = 1.0;
  const omega2 = 4.0;

  const drawFrame = useCallback((timestamp) => {
    if (!svgRef.current) return;
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const dt = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;
    phaseRef.current += dt;

    const t = phaseRef.current;
    const c1 = Math.cos(theta);
    const c2 = Math.sin(theta);

    let dPath = "";
    let maxVal = 0;
    const vals = [];

    for (let i = 0; i <= nPoints; i++) {
      const xNorm = i / nPoints;
      // psi_1 = sin(pi*x/a), psi_2 = sin(2*pi*x/a)
      const psi1 = Math.sin(Math.PI * xNorm);
      const psi2 = Math.sin(2 * Math.PI * xNorm);
      // Psi(x,t) = c1*psi1*e^{-iE1t} + c2*psi2*e^{-iE2t}
      const realPart = c1 * psi1 * Math.cos(omega1 * t) + c2 * psi2 * Math.cos(omega2 * t);
      const imagPart = -(c1 * psi1 * Math.sin(omega1 * t) + c2 * psi2 * Math.sin(omega2 * t));
      const probDensity = realPart * realPart + imagPart * imagPart;
      vals.push(probDensity);
      if (probDensity > maxVal) maxVal = probDensity;
    }

    // Scale to fit plot
    const scale = maxVal > 0 ? plotH / (maxVal * 1.15) : 1;
    for (let i = 0; i <= nPoints; i++) {
      const xPx = ox + (i / nPoints) * plotW;
      const yPx = oy - vals[i] * scale;
      dPath += (i === 0 ? "M" : " L") + xPx.toFixed(1) + "," + yPx.toFixed(1);
    }

    const pathEl = svgRef.current.querySelector(`[data-id="prob${mid}"]`);
    if (pathEl) pathEl.setAttribute("d", dPath);

    // Fill area
    const fillEl = svgRef.current.querySelector(`[data-id="fill${mid}"]`);
    if (fillEl) {
      fillEl.setAttribute("d", dPath + ` L${(ox + plotW).toFixed(1)},${oy} L${ox},${oy} Z`);
    }

    frameRef.current = requestAnimationFrame(drawFrame);
  }, [theta, mid]);

  useEffect(() => {
    if (playing) {
      lastTimeRef.current = null;
      frameRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      // Draw one static frame
      drawFrame(performance.now());
    }
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing, drawFrame]);

  const c1 = Math.cos(theta);
  const c2 = Math.sin(theta);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 10, flexWrap: "wrap", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
        <button className="ctrl-btn"
          onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}
        >{playing ? "Pause" : "Play"}</button>
        <label style={{ color: G.txt }}>Mixing angle:</label>
        <input type="range" min="0" max="1.5707963" step="0.01" value={theta}
          onClick={e => e.stopPropagation()}
          onChange={e => setTheta(parseFloat(e.target.value))}
          style={{ width: 100, accentColor: G.gold }} />
        <span style={{ color: G.blue, fontWeight: 600, minWidth: 60 }}>c1={c1.toFixed(2)}</span>
        <span style={{ color: G.red, fontWeight: 600, minWidth: 60 }}>c2={c2.toFixed(2)}</span>
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Time-evolving probability density of a wavefunction superposition</title>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Time-Evolving |Psi(x,t)|^2 Superposition
        </text>
        {/* Well walls */}
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 10} stroke={G.ltxt} strokeWidth="3"/>
        <line x1={ox + plotW} y1={oy} x2={ox + plotW} y2={oy - plotH - 10} stroke={G.ltxt} strokeWidth="3"/>
        {/* Bottom */}
        <line x1={ox} y1={oy} x2={ox + plotW} y2={oy} stroke={G.ax} strokeWidth="1"/>
        {/* Probability density fill */}
        <path data-id={`fill${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy} Z`} fill={G.gold} opacity="0.15"/>
        {/* Probability density curve */}
        <path data-id={`prob${mid}`} d={`M${ox},${oy} L${ox + plotW},${oy}`} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Labels */}
        <text x={ox} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">0</text>
        <text x={ox + plotW} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">a</text>
        <text x={ox + plotW / 2} y={oy + 28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">x</text>
        <text x={ox - 8} y={oy - plotH / 2} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end" transform={`rotate(-90,${ox - 8},${oy - plotH / 2})`}>|Psi|^2</text>
      </svg>
      <p style={{ textAlign: "center", fontSize: 11, color: G.txt, fontFamily: "'IBM Plex Mono', monospace", margin: "8px 0 0" }}>
        {c2 < 0.05 ? "Pure ground state: probability density is stationary." : c1 < 0.05 ? "Pure first excited state: probability density is stationary." : "Superposition of n=1 and n=2: the probability density sloshes back and forth."}
      </p>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "wave-particle",
    tab: "Wave-Particle Duality",
    title: "1. Wave-Particle Duality",
    subtitle: "Historical context, energy quantization, de Broglie wavelength, and the photoelectric effect",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Historical Context">
          <P><b>Sir Isaac Newton</b> (17th-18th century): Proposed that light consists of <b>particles</b> (corpuscles) that bounce around and reflect from objects.</P>
          <P><b>James Clerk Maxwell</b> (19th century): Introduced Maxwell's equations, establishing that light is an <b>electromagnetic wave</b>.</P>
          <P><b>Planck and Einstein</b> (early 20th century): Showed light is both a wave and a set of particles called <b>photons</b>, establishing <b>wave-particle duality</b>.</P>
          <KeyConcept label="Wave-Particle Duality">
            Light (and all matter) exhibits both wave and particle behavior. This duality is central to quantum mechanics and cannot be explained by classical physics alone.
          </KeyConcept>

          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "double_slit_tonomura.jpg"} alt="Buildup of electron interference pattern in double-slit experiment by Tonomura, showing individual electron hits forming wave-like fringes over time" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Tonomura double-slit experiment: individual electron hits (a-e) gradually build an interference pattern, proving wave-particle duality. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0</span></figcaption>
          </figure>

          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "double_slit_diffraction_photo.jpg"} alt="Photograph of laser light diffraction through two adjacent slits showing interference fringes" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Laser light diffraction through two slits, showing the characteristic interference fringe pattern. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY 4.0</span></figcaption>
          </figure>
        </Section>

        <Section title="Energy Quantization">
          <P>Planck proposed that energy is emitted and absorbed in discrete packets called <b>quanta</b>. The energy of a photon is proportional to its frequency:</P>
          <Eq>{"E_{\\text{photon}} = h\\nu = hf = \\hbar\\omega"}</Eq>
          <P>where <M>{"h = 6.63 \\times 10^{-34}\\;\\text{J}\\cdot\\text{s}"}</M> is Planck's constant, <M>{"\\hbar = h/(2\\pi) = 1.055 \\times 10^{-34}\\;\\text{J}\\cdot\\text{s}"}</M>, and <M>{"f"}</M> (or <M>{"\\nu"}</M>) is the frequency.</P>
          <P>Photon momentum:</P>
          <Eq>{"p = \\frac{E_{\\text{photon}}}{c} = \\frac{hf}{c} = \\frac{h}{\\lambda}"}</Eq>
        </Section>

        <Section title="Photoelectric Effect">
          <P>When light shines on a metal surface, electrons are emitted. The maximum kinetic energy of the emitted electrons depends on the <b>frequency</b> (not intensity) of the light:</P>
          <Eq>{"KE_m = eV_0 = \\frac{1}{2}m_e v^2 = hf - \\Phi_{\\text{metal}}"}</Eq>
          <P>where <M>{"\\Phi_{\\text{metal}}"}</M> is the <b>work function</b> of the metal (minimum energy to liberate an electron) and <M>{"V_0"}</M> is the stopping voltage.</P>
          <KeyConcept label="Photoelectric Effect">
            Light intensity affects the number of emitted electrons (photocurrent), but the kinetic energy of each electron depends only on frequency. Below the threshold frequency, no electrons are emitted regardless of intensity. This proved light's particle nature.
          </KeyConcept>
        </Section>

        <Section title="De Broglie Wavelength">
          <P>De Broglie proposed that <b>all matter</b> has an associated wavelength, extending wave-particle duality from photons to massive particles:</P>
          <Eq>{"\\lambda = \\frac{h}{p} \\quad \\text{or equivalently} \\quad p = \\frac{h}{\\lambda}"}</Eq>
          <P>For an electron accelerated through voltage <M>{"V"}</M>: <M>{"KE = eV = p^2/(2m_e)"}</M>, giving <M>{"p = \\sqrt{2m_e eV}"}</M> and therefore:</P>
          <Eq>{"\\lambda = \\frac{h}{\\sqrt{2m_e eV}}"}</Eq>
          <KeyConcept label="Example: Electron at 100V">
            An electron accelerated by 100 V has a de Broglie wavelength of approximately 0.123 nm, comparable to interatomic distances in solids. This is why electron diffraction is observed in crystals.
          </KeyConcept>
          <P>For a macroscopic object (e.g., a 50 g golf ball at 20 m/s), the wavelength is approximately <M>{"6.63 \\times 10^{-34}\\;\\text{m}"}</M>, far too small to observe.</P>
        </Section>

        <Section title="Light as Wave: Interference">
          <P>Young's double-slit experiment proved light's wave nature through <b>interference</b>: when two waves overlap, their amplitudes add (superposition), producing bright and dark fringes.</P>
          <P>Constructive interference (bright): <M>{"S_1P - S_2P = n\\lambda"}</M></P>
          <P>Destructive interference (dark): <M>{"S_1P - S_2P = (n + \\tfrac{1}{2})\\lambda"}</M></P>
          <P>The intensity at point P is <M>{"I = \\frac{1}{2}c\\varepsilon_0 |\\vec{E}_1 + \\vec{E}_2|^2"}</M>, demonstrating that <M>{"|\\cos(x) + \\cos(y)|^2 \\neq |\\cos(x)|^2 + |\\cos(y)|^2"}</M>.</P>
          <div style={{display: "flex", flexDirection: "column", gap: "1.2rem", margin: "1.2rem 0"}}>
            <div>
              <P><b>Animation: Double-Slit Geometry</b> -- paths r1, r2 from each slit to point P, and how the path difference changes as P moves along the screen.</P>
              <video controls style={{width: "100%", maxWidth: 720, borderRadius: 8, border: "1px solid #333"}} src={VID + "DoubleSlitGeometry.mp4"} />
            </div>
            <div>
              <P><b>Animation: Wave Superposition</b> -- two waves adding constructively (phase diff = 0), destructively (phase diff = pi), and everything in between.</P>
              <video controls style={{width: "100%", maxWidth: 720, borderRadius: 8, border: "1px solid #333"}} src={VID + "WaveSuperposition.mp4"} />
            </div>
            <div>
              <P><b>Animation: Interference Pattern</b> -- expanding wavefronts from each slit and the resulting intensity distribution on the screen.</P>
              <video controls style={{width: "100%", maxWidth: 720, borderRadius: 8, border: "1px solid #333"}} src={VID + "InterferencePattern.mp4"} />
            </div>
          </div>
          <KeyConcept label="Electron Double-Slit Experiment">
            Electrons also produce interference fringes when passed through two slits, confirming that matter exhibits wave behavior. This is direct evidence of de Broglie's hypothesis.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "wave-equation",
    tab: "Wave Equation",
    title: "2. The Wave Equation",
    subtitle: "Classical wave equation, EM waves, plane wave solutions, and vector calculus review",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Classical Wave Equation">
          <P>A <b>wave</b> is a periodically repeating (in space and time) disturbance in the value of some quantity <M>{"u(x,y,z,t)"}</M>. The general wave equation is:</P>
          <Eq>{"\\nabla^2 u - \\frac{1}{c^2}\\frac{\\partial^2 u}{\\partial t^2} = 0"}</Eq>
          <P>where <M>{"c"}</M> is the wave's phase velocity (speed of propagation) and <M>{"\\nabla^2"}</M> is the Laplacian operator.</P>
          <KeyConcept label="Superposition Principle">
            The wave equation is a linear differential equation: if f(x,y,z,t) and g(x,y,z,t) are both solutions, then h(x,y,z,t) = f + g is also a solution. This is the mathematical basis of interference.
          </KeyConcept>
          <details style={{ margin: "16px 0", borderRadius: 8, border: "1px solid rgba(200,164,90,0.25)", overflow: "hidden" }}>
            <summary style={{ cursor: "pointer", padding: "10px 16px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: G.gold, background: "rgba(200,164,90,0.07)", userSelect: "none" }}>
              Why does curvature make waves propagate? (animation)
            </summary>
            <div style={{ padding: "8px 12px 4px" }}>
              <P>
                Rearranging the wave equation: <M>{"\\frac{\\partial^2 u}{\\partial t^2} = c^2 \\nabla^2 u"}</M>. The left side is the <b>temporal acceleration</b> of the displacement at a point. The right side, <M>{"\\nabla^2 u"}</M>, is the <b>spatial curvature</b> (how much that point's value differs from its neighbors).
              </P>
              <P>
                At a <b>peak</b> (concave down, <M>{"\\nabla^2 u \\lt 0"}</M>), the point accelerates downward. At a <b>trough</b> (concave up, <M>{"\\nabla^2 u \\gt 0"}</M>), it accelerates upward. At an <b>inflection point</b> (<M>{"\\nabla^2 u = 0"}</M>), there is zero acceleration at that instant.
              </P>
              <CurvaturePropagationAnimation mid="t2" />
              <P style={{ marginTop: 12, fontSize: 13, color: "rgba(255,255,255,0.72)", fontStyle: "italic", borderTop: "1px solid rgba(200,164,90,0.15)", paddingTop: 10 }}>
                But no individual point moves forward; each only oscillates up and down. The wave propagates because each displaced point exerts a force on its neighbor through the medium's coupling (tension in a string, pressure in air). That neighbor accelerates, displaces, and pulls on <i>its</i> neighbor in turn. This relay of forces is what carries the disturbance forward at speed <M>{"c"}</M>.
              </P>
            </div>
          </details>
        </Section>

        <Section title="EM Wave Equation">
          <P>Maxwell showed all electric and magnetic phenomena can be described with only <b>four equations</b>. From these, the wave equation for the E-field in 1D follows:</P>
          <Eq>{"\\frac{\\partial^2}{\\partial z^2}E(z,t) - \\frac{1}{c^2}\\frac{\\partial^2}{\\partial t^2}E(z,t) = 0"}</Eq>
          <P>Light is the oscillation of <M>{"\\vec{E}"}</M> and <M>{"\\vec{B}"}</M> fields in time and space.</P>
        </Section>

        <Section title="Monochromatic Plane Wave Solution">
          <P>The solution to the 1D wave equation for a monochromatic plane wave is:</P>
          <Eq>{"E(z,t) = E_0 \\cos(kz - \\omega t + \\phi_0)"}</Eq>
          <P>In complex exponential form:</P>
          <Eq>{"E(z,t) = \\frac{1}{2}E_0 e^{i\\phi_0} e^{ikz} e^{-i\\omega t} + \\frac{1}{2}E_0 e^{-i\\phi_0} e^{-ikz} e^{i\\omega t}"}</Eq>
          <P>Note that <M>{"e^{ikz}e^{-i\\omega t}"}</M> alone is also a valid solution to the wave equation.</P>
          <KeyConcept label="Wave Parameters">
            <div className="compare-grid">
              <div className="compare-card">
                <h4>Temporal</h4>
                <P><M>{"\\omega = 2\\pi/T"}</M> (angular frequency)</P>
                <P><M>{"T"}</M> = period (seconds)</P>
                <P><M>{"f = 1/T"}</M> (frequency in Hz)</P>
              </div>
              <div className="compare-card">
                <h4>Spatial</h4>
                <P><M>{"k = 2\\pi/\\lambda = \\omega/c"}</M> (wavenumber)</P>
                <P><M>{"\\lambda"}</M> = wavelength (spatial period)</P>
                <P><M>{"c = \\omega/k = f\\lambda"}</M> (phase velocity)</P>
              </div>
            </div>
            <div style={{display:'flex', gap:'2rem', flexWrap:'wrap', justifyContent:'center', marginTop:'1.2rem'}}>
              <div style={{textAlign:'center'}}>
                <div style={{color: G.gold, fontFamily:'IBM Plex Mono, monospace', fontSize:'0.8rem', marginBottom:'0.4rem'}}>Snapshot in space (fixed <M>{"t"}</M>)</div>
                <svg width="220" height="100" viewBox="0 0 220 100">
                  <line x1="10" y1="50" x2="210" y2="50" stroke={G.ax} strokeWidth="1"/>
                  <polyline
                    points={Array.from({length:201},(_,i)=>`${10+i},${50-28*Math.cos(2*Math.PI*i/60)}`).join(' ')}
                    fill="none" stroke={G.gold} strokeWidth="2"
                  />
                  <line x1="10" y1="46" x2="10" y2="54" stroke={G.txt} strokeWidth="1"/>
                  <line x1="70" y1="46" x2="70" y2="54" stroke={G.txt} strokeWidth="1"/>
                  <line x1="10" y1="48" x2="70" y2="48" stroke={G.txt} strokeWidth="1" strokeDasharray="3,2"/>
                  <text x="40" y="43" textAnchor="middle" fill={G.txt} fontSize="11" fontFamily="IBM Plex Mono, monospace">{"λ"}</text>
                  <text x="110" y="95" textAnchor="middle" fill={G.ax} fontSize="11" fontFamily="IBM Plex Mono, monospace">z</text>
                </svg>
                <P style={{margin:'0.3rem 0 0', fontSize:'0.85rem'}}><M>{"k = 2\\pi/\\lambda"}</M> — wavefronts per meter</P>
              </div>
              <div style={{textAlign:'center'}}>
                <div style={{color: G.blue, fontFamily:'IBM Plex Mono, monospace', fontSize:'0.8rem', marginBottom:'0.4rem'}}>Time series at fixed <M>{"z"}</M></div>
                <svg width="220" height="100" viewBox="0 0 220 100">
                  <line x1="10" y1="50" x2="210" y2="50" stroke={G.ax} strokeWidth="1"/>
                  <polyline
                    points={Array.from({length:201},(_,i)=>`${10+i},${50-28*Math.cos(2*Math.PI*i/60)}`).join(' ')}
                    fill="none" stroke={G.blue} strokeWidth="2"
                  />
                  <line x1="10" y1="46" x2="10" y2="54" stroke={G.txt} strokeWidth="1"/>
                  <line x1="70" y1="46" x2="70" y2="54" stroke={G.txt} strokeWidth="1"/>
                  <line x1="10" y1="48" x2="70" y2="48" stroke={G.txt} strokeWidth="1" strokeDasharray="3,2"/>
                  <text x="40" y="43" textAnchor="middle" fill={G.txt} fontSize="11" fontFamily="IBM Plex Mono, monospace">T</text>
                  <text x="110" y="95" textAnchor="middle" fill={G.ax} fontSize="11" fontFamily="IBM Plex Mono, monospace">t</text>
                </svg>
                <P style={{margin:'0.3rem 0 0', fontSize:'0.85rem'}}><M>{"\\omega = 2\\pi/T"}</M> — wavefronts per second</P>
              </div>
            </div>
            <P style={{textAlign:'center', fontSize:'0.85rem', color:'#aaa', marginTop:'0.5rem'}}>Both views show the same wave. The constraint <M>{"\\omega = kc"}</M> ties them: more crests per meter means more crests passing per second.</P>
          </KeyConcept>
          <PlaneWaveExplorer mid="pw" />
          <P>In 3D, the general plane wave:</P>
          <Eq>{"E(\\vec{r},t) = E_0 \\cos(\\vec{k} \\cdot \\vec{r} - \\omega t + \\phi_0)"}</Eq>
          <P>where <M>{"\\vec{k} = \\hat{x}k_x + \\hat{y}k_y + \\hat{z}k_z"}</M> and <M>{"|\\vec{k}| = 2\\pi/\\lambda = \\omega/c"}</M>.</P>
        </Section>

        <Section title="Wave Types">
          <P><b>Transverse wave:</b> oscillation direction perpendicular to <M>{"\\vec{k}"}</M> (e.g., EM waves).</P>
          <P><b>Longitudinal wave:</b> oscillation direction parallel to <M>{"\\vec{k}"}</M> (e.g., sound, earthquake P-waves).</P>
          <P><b>Running wave:</b> <M>{"\\sim \\cos(\\omega t - kz)"}</M></P>
          <P><b>Standing wave:</b> <M>{"\\sim \\cos(\\omega t - kz) + \\cos(\\omega t + kz) = 2\\cos(kz)\\cos(\\omega t)"}</M> (e.g., guitar string)</P>
          <StandingWaveAnimation mid="t" />
        </Section>

        <Section title="Vector Calculus Refresher">
          <P>For a vector <M>{"\\vec{A} = A_x\\hat{x} + A_y\\hat{y} + A_z\\hat{z}"}</M> and scalar <M>{"\\alpha"}</M>:</P>
          <KeyConcept label="Curl (vector to vector)">
            Measures the tendency to rotate about a point in a vector field.
            <Eq>{"\\nabla \\times \\vec{A} = \\hat{x}\\left(\\frac{\\partial A_z}{\\partial y} - \\frac{\\partial A_y}{\\partial z}\\right) + \\hat{y}\\left(-\\frac{\\partial A_z}{\\partial x} + \\frac{\\partial A_x}{\\partial z}\\right) + \\hat{z}\\left(\\frac{\\partial A_y}{\\partial x} - \\frac{\\partial A_x}{\\partial y}\\right)"}</Eq>
            <div style={{ margin: "10px auto 0", maxWidth: 240 }}>
              <svg viewBox="0 0 240 148" style={{ width: "100%", display: "block" }}>
                <title>Curl of a vector field showing circulation around a point</title>
                <defs>
                  <marker id="vc-curl" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <path d="M0,0 L7,2.5 L0,5" fill={G.blue}/>
                  </marker>
                </defs>
                <circle cx="120" cy="64" r="3.5" fill={G.gold} opacity="0.8"/>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                  const rad = deg * Math.PI / 180;
                  const px = 120 + 38 * Math.cos(rad);
                  const py = 64 - 38 * Math.sin(rad);
                  const tx = Math.cos(rad + Math.PI / 2);
                  const ty = -Math.sin(rad + Math.PI / 2);
                  return <line key={deg} x1={px - 12 * tx} y1={py - 12 * ty} x2={px + 12 * tx} y2={py + 12 * ty} stroke={G.blue} strokeWidth="1.5" markerEnd="url(#vc-curl)"/>;
                })}
                <text x="120" y="138" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Nonzero curl: field circulates"}</text>
              </svg>
            </div>
          </KeyConcept>
          <KeyConcept label="Divergence (vector to scalar)">
            Measures the magnitude of a source or sink at a given point.
            <Eq>{"\\nabla \\cdot \\vec{A} = \\frac{\\partial A_x}{\\partial x} + \\frac{\\partial A_y}{\\partial y} + \\frac{\\partial A_z}{\\partial z}"}</Eq>
            <div style={{ margin: "10px auto 0", maxWidth: 300 }}>
              <svg viewBox="0 0 300 148" style={{ width: "100%", display: "block" }}>
                <title>Divergence of a vector field showing source and sink</title>
                <defs>
                  <marker id="vc-div-b" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <path d="M0,0 L7,2.5 L0,5" fill={G.blue}/>
                  </marker>
                  <marker id="vc-div-r" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <path d="M0,0 L7,2.5 L0,5" fill={G.red}/>
                  </marker>
                </defs>
                {/* Source */}
                <circle cx="80" cy="64" r="3.5" fill={G.gold} opacity="0.8"/>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                  const rad = deg * Math.PI / 180;
                  return <line key={"s" + deg} x1={80 + 10 * Math.cos(rad)} y1={64 - 10 * Math.sin(rad)} x2={80 + 38 * Math.cos(rad)} y2={64 - 38 * Math.sin(rad)} stroke={G.blue} strokeWidth="1.5" markerEnd="url(#vc-div-b)"/>;
                })}
                <text x="80" y="128" fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Source: div > 0"}</text>
                {/* Sink */}
                <circle cx="220" cy="64" r="3.5" fill={G.gold} opacity="0.8"/>
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
                  const rad = deg * Math.PI / 180;
                  return <line key={"k" + deg} x1={220 + 38 * Math.cos(rad)} y1={64 - 38 * Math.sin(rad)} x2={220 + 10 * Math.cos(rad)} y2={64 - 10 * Math.sin(rad)} stroke={G.red} strokeWidth="1.5" markerEnd="url(#vc-div-r)"/>;
                })}
                <text x="220" y="128" fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Sink: div "}{"\u003c"}{" 0"}</text>
              </svg>
            </div>
          </KeyConcept>
          <KeyConcept label="Gradient (scalar to vector)">
            Measures the rate and direction of change in a scalar field.
            <Eq>{"\\nabla \\alpha = \\frac{\\partial \\alpha}{\\partial x}\\hat{x} + \\frac{\\partial \\alpha}{\\partial y}\\hat{y} + \\frac{\\partial \\alpha}{\\partial z}\\hat{z}"}</Eq>
            <div style={{ margin: "10px auto 0", maxWidth: 260 }}>
              <svg viewBox="0 0 260 152" style={{ width: "100%", display: "block" }}>
                <title>Gradient of a scalar field pointing perpendicular to contours</title>
                <defs>
                  <marker id="vc-grad" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                    <path d="M0,0 L7,2.5 L0,5" fill={G.gold}/>
                  </marker>
                </defs>
                {/* Contour lines */}
                <circle cx="115" cy="64" r="18" fill="none" stroke={G.ax} strokeWidth="1" strokeDasharray="3,2"/>
                <circle cx="115" cy="64" r="34" fill="none" stroke={G.ax} strokeWidth="1" strokeDasharray="3,2"/>
                <circle cx="115" cy="64" r="50" fill="none" stroke={G.ax} strokeWidth="1" strokeDasharray="3,2"/>
                {/* Gradient arrows at diagonals */}
                {[45, 135, 225, 315].map(deg => {
                  const rad = deg * Math.PI / 180;
                  return <line key={deg} x1={115 + 20 * Math.cos(rad)} y1={64 - 20 * Math.sin(rad)} x2={115 + 48 * Math.cos(rad)} y2={64 - 48 * Math.sin(rad)} stroke={G.gold} strokeWidth="2" markerEnd="url(#vc-grad)"/>;
                })}
                <text x="115" y="68" fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"low \u03B1"}</text>
                <text x="115" y="8" fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"high \u03B1"}</text>
                <text x="210" y="40" fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'">{"\u2207\u03B1"}</text>
                <text x="130" y="145" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Points uphill, \u22A5 to contours"}</text>
              </svg>
            </div>
          </KeyConcept>
          <KeyConcept label="Scalar Laplacian (scalar to scalar)">
            Divergence of the gradient:
            <Eq>{"\\nabla^2 \\alpha = \\frac{\\partial^2 \\alpha}{\\partial x^2} + \\frac{\\partial^2 \\alpha}{\\partial y^2} + \\frac{\\partial^2 \\alpha}{\\partial z^2}"}</Eq>
            <div style={{ margin: "10px auto 0", maxWidth: 280 }}>
              <svg viewBox="0 0 280 132" style={{ width: "100%", display: "block" }}>
                <title>Scalar Laplacian showing concave-up and concave-down regions</title>
                {/* Baseline */}
                <line x1="25" y1="65" x2="255" y2="65" stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3"/>
                {/* Shaded regions */}
                <path d="M30,65 C55,15 115,15 140,65 Z" fill={G.red} opacity="0.08"/>
                <path d="M140,65 C165,115 225,115 250,65 Z" fill={G.grn} opacity="0.08"/>
                {/* Curve */}
                <path d="M30,65 C55,15 115,15 140,65 C165,115 225,115 250,65" fill="none" stroke={G.blue} strokeWidth="2"/>
                {/* Concavity annotations */}
                <text x="85" y="12" fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"concave down"}</text>
                <text x="85" y="23" fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"\u2207\u00B2\u03B1 "}&lt;{" 0"}</text>
                <text x="195" y="116" fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"concave up"}</text>
                <text x="195" y="127" fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"\u2207\u00B2\u03B1 > 0"}</text>
              </svg>
            </div>
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "qm-formalism",
    tab: "QM Formalism",
    title: "3. Quantum Mechanics Formalism",
    subtitle: "Wavefunctions, probability density, operators, and expectation values",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="QM Postulates Summary">
          <ul className="info-list">
            <li>Particles are described by normed, <b>complex</b> wavefunctions <M>{"\\Psi(x,y,z,t)"}</M></li>
            <li>The Schrodinger equation describes particle dynamics</li>
            <li><M>{"\\Psi"}</M> and <M>{"\\nabla\\Psi"}</M> must be continuous over x, y, z, and t</li>
            <li><M>{"\\Psi"}</M> has an associated <b>probability distribution</b> which can be observed, unlike <M>{"\\Psi"}</M> itself</li>
            <li>Observables are calculated by applying a mathematical <b>operator</b> to <M>{"\\Psi"}</M> and computing the <b>expectation value</b></li>
          </ul>
        </Section>

        <Section title="Wavefunction and Probability">
          <P>The wavefunction <M>{"\\Psi(x,y,z,t)"}</M> is a complex-valued function that completely describes the quantum state of a particle. While <M>{"\\Psi"}</M> itself is not directly observable, its modulus squared gives the probability density:</P>
          <Eq>{"|\\Psi(x,y,z,t)|^2\\,dx\\,dy\\,dz"}</Eq>
          <P>is the probability of finding the particle at time <M>{"t"}</M> in the volume element <M>{"dx\\,dy\\,dz"}</M> located at <M>{"(x,y,z)"}</M>.</P>
          <KeyConcept label="Born Interpretation">
            The probability of finding a particle in a region is the integral of the probability density over that region. The wavefunction itself has no direct physical meaning; only its squared modulus does.
          </KeyConcept>
          <CollapsibleBlock title="What does a negative wavefunction mean?">
            <P>A negative <M>{"\\Psi"}</M> carries no direct physical meaning on its own. Since only <M>{"|\\Psi|^2"}</M> is measurable, flipping the global sign <M>{"\\Psi \\to -\\Psi"}</M> is undetectable.</P>
            <P>Sign matters for <b>interference</b>. When wavefunctions overlap, amplitudes add before squaring:</P>
            <Eq>{"| \\Psi_1 + \\Psi_2 |^2 \\neq |\\Psi_1|^2 + |\\Psi_2|^2"}</Eq>
            <P>Same sign in a region: constructive interference, higher probability. Opposite sign: destructive interference, probability approaches zero. This is why excited states have <b>nodes</b> (zero crossings) -- the wavefunction changes sign, making the probability of finding the particle there exactly zero.</P>
          </CollapsibleBlock>
        </Section>

        <Section title="Normalization">
          <P>Since the particle must be found <i>somewhere</i>, the total probability over all space must equal 1:</P>
          <Eq>{"\\int_{-\\infty}^{\\infty} |\\Psi(x,y,z,t)|^2\\,dx\\,dy\\,dz = 1"}</Eq>
          <P>This is the <b>normalization condition</b>. A wavefunction that satisfies this condition is said to be normalized. In Dirac notation, this is the same as:</P>
          <Eq>{"\\langle\\psi|\\psi\\rangle = \\int_{-\\infty}^{\\infty} \\psi^*\\psi\\,dx = \\int_{-\\infty}^{\\infty}|\\psi|^2\\,dx = 1"}</Eq>
        </Section>

        <Section title="Probability Density Review">
          <P>A probability density function (p.d.f.) <M>{"f(x)"}</M> for a continuous random variable must satisfy:</P>
          <ul className="info-list">
            <li><M>{"f(x) \\geq 0"}</M> for all <M>{"x"}</M> in the support</li>
            <li><M>{"\\int_S f(x)\\,dx = 1"}</M></li>
            <li>Probability of <M>{"x"}</M> in interval <M>{"A"}</M>: <M>{"P(X \\in A) = \\int_A f(x)\\,dx"}</M></li>
          </ul>
        </Section>

        <Section title="Operators">
          <P>In quantum mechanics, each physical observable is associated with a mathematical <b>operator</b>. The operator acts on the wavefunction to extract information about the observable.</P>
          <KeyConcept label="Momentum Operator (1D)">
            <Eq>{"\\hat{p} = -i\\hbar\\frac{\\partial}{\\partial x} = \\frac{\\hbar}{i}\\frac{\\partial}{\\partial x}"}</Eq>
            In 3D: <M>{"\\hat{p} = -i\\hbar\\nabla"}</M>
          </KeyConcept>
          <P>Here <M>{"\\hbar = h/(2\\pi) = 1.055 \\times 10^{-34}\\;\\text{J}\\cdot\\text{s}"}</M> is the <b>reduced Planck's constant</b>, and the <M>{"(-i)"}</M> factor ensures measured momenta are real numbers.</P>
          <P>Example: the d/dx operator has eigenfunctions of the form <M>{"e^{ax}"}</M>, since <M>{"\\frac{d}{dx}e^{ax} = a\\,e^{ax}"}</M>.</P>
          <P>Applying <M>{"\\hat{p}"}</M> to <M>{"e^{ikx}"}</M>: <M>{"\\hat{p}\\,e^{ikx} = -i\\hbar(ik)e^{ikx} = \\hbar k\\,e^{ikx}"}</M>. So <M>{"e^{ikx}"}</M> is a momentum eigenstate with <M>{"p = \\hbar k"}</M> — the de Broglie relation <M>{"\\lambda = h/p"}</M> rewritten using <M>{"k = 2\\pi/\\lambda"}</M>.</P>
        </Section>

        <Section title="Expectation Values">
          <P>The <b>expectation value</b> (expected value, or weighted average) of an observable <M>{"A"}</M> is:</P>
          <Eq>{"\\langle A \\rangle = \\int \\psi^* \\hat{A}\\,\\psi\\,dx"}</Eq>
          <P>For a continuous variable <M>{"x"}</M> with probability density <M>{"f(x)"}</M>:</P>
          <Eq>{"E[X] = \\int_A x\\,f(x)\\,dx"}</Eq>
          <KeyConcept label="Dirac Notation">
            The state of a quantum system is denoted <M>{"| \\psi \\rangle"}</M> (a "ket"). This compact notation is equivalent to writing the wavefunction. The expectation value can be written as <M>{"\\langle \\psi | \\hat{A} | \\psi \\rangle"}</M>.
          </KeyConcept>
          <CollapsibleBlock title="Dirac notation: bras, kets, and inner products">
            <P><M>{"|\\psi\\rangle"}</M> is a <b>ket</b> -- the state vector. <M>{"\\langle\\psi|"}</M> is its <b>bra</b> -- the conjugate transpose of the ket, placed on the left to form inner products. Together they make a "bra-ket" (bracket).</P>
            <P>Key expressions:</P>
            <ul className="info-list">
              <li><M>{"\\langle\\psi|\\psi\\rangle = 1"}</M> &mdash; normalization; the squared norm equals 1</li>
              <li><M>{"\\langle\\phi|\\psi\\rangle"}</M> &mdash; inner product, measuring the overlap between states <M>{"\\phi"}</M> and <M>{"\\psi"}</M></li>
              <li><M>{"\\langle x_0|\\psi\\rangle = \\psi(x_0)"}</M> &mdash; the wavefunction value at <M>{"x_0"}</M> is the overlap with the position eigenstate <M>{"|x_0\\rangle"}</M></li>
              <li><M>{"\\langle\\psi|\\hat{A}|\\psi\\rangle"}</M> &mdash; expectation value of observable <M>{"A"}</M></li>
            </ul>
            <P>The wavefunction <M>{"\\psi(x)"}</M> and the ket <M>{"|\\psi\\rangle"}</M> are not separate objects. <M>{"\\psi(x)"}</M> is the collection of all inner products <M>{"\\langle x|\\psi\\rangle"}</M> as <M>{"x"}</M> varies -- Dirac notation just packages the state more compactly, without committing to a specific basis.</P>
          </CollapsibleBlock>
          <CollapsibleBlock title={<span>Why not apply the operator to <M>{"|\\psi|^2"}</M> directly?</span>}>
            <P><M>{"|\\psi|^2"}</M> discards the <b>phase</b> of <M>{"\\psi"}</M>, and phase carries observable information. For <M>{"\\psi = e^{ikx}"}</M>, <M>{"|\\psi|^2 = 1"}</M> everywhere, so <M>{"\\hat{p}|\\psi|^2 = -i\\hbar\\frac{d}{dx}(1) = 0"}</M> — the wrong answer. The correct structure <M>{"\\psi^*(\\hat{p}\\,\\psi)"}</M> lets the operator act on <M>{"\\psi"}</M> first (seeing the phase), then <M>{"\\psi^*"}</M> extracts a real, integrable result.</P>
          </CollapsibleBlock>
        </Section>
      </div>
    ),
  },
  {
    id: "schrodinger",
    tab: "Schrodinger Eq.",
    title: "4. The Schrodinger Equation",
    subtitle: "Time-dependent and time-independent forms, Hamiltonian, time evolution, stationary states",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Classical Mechanics Review">
          <P>For an object with mass <M>{"m"}</M>, momentum <M>{"p"}</M>, position <M>{"x"}</M>, and potential energy <M>{"V(x)"}</M>:</P>
          <P>The total energy is given by the <b>Hamiltonian</b>:</P>
          <Eq>{"H = \\frac{p^2}{2m} + V(x)"}</Eq>
          <P>Force: <M>{"F = -\\frac{dV}{dx} = -\\frac{\\partial H}{\\partial x}"}</M>, and by Newton's 2nd law: <M>{"F = \\frac{dp}{dt}"}</M></P>
          <P>Velocity: <M>{"v = \\frac{p}{m} = \\frac{\\partial H}{\\partial p} = \\frac{dx}{dt}"}</M></P>
        </Section>

        <Section title="Time-Dependent Schrodinger Equation">
          <P>The quantum mechanical equation of motion for a wavefunction is the <b>time-dependent Schrodinger equation</b>:</P>
          <Eq>{"i\\hbar\\frac{d}{dt}|\\psi\\rangle = \\hat{H}|\\psi\\rangle"}</Eq>
          <P>where <M>{"\\hat{H}"}</M> is the <b>Hamiltonian operator</b>, obtained by replacing classical variables with their quantum operators:</P>
          <Eq>{"\\hat{H} = -\\frac{\\hbar^2}{2m}\\nabla^2 + V(\\vec{r})"}</Eq>
          <P>The first term is the kinetic energy operator and the second is the potential energy.</P>
          <KeyConcept label="Hamiltonian intuition">The total energy of a particle equals <b>how curved its wavefunction is</b> (the <M>{"\\nabla^2"}</M> term gives kinetic energy) <b>plus where it sits in the potential landscape</b> (<M>{"V(\\vec{r})"}</M> gives potential energy). More curvature in <M>{"\\psi"}</M> means higher momentum and higher KE — the same geometric link as in the classical wave equation.</KeyConcept>
          <CollapsibleBlock title="Deriving the Hamiltonian operator">
            <P><b>Step 1.</b> Start with the classical Hamiltonian (total energy):</P>
            <Eq>{"H = \\frac{p^2}{2m} + V(x)"}</Eq>
            <P><b>Step 2.</b> Apply the quantization rule — replace momentum with its operator:</P>
            <Eq>{"p \\;\\longrightarrow\\; \\hat{p} = -i\\hbar\\frac{d}{dx}"}</Eq>
            <P><b>Step 3.</b> Compute <M>{"\\hat{p}^2"}</M>:</P>
            <Eq>{"\\hat{p}^2 = \\left(-i\\hbar\\frac{d}{dx}\\right)^2 = (-i\\hbar)^2\\frac{d^2}{dx^2} = -\\hbar^2\\frac{d^2}{dx^2}"}</Eq>
            <P>Note: <M>{"(-i)^2 = -1"}</M>, which gives the minus sign.</P>
            <P><b>Step 4.</b> Substitute into <M>{"H"}</M>:</P>
            <Eq>{"\\hat{H} = -\\frac{\\hbar^2}{2m}\\frac{d^2}{dx^2} + V(x)"}</Eq>
            <P>In 3D, <M>{"\\hat{p} = -i\\hbar\\nabla"}</M> so <M>{"\\hat{p}^2 = -\\hbar^2\\nabla^2"}</M>, giving the full form above.</P>
          </CollapsibleBlock>
          <CollapsibleBlock title={<span>Why does <M>{"i\\hbar\\frac{d}{dt}"}</M> look like <M>{"\\hat{p}"}</M>?</span>}>
            <P>They share a similar structure but differentiate different variables — a common source of confusion:</P>
            <P>Momentum operator: <M>{"\\hat{p} = -i\\hbar\\dfrac{d}{dx}"}</M> — acts on <b>space</b></P>
            <P>Energy operator: <M>{"i\\hbar\\dfrac{d}{dt}"}</M> — acts on <b>time</b></P>
            <P>The Schrodinger equation is an energy equation: the left side extracts total energy from the time evolution of <M>{"\\psi"}</M>; the right side computes it as KE + PE via <M>{"\\hat{H}"}</M>.</P>
          </CollapsibleBlock>
          <CollapsibleBlock title={<span>Where does <M>{"\\hat{p} = -i\\hbar\\frac{d}{dx}"}</M> come from?</span>}>
            <P>The substitution is a postulate, but it can be motivated. A free particle with momentum <M>{"p = \\hbar k"}</M> has wavefunction <M>{"\\psi = e^{ikx}"}</M>. Applying the operator:</P>
            <Eq>{"-i\\hbar\\frac{d}{dx}e^{ikx} = -i\\hbar(ik)e^{ikx} = \\hbar k\\,e^{ikx} = p\\,\\psi"}</Eq>
            <P>The operator extracts momentum <M>{"p"}</M> as a multiplicative factor — exactly the eigenvalue behavior we want. This works for any plane wave, which motivates the general rule.</P>
          </CollapsibleBlock>
          <KeyConcept label="Equation of Motion">
            Just as Newton's second law <M>{"F = ma"}</M> describes how a classical particle moves, the Schrodinger equation describes how a quantum wavefunction evolves in time: it tells us how <M>{"\\psi"}</M> changes moment to moment.
          </KeyConcept>
          <CollapsibleBlock title="Schrödinger equation intuition">
            <KeyConcept label="Schrödinger equation intuition">
              The SE says: the total energy of a particle (right side) dictates how its quantum state evolves in time (left side). The Hamiltonian <M>{"\\hat{H}"}</M> inspects the wavefunction right now — its curvature and position in the potential — and that snapshot determines what <M>{"|\\psi\\rangle"}</M> will look like an instant later. Steeper energy landscape means faster phase evolution; zero energy means the state is frozen.
            </KeyConcept>
          </CollapsibleBlock>
          <CollapsibleBlock title="Energy as temporal momentum">
            <P>Momentum and energy play parallel roles in quantum mechanics:</P>
            <table style={{width:"100%",borderCollapse:"collapse",margin:"0.5em 0"}}>
              <thead><tr style={{borderBottom:"1px solid #444"}}>
                <th style={{padding:"0.3em 0.5em",textAlign:"left"}}></th>
                <th style={{padding:"0.3em 0.5em",textAlign:"left"}}>Space</th>
                <th style={{padding:"0.3em 0.5em",textAlign:"left"}}>Time</th>
              </tr></thead>
              <tbody>
                <tr><td style={{padding:"0.3em 0.5em"}}><b>Variable</b></td><td style={{padding:"0.3em 0.5em"}}><M>{"x"}</M></td><td style={{padding:"0.3em 0.5em"}}><M>{"t"}</M></td></tr>
                <tr><td style={{padding:"0.3em 0.5em"}}><b>Conjugate quantity</b></td><td style={{padding:"0.3em 0.5em"}}><M>{"p = \\hbar k"}</M></td><td style={{padding:"0.3em 0.5em"}}><M>{"E = \\hbar\\omega"}</M></td></tr>
                <tr><td style={{padding:"0.3em 0.5em"}}><b>Operator</b></td><td style={{padding:"0.3em 0.5em"}}><M>{"-i\\hbar\\frac{d}{dx}"}</M></td><td style={{padding:"0.3em 0.5em"}}><M>{"i\\hbar\\frac{d}{dt}"}</M></td></tr>
                <tr><td style={{padding:"0.3em 0.5em"}}><b>Generates</b></td><td style={{padding:"0.3em 0.5em"}}>spatial translation</td><td style={{padding:"0.3em 0.5em"}}>time translation</td></tr>
              </tbody>
            </table>
            <P>Energy is to time what momentum is to space. In relativity this is made explicit: energy and momentum combine into a single four-vector <M>{"(E/c,\\; \\vec{p})"}</M>, where energy is the time component of momentum.</P>
          </CollapsibleBlock>
        </Section>

        <Section title="Time Evolution Operator">
          <P>Integrating the Schrodinger equation gives the time evolution of the state:</P>
          <Eq>{"|\\psi(t)\\rangle = e^{-i\\hat{H}t/\\hbar}|\\psi(0)\\rangle = \\hat{U}(t)|\\psi(0)\\rangle"}</Eq>
          <P>where <M>{"\\hat{U}(t) = e^{-i\\hat{H}t/\\hbar}"}</M> is the <b>time evolution operator</b>.</P>
          <P>For infinitesimal time step <M>{"dt"}</M>:</P>
          <Eq>{"|\\psi(t+dt)\\rangle = \\left(1 - i\\frac{dt}{\\hbar}\\hat{H}\\right)|\\psi(t)\\rangle"}</Eq>
        </Section>

        <Section title="Stationary States">
          <P>A <b>stationary state</b> is an eigenfunction of the Hamiltonian:</P>
          <Eq>{"\\hat{H}|\\psi_n\\rangle = E_n|\\psi_n\\rangle"}</Eq>
          <P>Here <M>{"E_n"}</M> is the energy eigenvalue (a number) of the specific stationary state <M>{"|\\psi_n\\rangle"}</M>. These are solutions to the Schrodinger equation where the probability density does not change with time.</P>
        </Section>

        <Section title="Time-Independent Schrodinger Equation (1D)">
          <P>For a particle in a potential <M>{"V(x)"}</M>, the stationary state condition leads to the time-independent Schrodinger equation in 1D:</P>
          <Eq>{"\\frac{d^2\\psi}{dx^2} + \\frac{2m_e}{\\hbar^2}(E - V)\\psi = 0"}</Eq>
          <CollapsibleBlock title="TISE Intuition">
            <KeyConcept label="TISE intuition">
              Rearranged, the TISE reads:
              <Eq>{"\\frac{d^2\\psi}{dx^2} = -\\frac{2m_e}{\\hbar^2}(E - V)\\psi"}</Eq>
              The <b>curvature of <M>{"\\psi"}</M> at each point</b> is set by the local kinetic energy <M>{"(E - V)"}</M> times <M>{"\\psi"}</M>. Where <M>{"E > V"}</M> (classically allowed), curvature opposes <M>{"\\psi"}</M> and the wavefunction <b>oscillates</b>. Where <M>{"E \\lt V"}</M> (classically forbidden), curvature reinforces <M>{"\\psi"}</M> and it <b>decays</b>. Only at special values <M>{"E_n"}</M> does this curvature rule produce a <M>{"\\psi"}</M> that stays finite and normalizable everywhere — that constraint is what forces energy quantization.
            </KeyConcept>
          </CollapsibleBlock>
          <KeyConcept label="Free Electron Solution">
            For a free electron (<M>{"V = 0"}</M>), the solutions are plane waves:
            <Eq>{"\\psi(x) = A\\,e^{jkx} \\quad \\text{where} \\quad k = \\frac{\\sqrt{2m_e E}}{\\hbar}"}</Eq>
            This represents a particle with definite momentum <M>{"p = \\hbar k"}</M> and energy <M>{"E = \\hbar^2 k^2 / (2m_e)"}</M>.
          </KeyConcept>
        </Section>

        <Section title="Visualizing the Schrodinger Equation">
          <P>These interactive visualizations show how the Hamiltonian, eigenstates, and time evolution work together.</P>

          <CollapsibleBlock title="Eigenstate vs. superposition (animated)" defaultOpen={true}>
            <P>Left: a pure eigenstate (<M>{"n=2"}</M>). The wavefunction oscillates in phase, but <M>{"|\\psi|^2"}</M> is <b>frozen</b>. Right: a superposition (<M>{"\\psi_1 + \\psi_2"}</M>). Different energy components oscillate at different rates, so <M>{"|\\psi|^2"}</M> <b>sloshes</b>.</P>
            <StationaryVsNonStationary />
          </CollapsibleBlock>

          <CollapsibleBlock title="Hamiltonian decomposition">
            <P>For an eigenstate in the infinite well (<M>{"V = 0"}</M> inside), <M>{"\\hat{H}\\psi = E_n\\psi"}</M>. The Hamiltonian output is just the wavefunction scaled by <M>{"n^2"}</M>, confirming it is an eigenstate. Toggle between states to see how curvature grows with <M>{"n"}</M>.</P>
            <HamiltonianDecomposition />
          </CollapsibleBlock>

          <CollapsibleBlock title="Time evolution stepper">
            <P>The SE marches <M>{"\\psi"}</M> forward in time. Green arrows show <M>{"\\partial(\\text{Re}\\,\\psi)/\\partial t"}</M> at sampled points: this is what <M>{"\\hat{H}"}</M> computes at each instant. Step through or play to watch the state evolve.</P>
            <TimeEvolutionStepper />
          </CollapsibleBlock>

          <CollapsibleBlock title="2D infinite well">
            <P>The 2D well has separable solutions <M>{"\\psi(x,y) = \\psi_{n_x}(x)\\cdot\\psi_{n_y}(y)"}</M>. Energy: <M>{"E = (n_x^2 + n_y^2)\\,E_1"}</M>. Adjust quantum numbers to see how nodal lines form.</P>
            <InfiniteWell2D />
          </CollapsibleBlock>
        </Section>
      </div>
    ),
  },
  {
    id: "infinite-well",
    tab: "Infinite Potential Well",
    title: "5. The Infinite Potential Well",
    subtitle: "Boundary conditions, quantized wavefunctions, energy levels, and probability density",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Setup">
          <P>Consider a particle of mass <M>{"m_e"}</M> confined to a 1D box of width <M>{"a"}</M>:</P>
          <Eq>{"V(x) = \\begin{cases} 0 & 0 \\lt x \\lt a \\\\ \\infty & \\text{otherwise} \\end{cases}"}</Eq>
          <P>Inside the well, the time-independent Schrodinger equation becomes:</P>
          <Eq>{"\\frac{d^2\\psi}{dx^2} + \\frac{2m_e}{\\hbar^2}E\\,\\psi = 0"}</Eq>
          <P>Since the potential is infinite outside, the wavefunction must vanish at the walls:</P>
          <Eq>{"\\psi(0) = 0 \\quad \\text{and} \\quad \\psi(a) = 0"}</Eq>
        </Section>

        <Section title="Wavefunctions">
          <P>The boundary conditions select only specific solutions. The normalized wavefunctions are:</P>
          <Eq>{"\\psi_n(x) = \\sqrt{\\frac{2}{a}}\\sin\\left(\\frac{n\\pi x}{a}\\right) \\quad n = 1, 2, 3, \\ldots"}</Eq>
          <P>Each state <M>{"n"}</M> has <M>{"n-1"}</M> nodes (zero-crossings) inside the well.</P>
          <InfiniteWellWavefunctions params={gp.infiniteWellWavefunctions} mid="t" />
        </Section>

        <Section title="Energy Quantization">
          <P>The boundary conditions also quantize the energy. The allowed energies are:</P>
          <Eq>{"E_n = \\frac{n^2 \\pi^2 \\hbar^2}{2m_e a^2} = \\frac{n^2 h^2}{8m_e a^2} \\quad n = 1, 2, 3, \\ldots"}</Eq>
          <P>The energy spacing between adjacent levels:</P>
          <Eq>{"\\Delta E_n = E_{n+1} - E_n = \\frac{(2n+1)h^2}{8m_e a^2}"}</Eq>
          <P>Energy grows as <M>{"n^2"}</M>, so higher levels are spaced further apart.</P>
          <EnergyLevelDiagram params={gp.energyLevelDiagram} mid="t" />
          <KeyConcept label="Zero-Point Energy">
            The lowest energy state is <M>{"n = 1"}</M> (not <M>{"n = 0"}</M>), giving <M>{"E_1 = h^2/(8m_e a^2)"}</M>. A confined quantum particle always has nonzero kinetic energy, unlike a classical particle which can be at rest. This is a consequence of the Heisenberg uncertainty principle.
          </KeyConcept>
        </Section>

        <Section title="Interactive: Effect of Well Width on Energy">
          <P>Drag the slider to change the well width <M>{"a"}</M> and observe how energy levels respond. Notice that <M>{"E_n \\propto 1/a^2"}</M>: a narrower well means larger energy spacing (tighter confinement = higher energy), while a wider well compresses the levels closer together.</P>
          <WellWidthExplorer mid="t" />
        </Section>

        <Section title="Probability Density">
          <P>The probability density for finding the particle at position <M>{"x"}</M> in state <M>{"n"}</M> is:</P>
          <Eq>{"|\\psi_n(x)|^2 = \\frac{2}{a}\\sin^2\\left(\\frac{n\\pi x}{a}\\right)"}</Eq>
          <P>For <M>{"n = 1"}</M> (ground state), the particle is most likely found at the center (<M>{"x = a/2"}</M>). For higher <M>{"n"}</M>, there are multiple peaks and nodes.</P>
          <KeyConcept label="Density vs. probability">
            <M>{"|\\psi_n|^2"}</M> is a probability <b>density</b>, not a probability. It has units of <M>{"1/\\text{length}"}</M>, so its numerical value depends on the length scale. For a well of width <M>{"a = 10^{-9}"}</M> m, the peak <M>{"2/a = 2\\times 10^{9}"}</M> m<sup>-1</sup> looks huge, but the normalization condition is on the <b>integral</b>, not the value:
            <Eq>{"\\int_0^a |\\psi_n|^2\\,dx = 1"}</Eq>
            The large density and the small width cancel: average height <M>{"\\sim 1/a"}</M> times width <M>{"a"}</M> gives area <M>{"\\sim 1"}</M>. To get an actual probability, multiply by a length: <M>{"|\\psi_n(x)|^2\\,dx"}</M> is the probability of finding the particle in a slice of width <M>{"dx"}</M> at position <M>{"x"}</M>.
          </KeyConcept>
          <ProbabilityDensity params={gp.probabilityDensity} mid="t" />
        </Section>

        <Section title="Normalization Verification">
          <P>We can verify the normalization constant <M>{"\\sqrt{2/a}"}</M>:</P>
          <Eq>{"\\int_0^a |\\psi_n(x)|^2\\,dx = \\frac{2}{a}\\int_0^a \\sin^2\\left(\\frac{n\\pi x}{a}\\right)dx = \\frac{2}{a} \\cdot \\frac{a}{2} = 1"}</Eq>
          <P>using the identity <M>{"\\int_0^a \\sin^2(n\\pi x/a)\\,dx = a/2"}</M> for integer <M>{"n"}</M>.</P>
        </Section>

        <Section title="Correspondence Principle">
          <P>The <b>correspondence principle</b> states that quantum mechanics must reproduce classical physics in the limit of large quantum numbers. For the infinite well, a classical particle bouncing between the walls has a <b>uniform probability distribution</b> <M>{"P(x) = 1/a"}</M>. As <M>{"n \\to \\infty"}</M>, the quantum probability density <M>{"|\\psi_n|^2"}</M> oscillates so rapidly that its spatial average approaches the classical uniform result.</P>
          <ClassicalQuantumComparison mid="t" />
          <TimeEvolvingWavefunction mid="t2" />
          <KeyConcept label="Correspondence Principle">
            At large quantum numbers, the quantum probability distribution averages to the classical result. This is a general principle: QM must reduce to classical mechanics in the appropriate limit (large energies, large quantum numbers, or short de Broglie wavelengths).
          </KeyConcept>
        </Section>

        <Section title="FAQ & Derivations">
          <CollapsibleBlock title={<span>Deriving <M>{"|\\Psi(x,t)|^2"}</M> for a two-state superposition</span>}>
            <P>For a superposition of the ground and first excited states of the infinite well:</P>
            <Eq>{"\\Psi(x,t) = c_1\\varphi_1(x)e^{-iE_1 t/\\hbar} + c_2\\varphi_2(x)e^{-iE_2 t/\\hbar}"}</Eq>
            <P>where <M>{"\\varphi_n(x) = \\sqrt{2/a}\\sin(n\\pi x/a)"}</M> is real, and <M>{"c_1, c_2"}</M> are taken real with <M>{"c_1^2 + c_2^2 = 1"}</M>.</P>
            <P><b>Step 1.</b> Take the complex conjugate (flip the sign of <M>{"i"}</M>):</P>
            <Eq>{"\\Psi^*(x,t) = c_1\\varphi_1(x)e^{+iE_1 t/\\hbar} + c_2\\varphi_2(x)e^{+iE_2 t/\\hbar}"}</Eq>
            <P><b>Step 2.</b> Multiply <M>{"|\\Psi|^2 = \\Psi^*\\Psi"}</M>. Expanding the product of two binomials gives four terms:</P>
            <Eq>{"|\\Psi|^2 = c_1^2\\varphi_1^2 e^{+iE_1 t/\\hbar}e^{-iE_1 t/\\hbar} + c_2^2\\varphi_2^2 e^{+iE_2 t/\\hbar}e^{-iE_2 t/\\hbar}"}</Eq>
            <Eq>{"+\\; c_1 c_2\\varphi_1\\varphi_2 e^{+iE_1 t/\\hbar}e^{-iE_2 t/\\hbar} + c_1 c_2\\varphi_1\\varphi_2 e^{+iE_2 t/\\hbar}e^{-iE_1 t/\\hbar}"}</Eq>
            <P><b>Step 3.</b> The diagonal terms use <M>{"e^{+i\\theta}e^{-i\\theta} = 1"}</M>, so they become static:</P>
            <Eq>{"c_1^2\\varphi_1^2(x) + c_2^2\\varphi_2^2(x)"}</Eq>
            <P><b>Step 4.</b> Combine the exponents in the two cross terms:</P>
            <Eq>{"c_1 c_2\\varphi_1\\varphi_2\\left[e^{+i(E_1-E_2)t/\\hbar} + e^{-i(E_1-E_2)t/\\hbar}\\right]"}</Eq>
            <P><b>Step 5.</b> Apply Euler's formula <M>{"e^{+i\\theta} + e^{-i\\theta} = 2\\cos\\theta"}</M> with <M>{"\\theta = (E_1-E_2)t/\\hbar"}</M>. Since <M>{"\\cos"}</M> is even, flip the sign inside:</P>
            <Eq>{"2c_1 c_2\\varphi_1(x)\\varphi_2(x)\\cos\\!\\left(\\frac{(E_2-E_1)t}{\\hbar}\\right)"}</Eq>
            <P><b>Step 6.</b> Combine everything:</P>
            <Eq>{"|\\Psi(x,t)|^2 = c_1^2\\varphi_1^2 + c_2^2\\varphi_2^2 + 2c_1 c_2\\varphi_1(x)\\varphi_2(x)\\cos\\!\\left(\\frac{(E_2-E_1)t}{\\hbar}\\right)"}</Eq>
            <P>Substituting the explicit infinite-well wavefunctions <M>{"\\varphi_n(x) = \\sqrt{2/a}\\sin(n\\pi x/a)"}</M>:</P>
            <Eq>{"|\\Psi(x,t)|^2 = \\frac{2}{a}\\left[c_1^2\\sin^2\\!\\frac{\\pi x}{a} + c_2^2\\sin^2\\!\\frac{2\\pi x}{a} + 2c_1 c_2\\sin\\!\\frac{\\pi x}{a}\\sin\\!\\frac{2\\pi x}{a}\\cos\\!\\left(\\frac{(E_2-E_1)t}{\\hbar}\\right)\\right]"}</Eq>
            <KeyConcept label="Where the cosine comes from">
              The two cross terms in <M>{"\\Psi^*\\Psi"}</M> are complex conjugates of each other, and any number plus its conjugate equals <M>{"2\\,\\text{Re}"}</M>, which for a pure phase <M>{"e^{i\\theta}"}</M> is <M>{"2\\cos\\theta"}</M>. The argument <M>{"(E_2-E_1)t/\\hbar"}</M> is the <b>difference</b> of the two phase rates, because the <M>{"e^{+iE_1 t/\\hbar}"}</M> from <M>{"\\Psi^*"}</M> partially cancels the <M>{"e^{-iE_2 t/\\hbar}"}</M> from <M>{"\\Psi"}</M>, leaving only the mismatch. That mismatch is what makes <M>{"|\\Psi|^2"}</M> slosh at the Bohr frequency <M>{"\\omega_{21} = (E_2-E_1)/\\hbar"}</M>.
            </KeyConcept>
          </CollapsibleBlock>
        </Section>
      </div>
    ),
  },
  {
    id: "graph-preview",
    tab: "Graph Preview",
    title: "All Graphs",
    subtitle: "Screenshot this tab and send to the chatbot for visual review",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="1. Infinite Well Wavefunctions">
          <InfiniteWellWavefunctions params={gp.infiniteWellWavefunctions} mid="p1" />
        </Section>
        <Section title="2. Probability Density |psi_n(x)|^2">
          <ProbabilityDensity params={gp.probabilityDensity} mid="p2" />
        </Section>
        <Section title="3. Energy Level Diagram">
          <EnergyLevelDiagram params={gp.energyLevelDiagram} mid="p3" />
        </Section>
        <Section title="4. Interactive: Well Width Explorer">
          <WellWidthExplorer mid="p4" />
        </Section>
        <Section title="5. Interactive: Classical vs Quantum (Correspondence Principle)">
          <ClassicalQuantumComparison mid="p5" />
        </Section>
        <Section title="6. Interactive: Standing Wave Animation">
          <StandingWaveAnimation mid="p6" />
        </Section>
        <Section title="7. Interactive: Time-Evolving Wavefunction">
          <TimeEvolvingWavefunction mid="p7" />
        </Section>
      </div>
    ),
  },
];

// ─── UI Components (copy verbatim) ───

function Section({ title, children }) {
  return <div className="section"><h3 className="section-title">{title}</h3>{children}</div>;
}
function P({ children }) { return <p className="para">{children}</p>; }
function KeyConcept({ label, children }) {
  return <div className="key-concept"><span className="kc-label">{label}</span><div className="kc-body">{children}</div></div>;
}

// ─── Reference Image Component (copy verbatim) ───

function RefImg({ data, alt, caption }) {
  return (
    <div style={{ margin: "14px 0", background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: 6, padding: 12, textAlign: "center" }}>
      <img src={`data:image/png;base64,${data}`} alt={alt}
           style={{ maxWidth: "100%", borderRadius: 4 }} />
      {caption && <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--text-dim)",
        fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>{caption}</p>}
    </div>
  );
}

function CollapsibleBlock({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="collapsible-block">
      <button className="collapsible-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "\u25BC" : "\u25BA"} {title}
      </button>
      {open && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

// ─── Styles (copy verbatim) ───

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root, .theme-dark {
  --bg-main: #0a0c10;
  --bg-panel: #0d0f14;
  --bg-card: #111318;
  --bg-eq: #13151c;
  --accent: #c8a45a;
  --border: #1e2028;
  --text-primary: #e4e4e8;
  --text-secondary: #b0b4c4;
  --text-dim: #6b7084;
  --text-muted: #9498ac;
  --chat-user-bg: #1c2333;
  --chat-user-text: #c0c8e0;
  --chat-input-text: #c0c8e0;
  --chat-placeholder: #3a3e52;
  --chat-chip-bg: #1a1c24;
  --chat-chip-border: rgba(200, 164, 90, 0.2);
  --chat-katex: #e8d89c;
  --chat-badge-text: #0a0c10;
  --chat-toggle-active-bg: #1a1c24;
  --chat-sent-dim: rgba(200, 164, 90, 0.53);
  --chat-sent-dim-bg: rgba(26, 28, 36, 0.53);
  --chat-stop-contrast: #0a0c10;
  --chat-stop-color: #e06c75;
  --ctx-hover-outline: rgba(200, 164, 90, 0.4);
  --ctx-hover-bg: rgba(200, 164, 90, 0.04);
  --ctx-flash-bg: rgba(200, 164, 90, 0.13);
}
.theme-light {
  --bg-main: #f5f5f7;
  --bg-panel: #eaeaee;
  --bg-card: #ffffff;
  --bg-eq: #f0efe8;
  --accent: #9a7b2e;
  --border: #d0d0d0;
  --text-primary: #1a1a1a;
  --text-secondary: #333;
  --text-dim: #777;
  --text-muted: #555;
  --chat-user-bg: #d6dce8;
  --chat-user-text: #1a1a2e;
  --chat-input-text: #1a1a1a;
  --chat-placeholder: #999;
  --chat-chip-bg: #e0ddd4;
  --chat-chip-border: rgba(154, 123, 46, 0.25);
  --chat-katex: #6b5a1e;
  --chat-badge-text: #ffffff;
  --chat-toggle-active-bg: #e0ddd4;
  --chat-sent-dim: rgba(154, 123, 46, 0.5);
  --chat-sent-dim-bg: rgba(220, 218, 210, 0.6);
  --chat-stop-contrast: #ffffff;
  --chat-stop-color: #c0392b;
  --ctx-hover-outline: rgba(154, 123, 46, 0.3);
  --ctx-hover-bg: rgba(154, 123, 46, 0.04);
  --ctx-flash-bg: rgba(154, 123, 46, 0.13);
}

.header { padding: 20px 24px 12px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border); background: var(--bg-panel); }
.header > div { flex: 1; min-width: 0; }
.header h1 { margin: 0 0 2px; font-size: 17px; font-weight: 700; color: var(--accent); letter-spacing: 0.08em; text-transform: uppercase; font-family: 'IBM Plex Mono', monospace; }
.header p { margin: 0; font-size: 14px; color: var(--text-dim); }
.theme-toggle-btn { flex-shrink: 0; padding: 6px 14px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-card); color: var(--text-dim); font-size: 11px; font-family: 'IBM Plex Mono', monospace; font-weight: 500; cursor: pointer; transition: all 0.15s; letter-spacing: 0.05em; text-transform: uppercase; }
.theme-toggle-btn:hover { color: var(--accent); border-color: var(--accent); }

.tab-bar { display: flex; overflow-x: auto; background: var(--bg-panel); border-bottom: 1px solid var(--border); scrollbar-width: none; }
.tab-bar::-webkit-scrollbar { display: none; }
.tab-btn { flex-shrink: 0; padding: 10px 16px; background: none; border: none; border-bottom: 2px solid transparent; color: var(--text-dim); font-size: 14px; font-family: 'IBM Plex Mono', monospace; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.15s; }
.tab-btn:hover { color: var(--text-muted); background: var(--bg-card); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); background: var(--bg-card); }

.lesson-body { padding: 24px; max-width: 920px; }
.section { margin-bottom: 28px; }
.section-title { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
.para { font-size: 16px; line-height: 1.65; color: var(--text-secondary); margin: 0 0 10px; }
.para b { color: var(--text-primary); font-weight: 600; }
.para i { color: var(--text-muted); }

.ctrl-btn { padding: 6px 16px; border-radius: 4px; border: 1px solid var(--border); background: var(--bg-main); color: var(--text-primary); font-family: 'IBM Plex Mono', monospace; font-size: 12px; cursor: pointer; transition: background 0.15s; }
.ctrl-btn:hover { background: var(--accent); color: var(--bg-main); }

.eq-block { margin: 12px 0; padding: 14px 18px; background: var(--bg-eq); border-left: 3px solid var(--accent); border-radius: 0 6px 6px 0; overflow-x: auto; }
.eq-block .katex { font-size: 1.15em; }
.eq-block .katex-html { color: var(--chat-katex); }
.eq-inline .katex { font-size: 1.0em; }
.eq-inline .katex-html { color: var(--chat-katex); }

.key-concept { margin: 10px 0; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.kc-label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 14px; font-weight: 600; color: var(--accent); margin-bottom: 4px; }
.kc-body { font-size: 15px; line-height: 1.6; color: var(--text-muted); }

.info-list { margin: 8px 0; padding-left: 20px; list-style: none; }
.info-list li { position: relative; font-size: 15px; line-height: 2.2; color: var(--text-muted); padding-left: 4px; }
.info-list li::before { content: ">"; position: absolute; left: -16px; color: var(--accent); font-weight: 700; }

.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin: 12px 0; }
@media (max-width: 520px) { .compare-grid { grid-template-columns: 1fr; } }

.graph-controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; padding: 6px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.graph-controls label { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px; }
.graph-ctrl-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--accent); font-weight: 500; white-space: nowrap; min-width: 120px; }
.graph-slider { flex: 1; min-width: 100px; height: 4px; accent-color: var(--accent); cursor: pointer; }
.graph-select { background: var(--bg-main); border: 1px solid var(--border); border-radius: 4px; color: var(--text-muted); font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 3px 6px; cursor: pointer; }
.graph-select:focus { border-color: var(--accent); outline: none; }
.graph-select option { background: var(--bg-panel); color: var(--text-muted); }

.compare-card { padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.compare-card h4 { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--accent); font-family: 'IBM Plex Mono', monospace; }

.data-table { margin: 12px 0; overflow-x: auto; }
.data-table table { width: 100%; border-collapse: collapse; font-size: 15px; }
.data-table th { text-align: left; padding: 8px 12px; background: var(--bg-eq); color: var(--accent); font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; border-bottom: 1px solid var(--border); }
.data-table td { padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border); font-family: 'IBM Plex Mono', monospace; }

.content-area { flex: 1; overflow-y: auto; padding-bottom: 80px; }

/* --- Chatbot --- */
.chat-toggle { position: fixed; bottom: 20px; right: 20px; width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--border); background: var(--bg-card); color: var(--accent); font-size: 20px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.5); transition: all 0.2s; z-index: 1000; display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono', monospace; }
.chat-toggle:hover { background: var(--bg-panel); transform: scale(1.05); }
.chat-toggle-open { background: var(--chat-toggle-active-bg); border-color: var(--chat-chip-border); }
.chat-badge { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; background: var(--accent); color: var(--chat-badge-text); font-size: 10px; font-weight: 700; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; font-family: 'IBM Plex Mono', monospace; }

.chat-panel { position: fixed; bottom: 12px; right: 12px; width: min(42vw, 720px); height: calc(85vh); max-height: calc(100vh - 80px); background: var(--bg-panel); border: 1px solid var(--border); border-radius: 12px; display: flex; flex-direction: column; z-index: 999; box-shadow: 0 8px 40px rgba(0,0,0,0.6); overflow: hidden; transition: width 0.25s ease, height 0.25s ease, bottom 0.25s ease, left 0.25s ease; }
.chat-panel-expanded { --chat-content-w: 768px; right: 12px; bottom: 12px; top: 12px; height: auto; width: calc(100vw - var(--chat-content-w) - 24px); min-width: 380px; max-width: calc(100vw - 24px); }
@media (max-width: 1100px) { .chat-panel-expanded { width: min(600px, calc(100vw - 40px)); top: auto; height: min(80vh, 700px); } }
@media (max-width: 480px) { .chat-panel { width: calc(100vw - 32px); right: 16px; bottom: 12px; height: 60vh; } .chat-panel-expanded { width: calc(100vw - 16px); right: 8px; bottom: 8px; top: 8px; height: auto; } }

.chat-header { padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--bg-card); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.chat-header-title { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
.chat-header-topic { font-size: 13px; color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
.chat-model-select { background: var(--bg-main); border: 1px solid var(--border); border-radius: 5px; color: var(--text-muted); font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 3px 6px; outline: none; cursor: pointer; flex-shrink: 0; }
.chat-model-select:focus { border-color: var(--chat-chip-border); }
.chat-model-select option { background: var(--bg-panel); color: var(--text-muted); }
.chat-expand-btn { background: none; border: 1px solid var(--border); border-radius: 5px; color: var(--text-dim); font-size: 14px; cursor: pointer; padding: 2px 6px; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; transition: color 0.15s; line-height: 1; }
.chat-expand-btn:hover { color: var(--accent); border-color: var(--chat-chip-border); }
.chat-kill-btn { padding: 2px 6px; border-radius: 5px; border: 1px solid var(--chat-stop-color); background: none; color: var(--chat-stop-color); font-size: 10px; font-family: 'IBM Plex Mono', monospace; font-weight: 700; cursor: pointer; letter-spacing: 0.05em; flex-shrink: 0; line-height: 1; }
.chat-kill-btn:hover { background: var(--chat-stop-color); color: var(--bg-main); }

.chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; min-height: 0; }
.chat-empty { font-size: 15px; color: var(--text-dim); line-height: 1.6; padding: 24px 8px; text-align: center; }
.chat-msg { display: flex; flex-direction: column; }
.chat-msg-user { align-items: flex-end; }
.chat-msg-assistant { align-items: flex-start; }
.chat-msg-bubble { max-width: 90%; padding: 10px 14px; border-radius: 12px; font-size: 16px; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word; }
.chat-msg-user .chat-msg-bubble { background: var(--chat-user-bg); color: var(--chat-user-text); border-bottom-right-radius: 4px; white-space: pre-wrap; }

.chat-msg-rendered { background: transparent; color: var(--text-secondary); border: none; padding: 10px 4px; max-width: 100%; }
.chat-msg-rendered strong { color: var(--text-primary); font-weight: 600; }
.chat-msg-rendered .chat-code { background: var(--bg-eq); color: var(--chat-katex); padding: 1px 5px; border-radius: 4px; font-family: 'IBM Plex Mono', monospace; font-size: 0.9em; }
.chat-msg-rendered .chat-pre { background: var(--bg-eq); border: 1px solid var(--border); border-radius: 6px; padding: 12px 14px; margin: 8px 0; overflow-x: auto; }
.chat-msg-rendered .chat-code-block { font-family: 'IBM Plex Mono', monospace; font-size: 0.85em; color: var(--chat-katex); white-space: pre; display: block; }
.chat-msg-rendered .chat-eq-block { margin: 8px 0; padding: 10px 14px; background: var(--bg-eq); border-left: 3px solid var(--accent); border-radius: 0 6px 6px 0; overflow-x: auto; }
.chat-msg-rendered .chat-eq-block .katex { font-size: 1.1em; }
.chat-msg-rendered .katex { font-size: 1.0em; }
.chat-msg-rendered .katex-html { color: var(--chat-katex); }
.chat-msg-rendered em { color: var(--text-muted); font-style: italic; }
.chat-msg-rendered .chat-h { font-size: 16px; font-weight: 700; color: var(--accent); margin: 10px 0 4px; font-family: 'IBM Plex Mono', monospace; }
.chat-msg-rendered .chat-ul { margin: 4px 0; padding-left: 18px; }
.chat-msg-rendered .chat-ol { margin: 4px 0; padding-left: 22px; }
.chat-msg-rendered .chat-li, .chat-msg-rendered .chat-oli { font-size: 16px; line-height: 1.6; color: var(--text-secondary); }
.chat-msg-rendered .chat-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 15px; }
.chat-msg-rendered .chat-table th { background: var(--bg-eq); color: var(--accent); font-weight: 600; font-family: 'IBM Plex Mono', monospace; padding: 6px 10px; border: 1px solid var(--border); text-align: left; }
.chat-msg-rendered .chat-table td { padding: 5px 10px; border: 1px solid var(--border); color: var(--text-secondary); }
.chat-msg-rendered .chat-table tr:hover td { background: var(--bg-eq); }
.chat-msg-rendered .chat-hr { border: none; border-top: 1px solid var(--border); margin: 10px 0; }

.chat-loading { display: flex !important; flex-direction: row !important; gap: 5px; padding: 12px 16px !important; }
.chat-loading span { width: 6px; height: 6px; background: var(--text-dim); border-radius: 50%; animation: chatBounce 1.2s infinite; }
.chat-loading span:nth-child(2) { animation-delay: 0.15s; }
.chat-loading span:nth-child(3) { animation-delay: 0.3s; }
@keyframes chatBounce { 0%,80%,100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }

.chat-input-row { display: flex; gap: 8px; padding: 10px 12px; border-top: 1px solid var(--border); background: var(--bg-card); flex-shrink: 0; }
.chat-input { flex: 1; background: var(--bg-main); border: 1px solid var(--border); border-radius: 8px; color: var(--chat-input-text); padding: 8px 12px; font-size: 16px; font-family: 'IBM Plex Sans', sans-serif; resize: none; outline: none; line-height: 1.4; min-width: 0; }
.chat-input::placeholder { color: var(--chat-placeholder); }
.chat-input:focus { border-color: var(--chat-chip-border); }
.chat-send { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--accent); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }
.chat-send:hover:not(:disabled) { background: var(--bg-panel); }
.chat-send:disabled { opacity: 0.3; cursor: default; }

.chat-attach-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--accent); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; line-height: 1; }
.chat-attach-btn:hover { background: var(--bg-panel); }
.chat-stop { width: 36px; height: 36px; border-radius: 8px; border: 1px solid var(--chat-stop-color); background: transparent; color: var(--chat-stop-color); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }
.chat-stop:hover { background: var(--chat-stop-color); color: var(--chat-stop-contrast); }

.chat-att-bar { padding: 6px 12px; border-top: 1px solid var(--border); background: var(--bg-panel); display: flex; flex-wrap: wrap; gap: 6px; max-height: 90px; overflow-y: auto; flex-shrink: 0; }
.chat-att-preview { position: relative; display: inline-flex; align-items: center; gap: 4px; background: var(--chat-chip-bg); border: 1px solid var(--chat-chip-border); border-radius: 6px; padding: 3px; }
.chat-att-thumb { height: 48px; max-width: 80px; border-radius: 4px; object-fit: cover; display: block; }
.chat-att-fname { font-size: 10px; color: var(--accent); font-family: 'IBM Plex Mono', monospace; padding: 4px 6px; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-att-rm { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; border-radius: 50%; border: none; background: var(--chat-stop-color); color: var(--chat-stop-contrast); font-size: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: 'IBM Plex Mono', monospace; line-height: 1; }

.chat-msg-att-list { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; justify-content: flex-end; }
.chat-att-thumb-sent { height: 56px; max-width: 100px; border-radius: 6px; object-fit: cover; border: 1px solid var(--border); }
.chat-att-file-sent { font-size: 10px; color: var(--chat-sent-dim); font-family: 'IBM Plex Mono', monospace; background: var(--chat-sent-dim-bg); border-radius: 4px; padding: 4px 8px; }

/* --- Context Selection --- */
.ctx-active .eq-block, .ctx-active .key-concept, .ctx-active .compare-card, .ctx-active .para, .ctx-active .info-list li, .ctx-active .section-title { cursor: pointer; transition: outline 0.15s, background 0.15s; border-radius: 4px; }
.ctx-active .eq-block:hover, .ctx-active .key-concept:hover, .ctx-active .compare-card:hover, .ctx-active .para:hover, .ctx-active .info-list li:hover { outline: 1px dashed var(--ctx-hover-outline); outline-offset: 2px; background: var(--ctx-hover-bg); }

@keyframes ctxFlash { 0% { background: var(--ctx-flash-bg); outline: 2px solid var(--accent); outline-offset: 2px; } 100% { background: transparent; outline: 2px solid transparent; outline-offset: 2px; } }
.ctx-flash { animation: ctxFlash 0.6s ease-out !important; }
.ctx-sel-flash { background: var(--accent); color: var(--chat-stop-contrast); font-size: 11px; font-weight: 600; font-family: 'IBM Plex Mono', monospace; padding: 2px 8px; border-radius: 4px; pointer-events: none; z-index: 9999; animation: ctxSelPop 0.8s ease-out forwards; }
@keyframes ctxSelPop { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-10px); } }

.chat-ctx-bar { padding: 6px 12px; border-top: 1px solid var(--border); background: var(--bg-panel); display: flex; flex-wrap: wrap; gap: 4px; max-height: 72px; overflow-y: auto; flex-shrink: 0; }
.chat-ctx-chip { display: flex; align-items: center; gap: 4px; background: var(--chat-chip-bg); border: 1px solid var(--chat-chip-border); border-radius: 6px; padding: 3px 8px; font-size: 11px; color: var(--accent); font-family: 'IBM Plex Mono', monospace; max-width: 100%; overflow: hidden; }
.chat-ctx-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-ctx-chip-x { background: none; border: none; color: var(--text-dim); font-size: 10px; cursor: pointer; padding: 0 2px; flex-shrink: 0; font-family: 'IBM Plex Mono', monospace; }
.chat-ctx-chip-x:hover { color: var(--chat-stop-color); }
.chat-msg-ctx-list { display: flex; flex-direction: column; gap: 3px; margin-bottom: 4px; align-items: flex-end; }
.chat-msg-ctx-chip-sent { font-size: 10px; color: var(--chat-sent-dim); font-family: 'IBM Plex Mono', monospace; background: var(--chat-sent-dim-bg); border-radius: 4px; padding: 2px 6px; max-width: 85%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.chat-tabs { display: flex; align-items: center; gap: 2px; margin-right: 6px; overflow-x: auto; max-width: 180px; scrollbar-width: none; }
.chat-tabs::-webkit-scrollbar { display: none; }
.chat-tab { position: relative; padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); background: none; color: var(--text-dim); font-size: 10px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; white-space: nowrap; flex-shrink: 0; }
.chat-tab.active { background: var(--accent); color: var(--bg-main); border-color: var(--accent); }
.chat-tab-x { margin-left: 3px; font-size: 8px; opacity: 0.6; cursor: pointer; }
.chat-tab-x:hover { opacity: 1; }
.chat-tab-add { padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); background: none; color: var(--accent); font-size: 12px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; flex-shrink: 0; font-weight: 700; }
.chat-tab-add:hover { background: var(--bg-eq); }
.chat-resize-l { position: absolute; left: -3px; top: 12px; bottom: 12px; width: 6px; cursor: ew-resize; z-index: 10; }
.chat-resize-t { position: absolute; top: -3px; left: 12px; right: 12px; height: 6px; cursor: ns-resize; z-index: 10; }
.chat-resize-tl { position: absolute; top: -4px; left: -4px; width: 12px; height: 12px; cursor: nwse-resize; z-index: 11; }
.chat-status { font-size: 14px; color: var(--text-dim); font-style: italic; font-family: 'IBM Plex Mono', monospace; padding: 4px 16px; opacity: 0.7; }

/* --- Chat Reply Blocks --- */
.chat-msg-rendered [data-chat-block] { cursor: pointer; transition: outline 0.15s, background 0.15s; border-radius: 3px; }
.chat-msg-rendered [data-chat-block]:hover { outline: 1px dashed var(--ctx-hover-outline); outline-offset: 2px; background: var(--ctx-hover-bg); }
.chat-reply-block { padding: 2px 0; }

/* --- Context Menu --- */
.ctx-menu { position: fixed; z-index: 10000; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 4px 0; box-shadow: 0 4px 16px rgba(0,0,0,0.4); font-family: 'IBM Plex Mono', monospace; min-width: 160px; }
.ctx-menu-item { display: block; width: 100%; padding: 6px 14px; background: none; border: none; color: var(--text-secondary); font-size: 14px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; text-align: left; }
.ctx-menu-item:hover { background: var(--ctx-hover-bg); color: var(--accent); }

/* --- Collapsible Block --- */
.collapsible-block { margin: 10px 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.collapsible-toggle { width: 100%; text-align: left; padding: 8px 12px; background: var(--bg-eq); border: none; color: var(--text-muted); font-size: 14px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; transition: color 0.15s; }
.collapsible-toggle:hover { color: var(--accent); }
.collapsible-content { padding: 12px 14px; background: var(--bg-card); }

/* --- Inline demo blocks --- */
.chat-demo-block { margin: 8px 0; padding: 10px; background: var(--bg-eq); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.chat-demo-title { font-size: 11px; font-family: 'IBM Plex Mono', monospace; color: var(--accent); margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
.chat-demo-block svg { display: block; margin: 0 auto; }

/* --- Media blocks (images, videos, standalone SVGs) --- */
.chat-media-block { margin: 8px 0; padding: 10px; background: var(--bg-eq); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; text-align: center; }
.chat-media-block img, .chat-media-block video { max-width: 100%; border-radius: 6px; display: block; margin: 0 auto; }
.chat-media-block svg { display: block; margin: 0 auto; max-width: 100%; }

/* --- Sources dropdown --- */
.chat-sources { margin: 10px 0 4px 0; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; background: var(--bg-eq); }
.chat-sources summary { padding: 6px 10px; cursor: pointer; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.05em; }
.chat-sources summary:hover { color: var(--accent); }
.chat-sources ul { padding: 6px 10px 8px 24px; margin: 0; list-style: disc; }
.chat-sources li { color: var(--text-muted); margin: 2px 0; line-height: 1.5; }
.chat-sources a { color: var(--accent); text-decoration: none; }
.chat-sources a:hover { text-decoration: underline; }

/* --- Suggestion bar --- */
.suggestion-bar { display: flex; align-items: center; gap: 8px; margin-top: 6px; padding: 6px 10px; background: var(--bg-eq); border: 1px solid var(--border); border-radius: 6px; flex-wrap: wrap; }
.suggestion-label { font-size: 12px; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; flex: 1; min-width: 120px; }
.suggestion-btn { padding: 3px 10px; border-radius: 5px; border: 1px solid var(--border); font-size: 11px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; transition: all 0.15s; }
.s-btn-lesson { background: var(--accent); color: var(--bg-main); border-color: var(--accent); font-weight: 600; }
.s-btn-lesson:hover { opacity: 0.85; }
.s-btn-faq { background: var(--bg-panel); color: var(--accent); border-color: var(--accent); }
.s-btn-faq:hover { background: var(--bg-eq); }
.s-btn-no { background: none; color: var(--text-dim); }
.s-btn-no:hover { color: var(--chat-stop-color); border-color: var(--chat-stop-color); }

/* --- Thread panel --- */
.thread-panel { margin-top: 6px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--bg-card); font-size: 14px; }
.thread-header { display: flex; align-items: center; gap: 8px; padding: 5px 10px; background: var(--bg-eq); cursor: pointer; flex-wrap: wrap; min-height: 30px; }
.thread-collapse-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 10px; padding: 0 2px; flex-shrink: 0; }
.thread-collapse-btn:hover { color: var(--accent); }
.thread-snippet { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--text-muted); font-style: italic; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.thread-count { font-size: 11px; color: var(--text-dim); font-family: 'IBM Plex Mono', monospace; flex-shrink: 0; }
.thread-close-btn { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 10px; padding: 0 2px; flex-shrink: 0; margin-left: auto; opacity: 0.5; }
.thread-close-btn:hover { opacity: 1; color: var(--chat-stop-color); }
.thread-portal-slot { margin: 4px 0; }
.thread-body { padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.thread-msg { display: flex; flex-direction: column; }
.thread-msg-user { align-items: flex-end; }
.thread-msg-assistant { align-items: flex-start; }
.thread-msg .chat-msg-bubble { font-size: 14px; padding: 6px 10px; }
.thread-msg .chat-msg-rendered { font-size: 14px; padding: 4px 2px; }
.thread-loading { display: flex; gap: 4px; padding: 6px 4px; }
.thread-loading span { width: 5px; height: 5px; background: var(--text-dim); border-radius: 50%; animation: chatBounce 1.2s infinite; }
.thread-loading span:nth-child(2) { animation-delay: 0.15s; }
.thread-loading span:nth-child(3) { animation-delay: 0.3s; }
.thread-input-row { display: flex; gap: 6px; padding-top: 4px; border-top: 1px solid var(--border); margin-top: 4px; }
.thread-input { flex: 1; background: var(--bg-main); border: 1px solid var(--border); border-radius: 6px; color: var(--chat-input-text); padding: 6px 10px; font-size: 14px; font-family: 'IBM Plex Sans', sans-serif; resize: none; outline: none; line-height: 1.4; min-width: 0; }
.thread-input:focus { border-color: var(--chat-chip-border); }
.thread-send { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg-card); color: var(--accent); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.thread-send:hover { background: var(--bg-panel); }
.thread-ctx-bar { display: flex; flex-wrap: wrap; gap: 4px; padding: 4px 0; }
`;

// ─── Chat Message Renderer (copy verbatim) ───

function ChatBubble({ text, role, onReplyBlock, streaming }) {
  const ref = useRef(null);
  const replyRef = useRef(onReplyBlock);
  replyRef.current = onReplyBlock;

  useEffect(() => {
    if (!ref.current || role !== "assistant" || !window.katex) return;
    const fencedBlocks = [];
    // Extract demo blocks before any escaping (they contain raw HTML/SVG)
    const demoBlocks = [];
    let s = text.replace(/<div class="chat-demo-block"><div class="chat-demo-title">[\s\S]*?<\/div>[\s\S]*?<\/div>/g, (match) => {
      demoBlocks.push(match);
      return `\x00DB${demoBlocks.length - 1}\x00`;
    });
    // Extract sources dropdowns (from processResponse)
    s = s.replace(/<details class="chat-sources">[\s\S]*?<\/details>/g, (match) => {
      demoBlocks.push(match);
      return `\x00DB${demoBlocks.length - 1}\x00`;
    });
    s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      fencedBlocks.push(`<pre class="chat-pre"><code class="chat-code-block">${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`);
      return `\x00FB${fencedBlocks.length - 1}\x00`;
    });
    // Extract raw SVG, img, video blocks and markdown images (after code fences, before escaping)
    const mediaBlocks = [];
    s = s.replace(/<svg\b[\s\S]*?<\/svg>/g, (match) => { mediaBlocks.push(`<div class="chat-media-block">${match}</div>`); return `\x00ME${mediaBlocks.length - 1}\x00`; });
    s = s.replace(/<img\s[^>]*\/?>/gi, (match) => { mediaBlocks.push(`<div class="chat-media-block">${match}</div>`); return `\x00ME${mediaBlocks.length - 1}\x00`; });
    s = s.replace(/<video\b[\s\S]*?<\/video>/gi, (match) => { mediaBlocks.push(`<div class="chat-media-block">${match}</div>`); return `\x00ME${mediaBlocks.length - 1}\x00`; });
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const isVid = /\.(mp4|webm|mov|ogg)$/i.test(src);
      mediaBlocks.push(isVid
        ? `<div class="chat-media-block"><video controls src="${src}" style="max-width:100%"><p>${alt || 'Video'}</p></video></div>`
        : `<div class="chat-media-block"><img src="${src}" alt="${alt}" style="max-width:100%"/></div>`);
      return `\x00ME${mediaBlocks.length - 1}\x00`;
    });
    const inlineCode = [];
    s = s.replace(/`([^`]+)`/g, (_, code) => {
      inlineCode.push(`<code class="chat-code">${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>`);
      return `\x00IC${inlineCode.length - 1}\x00`;
    });
    // Convert \[...\] and \(...\) to $$...$$ and $...$
    s = s.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => `$$${inner}$$`);
    s = s.replace(/\\\((.+?)\\\)/g, (_, inner) => `$${inner}$`);
    // Detect standalone equation lines: lines with LaTeX commands but no prose
    s = s.replace(/^[ \t]*([A-Za-z0-9_()|][\s\S]*?\\(?:frac|sqrt|hbar|int|sum|prod|left|right|infty|text|mathrm|begin|end|psi|Psi|phi|Phi|alpha|beta|gamma|delta|Delta|sigma|Sigma|lambda|Lambda|theta|Theta|pi|Pi|epsilon|mu|nu|omega|Omega|partial|nabla|vec|hat|bar|dot|ddot|tilde|underbrace|overbrace|overline|underline|quad|qquad|cdot|times|approx|neq|geq|leq|pm|mp|dfrac|exp|ln|log|sin|cos|tan|lim|det)[\s\S]*?)$/gm, (match) => {
      if (/\$/.test(match)) return match;
      const stripped = match.trim();
      const proseWords = stripped.match(/(?<!\\)[a-z]{4,}/g) || [];
      const realProse = proseWords.filter(w => !/^(frac|sqrt|hbar|left|right|text|mathrm|begin|end|infty|alpha|beta|gamma|delta|sigma|lambda|theta|epsilon|omega|partial|nabla|quad|qquad|cdot|times|approx|sqrt|prod|dfrac|cases|bmatrix|pmatrix|matrix)$/.test(w));
      if (realProse.length <= 2) return `$$${stripped}$$`;
      return match;
    });
    s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const mathBlocks = [];
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m) => { mathBlocks.push(m); return `\x00MB${mathBlocks.length - 1}\x00`; });
    s = s.replace(/\$([^$]+?)\$/g, (m) => { mathBlocks.push(m); return `\x00MB${mathBlocks.length - 1}\x00`; });
    s = s.replace(/\|([A-Za-z])_([A-Za-z0-9]{1,5})\|/g, (_, l, sub) => `$|${l}_{${sub}}|$`);
    s = s.replace(/(?<![A-Za-z_$\\])([A-Z])_([A-Za-z0-9]{1,5})(?![A-Za-z0-9_{$\x00])/g, (_, l, sub) => `$${l}_{${sub}}$`);
    s = s.replace(/(?<![A-Za-z_$\\])([a-z])_(m|mb|o|n|p|bs|gs|ds|ov|ox|on|i|f|be)(?![A-Za-z0-9_{$\x00])/g, (_, l, sub) => `$${l}_{${sub}}$`);
    {
      const latexCmdRe = /\\([a-zA-Z]{2,})/g;
      let match;
      const wraps = [];
      while ((match = latexCmdRe.exec(s)) !== null) {
        const cmdStart = match.index;
        let exprStart = cmdStart;
        const before = s.slice(0, cmdStart);
        const leadMatch = before.match(/((?:[A-Za-z0-9_()\x00]+\s*)?(?:=|[-+*/])\s*)$/);
        if (leadMatch) exprStart = cmdStart - leadMatch[0].length;
        let pos = match.index + match[0].length;
        let depth = 0;
        while (pos < s.length) {
          const ch = s[pos];
          if (ch === '{') { depth++; pos++; }
          else if (ch === '}') { if (depth > 0) { depth--; pos++; } else break; }
          else if (ch === '\\' && pos + 1 < s.length && /[a-zA-Z]/.test(s[pos + 1])) {
            const sub = s.slice(pos).match(/^\\[a-zA-Z]+/);
            if (sub) pos += sub[0].length; else pos++;
          }
          else if (depth > 0) { pos++; }
          else if (/[A-Za-z0-9_{}^()=+\-*/.,|!]/.test(ch)) {
            const ahead = s.slice(pos);
            if (/^[a-z]{3,}/.test(ahead) && !/^(sin|cos|tan|log|ln|exp|min|max|lim|det|deg|dim|inf|sup|mod|gcd)\b/.test(ahead)) break;
            pos++;
          }
          else if (ch === ' ' && depth === 0) {
            const ahead = s.slice(pos + 1);
            if (/^[\\{A-Z_^(|]/.test(ahead) || /^[+\-=*/]/.test(ahead) || /^[0-9]/.test(ahead)) { pos++; }
            else break;
          }
          else break;
        }
        while (pos > match.index + match[0].length && /[\s.,;]/.test(s[pos - 1])) pos--;
        if (pos > match.index + match[0].length) wraps.push({ start: exprStart, end: pos });
      }
      wraps.sort((a, b) => a.start - b.start || b.end - a.end);
      const filtered = [];
      for (const w of wraps) {
        if (filtered.length > 0 && w.start < filtered[filtered.length - 1].end) continue;
        filtered.push(w);
      }
      for (let i = filtered.length - 1; i >= 0; i--) {
        const w = filtered[i];
        const expr = s.slice(w.start, w.end).trim();
        if (expr) s = s.slice(0, w.start) + `$${expr}$` + s.slice(w.end);
      }
    }
    s = s.replace(/\x00MB(\d+)\x00/g, (_, i) => mathBlocks[parseInt(i)]);
    // Helper: decode HTML entities inside LaTeX before passing to KaTeX
    const deHtml = (tex) => tex.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    // Render display math FIRST (before merge step, which can corrupt $$)
    s = s.replace(/\$\$(.+?)\$\$/gs, (_, tex) => {
      try { return '<div class="chat-eq-block">' + window.katex.renderToString(deHtml(tex).trim(), { displayMode: true, throwOnError: false }).replace(/\n/g, '') + '</div>'; }
      catch (e) { return `<div class="chat-eq-block"><code>${tex}</code></div>`; }
    });
    // Merge adjacent inline math separated by operators: $a$ > $b$ → $a > b$
    let _prev;
    do {
      _prev = s;
      s = s.replace(/\$([^$]+)\$\s*([-+=]|&gt;=?|&lt;=?|\\ge|\\le|\\gt|\\lt)\s*\$([^$]+)\$/g, (_, a, op, b) => {
        const m = { '&gt;=': '\\ge ', '&lt;=': '\\le ', '&gt;': '\\gt ', '&lt;': '\\lt ', '=': '= ', '-': '- ', '+': '+ ' };
        return `$${a} ${m[op] || op + ' '}${b}$`;
      });
      s = s.replace(/\$([^$]+)\$\$([^$]+)\$/g, (_, a, b) => `$${a} ${b}$`);
    } while (s !== _prev);
    // Render inline math
    s = s.replace(/\$(.+?)\$/g, (_, tex) => {
      try { return window.katex.renderToString(deHtml(tex).trim(), { displayMode: false, throwOnError: false }).replace(/\n/g, ''); }
      catch (e) { return `<code>${tex}</code>`; }
    });
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    s = s.replace(/^### (.+)$/gm, '<h4 class="chat-h">$1</h4>');
    s = s.replace(/^## (.+)$/gm, '<h3 class="chat-h">$1</h3>');
    s = s.replace(/^# (.+)$/gm, '<h3 class="chat-h">$1</h3>');
    // Horizontal rules
    s = s.replace(/^---+$/gm, '<hr class="chat-hr"/>');
    // Markdown tables
    s = s.replace(/((?:^\|.+\|[ \t]*$\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2) return tableBlock;
      const parseRow = (r) => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const isSep = (r) => /^\|[-\s:|]+\|$/.test(r.trim());
      let headerRow = null;
      const bodyRows = [];
      let sepSeen = false;
      for (const r of rows) {
        if (isSep(r)) { sepSeen = true; continue; }
        if (!sepSeen && !headerRow) { headerRow = parseRow(r); }
        else { bodyRows.push(parseRow(r)); }
      }
      if (!headerRow) return tableBlock;
      let html = '<table class="chat-table"><thead><tr>';
      for (const h of headerRow) html += `<th>${h}</th>`;
      html += '</tr></thead><tbody>';
      for (const row of bodyRows) {
        html += '<tr>';
        for (const c of row) html += `<td>${c}</td>`;
        html += '</tr>';
      }
      html += '</tbody></table>';
      return html;
    });
    s = s.replace(/^- (.+)$/gm, '<li class="chat-li">$1</li>');
    s = s.replace(/((?:<li class="chat-li">.*<\/li>\n?)+)/g, '<ul class="chat-ul">$1</ul>');
    s = s.replace(/^\d+\. (.+)$/gm, '<li class="chat-oli">$1</li>');
    s = s.replace(/((?:<li class="chat-oli">.*<\/li>\n?)+)/g, '<ol class="chat-ol">$1</ol>');
    s = s.replace(/\n/g, '<br/>');
    s = s.replace(/\x00FB(\d+)\x00/g, (_, i) => fencedBlocks[parseInt(i)]);
    s = s.replace(/\x00IC(\d+)\x00/g, (_, i) => inlineCode[parseInt(i)]);
    s = s.replace(/\x00DB(\d+)\x00/g, (_, i) => demoBlocks[parseInt(i)]);
    s = s.replace(/\x00ME(\d+)\x00/g, (_, i) => mediaBlocks[parseInt(i)]);
    s = s.replace(/(<\/pre>|<\/h[34]>|<\/ul>|<\/ol>|<\/div>|<\/details>|<\/table>|<hr[^>]*>)<br\/>/g, '$1');
    s = s.replace(/<br\/>(<pre |<h[34] |<ul |<ol |<div class="chat-eq|<div class="chat-demo|<div class="chat-media|<details |<table |<hr )/g, '$1');
    ref.current.innerHTML = s;
  }, [text, role, streaming]);

  useEffect(() => {
    if (!ref.current || role !== "assistant" || streaming || !replyRef.current) return;
    const container = ref.current;
    const blockSel = '.chat-eq-block, .chat-pre, .chat-h, h3, h4, .chat-ul, .chat-ol, table, hr';
    container.querySelectorAll(blockSel).forEach(el => el.setAttribute('data-chat-block', ''));
    const nodes = Array.from(container.childNodes);
    const isBlock = (n) => n.nodeType === 1 && n.hasAttribute('data-chat-block');
    const isBr = (n) => n.nodeType === 1 && n.nodeName === 'BR';
    const groups = [];
    let run = [];
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (isBlock(n)) {
        if (run.length > 0) { groups.push({ type: 'i', nodes: run }); run = []; }
        groups.push({ type: 'b', node: n });
      } else if (isBr(n) && i + 1 < nodes.length && isBr(nodes[i + 1])) {
        run.push(n);
        groups.push({ type: 'i', nodes: run }); run = [];
        i++;
      } else {
        run.push(n);
      }
    }
    if (run.length > 0) groups.push({ type: 'i', nodes: run });
    while (container.firstChild) container.removeChild(container.firstChild);
    for (const g of groups) {
      if (g.type === 'b') { container.appendChild(g.node); continue; }
      const txt = g.nodes.map(n => n.textContent).join('').trim();
      if (txt.length > 2) {
        const w = document.createElement('div');
        w.setAttribute('data-chat-block', '');
        w.className = 'chat-reply-block';
        g.nodes.forEach(n => w.appendChild(n));
        container.appendChild(w);
      } else {
        g.nodes.forEach(n => container.appendChild(n));
      }
    }
  }, [text, role, streaming]);

  const handleBlockClick = useCallback((e) => {
    if (!replyRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) return;
    const block = e.target.closest('[data-chat-block]');
    if (!block) return;
    const blockText = block.textContent.trim();
    if (blockText.length < 3) return;
    let source = "chat reply";
    if (block.classList.contains('chat-eq-block')) source = "chat equation";
    else if (block.classList.contains('chat-pre')) source = "chat code";
    else if (block.classList.contains('chat-h') || block.nodeName === 'H3' || block.nodeName === 'H4') source = "chat heading";
    else if (block.classList.contains('chat-ul') || block.classList.contains('chat-ol')) source = "chat list";
    else if (block.nodeName === 'TABLE') source = "chat table";
    else source = "chat paragraph";
    replyRef.current(blockText, source);
    block.classList.remove('ctx-flash');
    void block.offsetWidth;
    block.classList.add('ctx-flash');
    setTimeout(() => block.classList.remove('ctx-flash'), 600);
  }, []);

  if (role === "assistant") return <div className="chat-msg-bubble chat-msg-rendered" ref={ref} onClick={handleBlockClick} />;
  return <div className="chat-msg-bubble">{text}</div>;
}

// ─── Tab factory (copy verbatim) ───

if (!window.__chatState) {
  window.__chatState = {
    threadCounter: Date.now(),
    tabIdCounter: 0,
    tabAborts: {},
    tabCancelled: {},
    threadAborts: {},
    activeThread: {},
    pendingSend: {},
  };
}
const _cs = window.__chatState;
function makeTab() {
  return {
    id: ++_cs.tabIdCounter,
    sessionId: null,
    chatNum: null,
    messages: [],
    sessionStatus: "idle",
    keepContext: false,
    isolated: true,
    loading: false,
    statusText: "",
  };
}
const _ss = window["session" + "Storage"];

// ─── Thread Panel Component ───

function ThreadPanel({ thread, onToggleCollapse, onSend, onDelete, contextTrigger }) {
  const [threadInput, setThreadInput] = useState("");
  const [threadCtx, setThreadCtx] = useState([]);
  const threadInputRef = useRef(null);
  const snippetPreview = thread.snippet.length > 50 ? thread.snippet.slice(0, 50) + "\u2026" : thread.snippet;
  // Mount-only: intentional empty deps for initial focus
  useEffect(() => {
    if (thread.messages.length === 0 && threadInputRef.current) threadInputRef.current.focus();
  }, []);
  useEffect(() => {
    if (threadInputRef.current) threadInputRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [thread.messages.length, thread.loading]);

  const addThreadCtx = useCallback((text, source) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < 3) return;
    setThreadCtx(prev => prev.some(s => s.text === clean) ? prev : [...prev, { text: clean, source }]);
    setTimeout(() => threadInputRef.current?.focus(), 0);
  }, []);

  // Watch for external context trigger (from context menu "Reply in this thread")
  useEffect(() => {
    if (contextTrigger && contextTrigger.threadId === thread.id) {
      addThreadCtx(contextTrigger.text, contextTrigger.source || "selection");
    }
  }, [contextTrigger, thread.id, addThreadCtx]);

  const handleSend = useCallback(() => {
    const text = threadInput.trim();
    if (!text) return;
    onSend(text, threadCtx.length > 0 ? [...threadCtx] : null);
    setThreadInput("");
    setThreadCtx([]);
  }, [threadInput, threadCtx, onSend]);

  return (
    <div className={`thread-panel ${thread.collapsed ? "thread-collapsed" : ""}`} data-thread-id={thread.id}>
      <div className="thread-header" onClick={onToggleCollapse}>
        <button className="thread-collapse-btn" title={thread.collapsed ? "Expand thread" : "Collapse thread"}>
          {thread.collapsed ? "\u25B6" : "\u25BC"}
        </button>
        <span className="thread-snippet">"{snippetPreview}"</span>
        <span className="thread-count">{thread.messages.length > 0 ? `${thread.messages.length}` : "new"}</span>
        <button className="thread-close-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete thread">{"\u2715"}</button>
      </div>
      {!thread.collapsed && (
        <div className="thread-body">
          {thread.messages.map((m, i) => (
            <div key={i} className={`thread-msg thread-msg-${m.role}`}>
              <ChatBubble text={m.content} role={m.role} onReplyBlock={addThreadCtx} streaming={!!m._streaming} />
            </div>
          ))}
          {thread.loading && <div className="thread-loading"><span /><span /><span /></div>}
          {!thread.loading && (
            <>
              {threadCtx.length > 0 && (
                <div className="thread-ctx-bar">
                  {threadCtx.map((s, i) => (
                    <div key={i} className="chat-ctx-chip">
                      <span className="chat-ctx-chip-text">{"+ "}{s.text.length > 30 ? s.text.slice(0, 30) + "\u2026" : s.text}</span>
                      <button className="chat-ctx-chip-x" onClick={(e) => { e.stopPropagation(); setThreadCtx(prev => prev.filter((_, idx) => idx !== i)); }}>{"\u2715"}</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="thread-input-row">
                <textarea
                  ref={threadInputRef}
                  className="thread-input"
                  value={threadInput}
                  onChange={e => setThreadInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  onClick={e => e.stopPropagation()}
                  placeholder={threadCtx.length > 0 ? `${threadCtx.length} context item${threadCtx.length > 1 ? "s" : ""} attached...` : "Reply to thread..."}
                  rows={1}
                />
                <button className="thread-send" onClick={handleSend}>{"\u2192"}</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Chatbot Component ───

function Chatbot({ topicId, topicTitle, contextSnippets, onClearSnippet, onClearAllSnippets, open, setOpen, onEditGraph, graphParams, addSnippet, threadTrigger, threadCtxTrigger }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[1].model);
  const [effort, setEffort] = useState("max");
  const [expanded, setExpanded] = useState(false);
  const [chatSize, setChatSize] = useState(null);
  const resizeRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [serverSessions, setServerSessions] = useState([]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const initStartedRef = useRef(false);
  const tabsRef = useRef(tabs);
  const activeTabIdxRef = useRef(activeTabIdx);

  useEffect(() => { tabsRef.current = tabs; }, [tabs]);
  useEffect(() => { activeTabIdxRef.current = activeTabIdx; }, [activeTabIdx]);

  const activeTab = tabs[activeTabIdx] || null;

  const updateTab = useCallback((tabId, updates) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...updates } : t));
  }, []);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    const count = activeTab?.messages?.length || 0;
    if (scrollRef.current && (count > prevMsgCountRef.current || activeTab?.loading)) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevMsgCountRef.current = count;
  }, [activeTab?.messages?.length, activeTab?.loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, activeTabIdx]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "\\") {
        e.preventDefault();
        if (!open) setOpen(true);
        setChatSize(null);
        setExpanded(ex => !ex);
        return;
      }
      if (e.ctrlKey && e.shiftKey) {
        if (e.key === 'J') {
          e.preventDefault();
          const sel = window.getSelection();
          const text = sel?.toString().trim();
          if (text && text.length >= 3) {
            const msgEl = sel.anchorNode?.parentElement?.closest('.chat-msg[data-msg-idx]');
            if (msgEl) {
              const idx = parseInt(msgEl.dataset.msgIdx);
              let bIdx = null;
              const block = sel.anchorNode?.parentElement?.closest('[data-chat-block]');
              if (block) {
                const bubble = msgEl.querySelector('.chat-msg-rendered');
                if (bubble) bIdx = Array.from(bubble.querySelectorAll('[data-chat-block]')).indexOf(block);
              }
              const tab = tabsRef.current[activeTabIdxRef.current];
              if (tab) openThread(tab.id, idx, text, bIdx);
              sel.removeAllRanges();
            }
          }
          return;
        }
        if (e.key === 'G') {
          e.preventDefault();
          const sel = window.getSelection();
          const text = sel?.toString().trim();
          if (text && text.length >= 3) {
            addSnippet(text, "selection");
            sel.removeAllRanges();
            setTimeout(() => inputRef.current?.focus(), 0);
          }
          return;
        }
        const k = e.key.toLowerCase();
        const m = MODELS.find(m => m.key === k);
        if (m) { e.preventDefault(); setModel(m.model); return; }
        const effortIdx = "!@#$".indexOf(e.key);
        if (effortIdx >= 0) { e.preventDefault(); setEffort(EFFORT_LEVELS[effortIdx]); return; }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, setOpen]); // openThread excluded: defined later via useCallback, never changes

  const startResize = useCallback((e, edge) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const panel = e.target.closest(".chat-panel");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const startW = rect.width, startH = rect.height;
    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      let newW = startW, newH = startH;
      if (edge.includes("l")) newW = Math.max(300, startW - dx);
      if (edge.includes("t")) newH = Math.max(250, startH - dy);
      setChatSize({ w: newW, h: newH });
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.removeEventListener("mouseleave", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onUp);
  }, []);

  const toggleExpand = useCallback(() => { setChatSize(null); setExpanded(e => !e); }, []);

  useEffect(() => {
    if (!activeTab) return;
    if (activeTab.keepContext && activeTab.sessionId) {
      try {
        let kcList = [];
        try { kcList = JSON.parse(_ss.getItem("kcSessions") || "[]"); } catch (_) {}
        kcList = kcList.filter(s => s.sessionId !== activeTab.sessionId);
        kcList.push({ sessionId: activeTab.sessionId, chatNum: activeTab.chatNum });
        _ss.setItem("kcSessions", JSON.stringify(kcList));
      } catch (_) {}
    } else if (activeTab.sessionId) {
      try {
        let kcList = [];
        try { kcList = JSON.parse(_ss.getItem("kcSessions") || "[]"); } catch (_) {}
        kcList = kcList.filter(s => s.sessionId !== activeTab.sessionId);
        _ss.setItem("kcSessions", JSON.stringify(kcList));
      } catch (_) {}
    }
  }, [activeTab?.keepContext, activeTab?.sessionId, activeTab?.chatNum]);

  useEffect(() => {
    if (!activeTab || !activeTab.keepContext || !activeTab.sessionId || activeTab.messages.length === 0) return;
    try {
      const saveable = activeTab.messages.map(m => ({
        role: m.role, content: m.content,
        ...(m.suggestion ? { suggestion: m.suggestion } : {}),
        ...(m.threads ? { threads: m.threads.map(t => ({ ...t, loading: false })) } : {}),
      }));
      _ss.setItem("chatMsgs_" + activeTab.sessionId, JSON.stringify(saveable));
    } catch (_) {}
  }, [activeTab?.messages, activeTab?.keepContext, activeTab?.sessionId]);

  useEffect(() => {
    const handleUnload = () => {
      const currentTabs = tabsRef.current;
      for (const tab of currentTabs) {
        if (!tab.sessionId) continue;
        const blob = new Blob([JSON.stringify({ sessionId: tab.sessionId, keepContext: tab.keepContext })], { type: "application/json" });
        navigator.sendBeacon("/session/close", blob);
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  const buildSystemPrompt = useCallback((isolatedFlag) => {
    const allTopicCtx = Object.entries(TOPIC_CONTEXT).map(([tid, ctx]) => `[${tid}]: ${ctx}`).join("\n\n");
    const isolationBlock = isolatedFlag
      ? `\n\n--- ISOLATION MODE ---\nThis session is ISOLATED. Do NOT read, write, or reference any files in ~/.claude/memory/ or ~/.claude/projects/. Do NOT use the auto-memory system. Do NOT persist any information between sessions. Treat this as a completely fresh session with no prior knowledge from other chats.`
      : `\n\n--- SHARED MEMORY MODE ---\nYou may read and use your persistent memory files in ~/.claude/ and CLAUDE.md project files for context. You may write to memory if the user asks you to remember something.`;
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX using <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG]\n<<END_SUGGEST>>\n\nThe user sees [Add to lesson] [Add to FAQ] [No]. On approval, edit src/qm_waves.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep thread responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
  }, [graphParams]);

  const createSessionForTab = useCallback(async (tabId) => {
    updateTab(tabId, { sessionStatus: "loading" });
    const tab = tabsRef.current.find(t => t.id === tabId);
    const iso = tab ? tab.isolated : true;
    try {
      const res = await fetch("/session/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, effort, isolated: iso, system: buildSystemPrompt(iso) }),
      });
      const data = await res.json();
      if (data.sessionId) {
        updateTab(tabId, { sessionId: data.sessionId, chatNum: data.chatNum, sessionStatus: "ready", messages: [] });
      } else {
        updateTab(tabId, { sessionStatus: "error" });
      }
    } catch (e) {
      console.error("Session init failed:", e);
      updateTab(tabId, { sessionStatus: "error" });
    }
  }, [model, effort, buildSystemPrompt, updateTab]);

  const transferSession = useCallback(async () => {
    if (!activeTab || !activeTab.sessionId || activeTab.loading) return;
    const tabId = activeTab.id;
    const newIsolatedState = !activeTab.isolated;
    updateTab(tabId, { sessionStatus: "loading", messages: [...activeTab.messages, { role: "assistant", content: `Transferring to ${newIsolatedState ? "isolated" : "shared memory"} mode...` }] });
    try {
      const res = await fetch("/session/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeTab.sessionId, model, effort, isolated: newIsolatedState, system: buildSystemPrompt(newIsolatedState) }),
      });
      const data = await res.json();
      if (data.sessionId) {
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, sessionId: data.sessionId, chatNum: data.chatNum, isolated: data.isolated, sessionStatus: "ready", messages: [...t.messages, { role: "assistant", content: `Session transferred to ${data.isolated ? "isolated" : "shared memory"} mode. Chat #${data.chatNum} continues.` }] } : t));
      } else {
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, sessionStatus: "error", messages: [...t.messages, { role: "assistant", content: data.error?.message || "Transfer failed." }] } : t));
      }
    } catch (e) {
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, sessionStatus: "error", messages: [...t.messages, { role: "assistant", content: `Transfer error: ${e.message}` }] } : t));
    }
  }, [activeTab, model, effort, buildSystemPrompt, updateTab]);

  const resumeSessionIntoTab = useCallback(async (tabId, sid, num) => {
    if (tabsRef.current.some(t => t.id !== tabId && t.sessionId === sid)) {
      updateTab(tabId, { messages: [{ role: "assistant", content: "This session is already open in another tab." }], sessionStatus: "picking" });
      return;
    }
    try {
      const res = await fetch("/session/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      if (res.ok) {
        const data = await res.json();
        let savedMsgs = [];
        try {
          const raw = _ss.getItem("chatMsgs_" + sid);
          if (raw) savedMsgs = JSON.parse(raw).map(m => m.threads ? { ...m, threads: m.threads.map(t => ({ ...t, collapsed: true })) } : m);
        } catch (_) {}
        updateTab(tabId, { sessionId: sid, chatNum: data.chatNum || num, sessionStatus: "ready", isolated: !!data.isolated, ...(savedMsgs.length > 0 ? { messages: savedMsgs } : {}) });
      } else {
        const err = await res.json();
        updateTab(tabId, { messages: [{ role: "assistant", content: err.error?.message || "Cannot open session" }], sessionStatus: "picking" });
      }
    } catch (e) {
      updateTab(tabId, { sessionStatus: "error" });
    }
  }, [updateTab]);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/sessions");
      const data = await res.json();
      return data.sessions || [];
    } catch (_) { return []; }
  }, []);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;

    const firstTab = makeTab();
    firstTab.keepContext = _ss.getItem("keepContext") === "true";
    setTabs([firstTab]);
    setActiveTabIdx(0);

    (async () => {
      let kcList = [];
      if (firstTab.keepContext) {
        try { kcList = JSON.parse(_ss.getItem("kcSessions") || "[]"); } catch (_) {}
      }

      if (kcList.length > 0) {
        const list = await fetchSessions();
        setServerSessions(list);
        let restoredFirst = false;
        for (const kc of kcList) {
          const found = list.find(s => s.id === kc.sessionId && !s.open);
          if (!found) continue;
          if (!restoredFirst) {
            await resumeSessionIntoTab(firstTab.id, kc.sessionId, kc.chatNum || found.chatNum);
            restoredFirst = true;
          } else {
            const extraTab = makeTab();
            extraTab.keepContext = true;
            setTabs(prev => [...prev, extraTab]);
            await resumeSessionIntoTab(extraTab.id, kc.sessionId, kc.chatNum || found.chatNum);
          }
        }
        if (restoredFirst) return;
      }

      const list = await fetchSessions();
      const available = list.filter(s => !s.open);
      setServerSessions(list);
      if (available.length > 0) {
        updateTab(firstTab.id, { sessionStatus: "picking" });
      } else {
        await createSessionForTab(firstTab.id);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab?.sessionStatus !== "picking") return;
    (async () => {
      const list = await fetchSessions();
      setServerSessions(list);
    })();
  }, [activeTab?.sessionStatus]);

  const addTab = useCallback(() => {
    const newTab = makeTab();
    let newIdx;
    setTabs(prev => {
      newIdx = prev.length;
      return [...prev, newTab];
    });
    setActiveTabIdx(newIdx);
    createSessionForTab(newTab.id);
  }, [createSessionForTab]);

  const closeTab = useCallback(async (tabId) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (tab && tab.sessionId) {
      try {
        const blob = new Blob([JSON.stringify({ sessionId: tab.sessionId, keepContext: tab.keepContext })], { type: "application/json" });
        navigator.sendBeacon("/session/close", blob);
      } catch (_) {}
    }
    const closedIdx = tabsRef.current.findIndex(t => t.id === tabId);
    setTabs(prev => {
      const next = prev.filter(t => t.id !== tabId);
      if (next.length === 0) return prev;
      return next;
    });
    setActiveTabIdx(prev => {
      const remaining = tabsRef.current.length - 1;
      if (remaining <= 0) return 0;
      if (closedIdx < prev) return prev - 1;
      if (closedIdx === prev) return Math.min(prev, remaining - 1);
      return prev;
    });
  }, []);

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Read failed"));
    r.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    const newAtts = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) continue;
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";
      if (!isImage && !isPdf) continue;
      try {
        const b64 = await readFileAsBase64(file);
        const thumb = isImage ? `data:${file.type};base64,${b64}` : null;
        newAtts.push({ name: file.name, type: file.type, data: b64, thumb, isImage, isPdf });
      } catch (e) { /* skip */ }
    }
    if (newAtts.length > 0) setAttachments(prev => [...prev, ...newAtts]);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const f = items[i].getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) { e.preventDefault(); handleFiles(imageFiles); }
  };

  const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));


  const processResponse = (text) => {
    const editRe = /<<EDIT_GRAPH>>([\s\S]*?)<<END_EDIT>>/g;
    let display = text;
    let match;
    while ((match = editRe.exec(text)) !== null) {
      try {
        const edits = JSON.parse(match[1].trim());
        if (onEditGraph) onEditGraph(edits);
        display = display.replace(match[0], "");
      } catch (e) { /* ignore malformed */ }
    }
    // Extract inline demo blocks and convert to rendered HTML
    const demoRe = /<<DEMO\s+title="([^"]*)"?>>([\s\S]*?)<<END_DEMO>>/g;
    display = display.replace(demoRe, (_, title, svgContent) => {
      const cleanSvg = svgContent.trim();
      if (!cleanSvg.startsWith('<svg')) return '';
      return `<div class="chat-demo-block"><div class="chat-demo-title">${title}</div>${cleanSvg}</div>`;
    });
    // Convert <<SOURCES>> block to collapsible dropdown
    display = display.replace(/<<SOURCES>>([\s\S]*?)<<END_SOURCES>>/g, (_, content) => {
      const items = content.trim().split('\n').filter(l => l.trim().startsWith('-')).map(l => {
        let text = l.trim().replace(/^-\s*/, '');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
        return `<li>${text}</li>`;
      });
      if (items.length === 0) return '';
      return `<details class="chat-sources"><summary>Sources</summary><ul>${items.join('')}</ul></details>`;
    });
    let suggestion = null;
    const suggestRe = /<<SUGGEST\s+([^>]*)>>([\s\S]*?)<<END_SUGGEST>>/;
    const suggestMatch = display.match(suggestRe);
    if (suggestMatch) {
      const attrsStr = suggestMatch[1];
      const content = suggestMatch[2].trim();
      const getAttr = (name) => { const m = attrsStr.match(new RegExp(`${name}="([^"]*)"`)); return m ? m[1] : null; };
      suggestion = {
        type: getAttr("type") || "lesson",
        section: getAttr("section"),
        title: getAttr("title") || "Suggested Addition",
        mode: getAttr("mode") || "collapsible",
        content,
        dismissed: false,
      };
      display = display.replace(suggestMatch[0], "").trim();
    }
    return { display: display.trim() || "Graph updated.", suggestion };
  };

  const cancelRequest = () => {
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (!tab) return;
    const ctrl = _cs.tabAborts[tab.id];
    if (ctrl) { _cs.tabCancelled[tab.id] = true; ctrl.abort(); }
    for (const key of Object.keys(_cs.threadAborts)) {
      if (key.startsWith(tab.id + ':')) { try { _cs.threadAborts[key].abort(); } catch (_) {} delete _cs.threadAborts[key]; }
    }
  };

  const killSession = useCallback(() => {
    if (!activeTab) return;
    cancelRequest();
    if (activeTab.sessionId) {
      fetch("/session/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeTab.sessionId, keepContext: false }),
      }).catch(() => {});
    }
    updateTab(activeTab.id, {
      sessionId: null, chatNum: null, sessionStatus: "idle",
      loading: false, statusText: "",
      messages: [...activeTab.messages, { role: "assistant", content: "Session killed." }],
    });
  }, [activeTab, cancelRequest, updateTab]);

  const sendMessage = async (overrideText) => {
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (!tab || !tab.sessionId || tab.sessionStatus !== "ready") return;
    const text = overrideText !== undefined ? overrideText : input.trim();
    const currentAtts = overrideText !== undefined ? [] : [...attachments];
    if ((!text && currentAtts.length === 0) || tab.loading) return;
    const tabId = tab.id;
    if (overrideText === undefined) {
      setInput("");
      setAttachments([]);
    }
    let userContent = text || "(attached file)";
    if (overrideText === undefined && contextSnippets.length > 0) {
      const ctxBlock = contextSnippets.map((s, i) => `[Context ${i + 1} -- ${s.source}]: ${s.text}`).join("\n");
      userContent = `${ctxBlock}\n\nQuestion: ${userContent}`;
    }
    const displayMsg = { role: "user", content: text || "(attached file)", context: (overrideText === undefined && contextSnippets.length > 0) ? [...contextSnippets] : null, attachments: currentAtts.length > 0 ? currentAtts : null };
    const currentTab = tabsRef.current.find(t => t.id === tabId);
    const newMsgs = [...(currentTab ? currentTab.messages : []), displayMsg];
    updateTab(tabId, { messages: newMsgs, loading: true });
    if (overrideText === undefined) onClearAllSnippets();

    const controller = new AbortController();
    _cs.tabAborts[tabId] = controller;
    _cs.tabCancelled[tabId] = false;
    try {
      let attachmentNote = "";
      if (currentAtts.length > 0) {
        try {
          const uploadRes = await fetch("/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: currentAtts.map(a => ({ name: a.name, type: a.type, data: a.data })) }),
          });
          const uploadData = await uploadRes.json();
          if (uploadData.paths?.length > 0) {
            attachmentNote = "\n\n[Attached files - use Read tool to view them]:\n" + uploadData.paths.map(p => `- ${p}`).join("\n");
          }
        } catch (uploadErr) {
          attachmentNote = "\n\n[File attachment failed: " + uploadErr.message + "]";
        }
      }
      const tabContext = `[Currently viewing: ${topicTitle}]\n`;
      const messageText = tabContext + userContent + attachmentNote;
      const reqBody = { sessionId: tab.sessionId, message: messageText, model: model, effort: effort };
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(reqBody),
      });
      if (!res.ok) {
        let errMsg = `API error (${res.status})`;
        try {
          const errData = await res.json();
          if (errData.error?.message) errMsg = errData.error.message;
        } catch (_) {}
        setTabs(prev => prev.map(t => t.id === tabId ? { ...t, messages: [...t.messages, { role: "assistant", content: errMsg }] } : t));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let finalText = "";
      let doneReceived = false;
      const updateAssistantMsg = (content) => {
        setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          const msgs = t.messages;
          if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1]._streaming) {
            return { ...t, messages: [...msgs.slice(0, -1), { role: "assistant", content, _streaming: true }] };
          }
          return { ...t, messages: [...msgs, { role: "assistant", content, _streaming: true }] };
        }));
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop();
        let eventType = null;
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "status") {
                if (data.type === "tool") {
                  updateTab(tabId, { statusText: `Using ${data.name}${data.description ? ": " + data.description : ""}...` });
                } else if (data.type === "thinking") {
                  updateTab(tabId, { statusText: "Thinking..." });
                }
              } else if (eventType === "text") {
                updateTab(tabId, { statusText: "" });
                finalText += data.text;
                updateAssistantMsg(processResponse(finalText).display);
              } else if (eventType === "done") {
                finalText = data.text || finalText;
                doneReceived = true;
                updateTab(tabId, { statusText: "" });
              } else if (eventType === "error") {
                updateAssistantMsg(data.message || "Error");
                updateTab(tabId, { statusText: "" });
              }
            } catch (_) {}
            eventType = null;
          } else if (line === "") {
            eventType = null;
          }
        }
      }
      if (finalText) {
        const reply = processResponse(finalText);
        setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          const msgs = t.messages;
          if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant" && msgs[msgs.length - 1]._streaming) {
            return { ...t, messages: [...msgs.slice(0, -1), { role: "assistant", content: reply.display, suggestion: reply.suggestion || null }] };
          }
          return t;
        }));
      }
    } catch (e) {
      let errContent;
      if (e.name === "AbortError") {
        errContent = "[Response cancelled]";
      } else {
        errContent = `Connection error: ${e.message || "unknown"}. Is the proxy server running?`;
      }
      setTabs(prev => prev.map(t => {
        if (t.id !== tabId) return t;
        const msgs = t.messages.map(m => m._streaming ? { role: m.role, content: m.content } : m);
        return { ...t, messages: [...msgs, { role: "assistant", content: errContent }] };
      }));
    } finally {
      delete _cs.tabAborts[tabId];
      delete _cs.tabCancelled[tabId];
      updateTab(tabId, { loading: false, statusText: "" });
    }
  };

  const sendMessageWithText = (text) => sendMessage(text);

  const triggerSend = useCallback(() => {
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (!tab || !_cs.pendingSend[tab.id]) return;
    const text = _cs.pendingSend[tab.id];
    delete _cs.pendingSend[tab.id];
    sendMessageWithText(text);
  }, []);

  const handleSuggestionApprove = useCallback((msgIdx, placement) => {
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (!tab) return;
    const msg = tab.messages[msgIdx];
    if (!msg?.suggestion) return;
    setTabs(prev => prev.map(t => {
      if (t.id !== tab.id) return t;
      const msgs = t.messages.map((m, i) => i === msgIdx ? { ...m, suggestion: { ...m.suggestion, dismissed: true } } : m);
      return { ...t, messages: msgs };
    }));
    const s = msg.suggestion;
    const followUp = placement === "faq"
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/qm_waves.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/qm_waves.jsx now.`;
    _cs.pendingSend[tab.id] = followUp;
    triggerSend();
  }, [triggerSend]);

  const handleSuggestionDismiss = useCallback((msgIdx) => {
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (!tab) return;
    setTabs(prev => prev.map(t => {
      if (t.id !== tab.id) return t;
      const msgs = t.messages.map((m, i) => i === msgIdx ? { ...m, suggestion: { ...m.suggestion, dismissed: true } } : m);
      return { ...t, messages: msgs };
    }));
  }, []);

  const openThread = useCallback((tabId, msgIdx, snippet, blockIdx) => {
    if (tabId == null || msgIdx == null) return;
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const msgs = t.messages.map((m, i) => {
        if (i !== msgIdx) return m;
        if (m.threads?.some(th => th.blockIdx === blockIdx && th.snippet === snippet)) return m;
        const threads = m.threads ? [...m.threads] : [];
        threads.push({ id: `t${++_cs.threadCounter}`, snippet, blockIdx: blockIdx ?? null, messages: [], collapsed: false, loading: false });
        return { ...m, threads };
      });
      return { ...t, messages: msgs };
    }));
  }, []);

  const updateThread = useCallback((tabId, msgIdx, threadId, updates) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const msgs = t.messages.map((m, i) => {
        if (i !== msgIdx || !m.threads) return m;
        return { ...m, threads: m.threads.map(th => th.id === threadId ? { ...th, ...updates } : th) };
      });
      return { ...t, messages: msgs };
    }));
  }, []);

  const addThreadMsg = useCallback((tabId, msgIdx, threadId, msg) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const msgs = t.messages.map((m, i) => {
        if (i !== msgIdx || !m.threads) return m;
        return { ...m, threads: m.threads.map(th => th.id === threadId ? { ...th, messages: [...th.messages, msg] } : th) };
      });
      return { ...t, messages: msgs };
    }));
  }, []);

  const deleteThread = useCallback((tabId, msgIdx, threadId) => {
    setTabs(prev => prev.map(t => {
      if (t.id !== tabId) return t;
      const msgs = [...t.messages];
      const m = { ...msgs[msgIdx] };
      m.threads = (m.threads || []).filter(th => th.id !== threadId);
      msgs[msgIdx] = m;
      return { ...t, messages: msgs };
    }));
  }, []);

  const sendThreadMessage = async (tabId, msgIdx, threadId, snippet, text, context) => {
    const tab = tabsRef.current.find(t => t.id === tabId);
    if (!tab || !tab.sessionId) return;

    addThreadMsg(tabId, msgIdx, threadId, { role: "user", content: text });
    updateThread(tabId, msgIdx, threadId, { loading: true });

    let apiText = text;
    if (context && context.length > 0) {
      const ctxBlock = context.map((s, i) => `[Context ${i + 1} -- ${s.source}]: ${s.text}`).join("\n");
      apiText = `${ctxBlock}\n\nQuestion: ${apiText}`;
    }
    const tagged = `[THREAD:${threadId} | "${snippet.slice(0, 60)}"]\n\n${apiText}`;
    _cs.activeThread[tabId] = { msgIdx, threadId };

    const controller = new AbortController();
    _cs.threadAborts[tabId + ':' + threadId] = controller;

    try {
      const res = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ sessionId: tab.sessionId, message: tagged, model, effort }),
      });
      if (!res.ok) {
        addThreadMsg(tabId, msgIdx, threadId, { role: "assistant", content: `Error ${res.status}` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = "";
      let finalText = "";

      const updateThreadAssistant = (content) => {
        setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            messages: t.messages.map((m, i) => {
              if (i !== msgIdx || !m.threads) return m;
              return {
                ...m,
                threads: m.threads.map(th => {
                  if (th.id !== threadId) return th;
                  const tmsgs = th.messages;
                  if (tmsgs.length > 0 && tmsgs[tmsgs.length - 1].role === "assistant" && tmsgs[tmsgs.length - 1]._streaming) {
                    return { ...th, messages: [...tmsgs.slice(0, -1), { role: "assistant", content, _streaming: true }] };
                  }
                  return { ...th, messages: [...tmsgs, { role: "assistant", content, _streaming: true }] };
                }),
              };
            }),
          };
        }));
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop();
        let eventType = null;
        for (const line of lines) {
          if (line.startsWith("event: ")) { eventType = line.slice(7).trim(); }
          else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === "text") {
                finalText += data.text;
                const display = finalText.replace(/^\[THREAD:[^\]]+\]\s*/i, "");
                updateThreadAssistant(display);
              } else if (eventType === "done") {
                finalText = data.text || finalText;
              }
            } catch (_) {}
            eventType = null;
          }
        }
      }
      if (finalText) {
        const display = finalText.replace(/^\[THREAD:[^\]]+\]\s*/i, "").trim();
        setTabs(prev => prev.map(t => {
          if (t.id !== tabId) return t;
          return {
            ...t,
            messages: t.messages.map((m, i) => {
              if (i !== msgIdx || !m.threads) return m;
              return {
                ...m,
                threads: m.threads.map(th => {
                  if (th.id !== threadId) return th;
                  const tmsgs = th.messages;
                  const finalized = tmsgs.length > 0 && tmsgs[tmsgs.length - 1]._streaming
                    ? [...tmsgs.slice(0, -1), { role: "assistant", content: display }]
                    : [...tmsgs, { role: "assistant", content: display }];
                  return { ...th, messages: finalized };
                }),
              };
            }),
          };
        }));
      }
    } catch (e) {
      const errMsg = e.name === "AbortError" ? "[Cancelled]" : `Error: ${e.message}`;
      addThreadMsg(tabId, msgIdx, threadId, { role: "assistant", content: errMsg });
    } finally {
      delete _cs.activeThread[tabId];
      delete _cs.threadAborts[tabId + ':' + threadId];
      updateThread(tabId, msgIdx, threadId, { loading: false });
    }
  };

  useEffect(() => {
    if (!threadTrigger || threadTrigger.msgIdx == null) return;
    const tab = tabsRef.current[activeTabIdxRef.current];
    if (tab) openThread(tab.id, threadTrigger.msgIdx, threadTrigger.text, threadTrigger.blockIdx);
  }, [threadTrigger]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Portal containers for inline thread rendering
  const [threadPortals, setThreadPortals] = useState([]);

  useEffect(() => {
    const currentMsgs = tabsRef.current[activeTabIdxRef.current]?.messages || [];
    const portals = [];
    currentMsgs.forEach((m, i) => {
      if (m.role !== "assistant" || !m.threads || m.threads.length === 0) return;
      const msgEl = document.querySelector(`.chat-msg[data-msg-idx="${i}"]`);
      if (!msgEl) return;
      const bubble = msgEl.querySelector('.chat-msg-rendered');
      if (!bubble) return;
      m.threads.forEach(thread => {
        const containerId = `thread-ctr-${thread.id}`;
        let container = document.getElementById(containerId);
        if (!container) {
          container = document.createElement('div');
          container.id = containerId;
          container.className = 'thread-portal-slot';
          const blocks = bubble.querySelectorAll('[data-chat-block]');
          const targetBlock = thread.blockIdx != null && blocks[thread.blockIdx] ? blocks[thread.blockIdx] : null;
          if (targetBlock) targetBlock.after(container);
          else bubble.appendChild(container);
        }
        portals.push({ threadId: thread.id, msgIdx: i, el: container });
      });
    });
    setThreadPortals(portals);
  }, [activeTab?.messages]);

  const messages = activeTab ? activeTab.messages : [];
  const loading = activeTab ? activeTab.loading : false;
  const statusText = activeTab ? activeTab.statusText || "" : "";
  const sessionId = activeTab ? activeTab.sessionId : null;
  const chatNum = activeTab ? activeTab.chatNum : null;
  const sessionStatus = activeTab ? activeTab.sessionStatus : "idle";
  const keepContext = activeTab ? activeTab.keepContext : false;
  const isolated = activeTab ? activeTab.isolated : true;

  return (
    <>
      {!open && !import.meta.env.PROD && <button className="chat-toggle" onClick={() => setOpen(true)}>
        {"?"}
        {contextSnippets.length > 0 && <span className="chat-badge">{contextSnippets.length}</span>}
      </button>}
      {<div className={`chat-panel ${expanded ? "chat-panel-expanded" : ""}`} style={{ ...(chatSize ? { width: chatSize.w, height: chatSize.h } : {}), ...(!open ? { display: "none" } : {}) }}>
          <div className="chat-resize-l" onMouseDown={e => startResize(e, "l")} />
          <div className="chat-resize-t" onMouseDown={e => startResize(e, "t")} />
          <div className="chat-resize-tl" onMouseDown={e => startResize(e, "tl")} />
          <div className="chat-header">
            <div className="chat-tabs">
              {tabs.map((tab, idx) => (
                <button key={tab.id} className={`chat-tab ${idx === activeTabIdx ? "active" : ""}`} onClick={() => setActiveTabIdx(idx)}>
                  {tab.chatNum ? `#${tab.chatNum}` : `~${tab.id}`}
                  {tabs.length > 1 && (
                    <span className="chat-tab-x" onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}>{"\u2715"}</span>
                  )}
                </button>
              ))}
              <button className="chat-tab-add" onClick={addTab} title="New chat tab">+</button>
            </div>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: sessionStatus === "ready" ? "var(--accent)" : sessionStatus === "loading" ? "var(--text-dim)" : "var(--chat-stop-color)", flexShrink: 0 }} title={sessionId ? `Session: ${sessionId.slice(0, 8)}...` : sessionStatus} />
            <span className="chat-header-topic">{topicTitle}</span>
            <select className="chat-model-select" value={model} onChange={e => setModel(e.target.value)}>
              {MODELS.map(m => <option key={m.model} value={m.model}>{m.label}</option>)}
            </select>
            <select className="chat-model-select" value={effort} onChange={e => setEffort(e.target.value)}>
              {EFFORT_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <button className="chat-expand-btn" onClick={transferSession} disabled={sessionStatus !== "ready"} title={isolated ? "Isolated: no shared memory. Click to enable memory/CLAUDE.md" : "Shared: uses global Claude memory + CLAUDE.md. Click to isolate"} style={{ background: isolated ? "var(--chat-stop-color)" : "var(--accent)", color: isolated ? "var(--bg-main)" : "var(--bg-main)", opacity: sessionStatus !== "ready" ? 0.4 : 1 }}>
              {isolated ? "ISO" : "MEM"}
            </button>
            <button className="chat-expand-btn" onClick={() => { if (!activeTab) return; updateTab(activeTab.id, { keepContext: !activeTab.keepContext }); _ss.setItem("keepContext", (!activeTab.keepContext) ? "true" : "false"); }} title={keepContext ? "Keep context ON: session survives reload" : "Keep context OFF: new session on reload"} style={{ background: keepContext ? "var(--accent)" : undefined, color: keepContext ? "var(--bg-main)" : undefined }}>
              {keepContext ? "KC" : "kc"}
            </button>
            <button className="chat-kill-btn" onClick={killSession} title="Kill session and stop all processes">KILL</button>
            <button className="chat-expand-btn" onClick={toggleExpand} title={expanded ? "Shrink" : "Expand"}>
              {expanded ? "\u2296" : "\u2295"}
            </button>
          </div>
          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && sessionStatus === "picking" && (
              <div className="chat-empty">
                <div style={{ marginBottom: 8 }}>Available sessions. Pick one or create new:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {serverSessions.filter(s => !s.open && !tabs.some(t => t.sessionId === s.id)).map(s => (
                    <button key={s.id} onClick={() => { if (activeTab) resumeSessionIntoTab(activeTab.id, s.id, s.chatNum); }} style={{ background: "var(--bg-eq)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 10px", color: "var(--accent)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                      {"Chat #"}{s.chatNum} ({s.messageCount} msgs) {s.isolated ? "ISO" : "MEM"}
                    </button>
                  ))}
                  <button onClick={() => { if (activeTab) createSessionForTab(activeTab.id); }} style={{ background: "var(--accent)", border: "none", borderRadius: 6, padding: "6px 10px", color: "var(--bg-main)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600 }}>
                    + New
                  </button>
                </div>
              </div>
            )}
            {messages.length === 0 && sessionStatus !== "picking" && (
              <div className="chat-empty">
                {sessionStatus === "loading" && "Initializing Claude session..."}
                {sessionStatus === "ready" && "Session active. Ask about wave-particle duality, the Schrodinger equation, or infinite potential wells. Click or highlight content to attach as context."}
                {sessionStatus === "error" && "Session failed to initialize. Is the proxy server running? Try refreshing."}
                {sessionStatus === "idle" && "Starting session..."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`} data-msg-idx={i}>
                {m.role === "user" && m.context && (
                  <div className="chat-msg-ctx-list">
                    {m.context.map((s, j) => (
                      <div key={j} className="chat-msg-ctx-chip-sent">{"+ "}{s.text.length > 60 ? s.text.slice(0, 60) + "\u2026" : s.text}</div>
                    ))}
                  </div>
                )}
                {m.role === "user" && m.attachments && (
                  <div className="chat-msg-att-list">
                    {m.attachments.map((a, j) => a.thumb
                      ? <img key={j} src={a.thumb} className="chat-att-thumb-sent" alt={a.name} />
                      : <div key={j} className="chat-att-file-sent">{a.name}</div>
                    )}
                  </div>
                )}
                <ChatBubble text={m.content} role={m.role} onReplyBlock={addSnippet} streaming={!!m._streaming} />
                {m.suggestion && !m.suggestion.dismissed && (
                  <div className="suggestion-bar">
                    <span className="suggestion-label">Add this to the lesson?</span>
                    <button className="suggestion-btn s-btn-lesson" onClick={() => handleSuggestionApprove(i, 'lesson')}>Add to lesson</button>
                    <button className="suggestion-btn s-btn-faq" onClick={() => handleSuggestionApprove(i, 'faq')}>Add to FAQ</button>
                    <button className="suggestion-btn s-btn-no" onClick={() => handleSuggestionDismiss(i)}>No</button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-msg chat-msg-assistant">
                <div className="chat-msg-bubble chat-loading"><span /><span /><span /></div>
              </div>
            )}
            {statusText && (
              <div className="chat-status">{statusText}</div>
            )}
          </div>
          {threadPortals.map(({ threadId, msgIdx, el }) => {
            const msg = messages[msgIdx];
            const thread = msg?.threads?.find(t => t.id === threadId);
            if (!thread || !el) return null;
            return createPortal(
              <ThreadPanel
                key={threadId}
                thread={thread}
                onToggleCollapse={() => updateThread(activeTab.id, msgIdx, threadId, { collapsed: !thread.collapsed })}
                onSend={(text, ctx) => sendThreadMessage(activeTab.id, msgIdx, threadId, thread.snippet, text, ctx)}
                onDelete={() => deleteThread(activeTab.id, msgIdx, threadId)}
                contextTrigger={threadCtxTrigger}
              />,
              el
            );
          })}
          {attachments.length > 0 && (
            <div className="chat-att-bar">
              {attachments.map((a, i) => (
                <div key={i} className="chat-att-preview">
                  {a.thumb ? <img src={a.thumb} className="chat-att-thumb" alt={a.name} /> : <span className="chat-att-fname">{a.name}</span>}
                  <button className="chat-att-rm" onClick={() => removeAttachment(i)}>{"\u2715"}</button>
                </div>
              ))}
            </div>
          )}
          {contextSnippets.length > 0 && (
            <div className="chat-ctx-bar">
              {contextSnippets.map((s, i) => (
                <div key={i} className="chat-ctx-chip">
                  <span className="chat-ctx-chip-text">{"+ "}{s.text.length > 40 ? s.text.slice(0, 40) + "\u2026" : s.text}</span>
                  <button className="chat-ctx-chip-x" onClick={() => onClearSnippet(i)}>{"\u2715"}</button>
                </div>
              ))}
            </div>
          )}
          <div className="chat-input-row">
            <input type="file" ref={fileRef} style={{ display: "none" }} accept="image/*,.pdf" multiple onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }} />
            <button className="chat-attach-btn" onClick={() => fileRef.current.click()} title="Attach image or PDF">+</button>
            <textarea ref={inputRef} className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} onPaste={handlePaste}
              placeholder={attachments.length > 0 ? "Describe what you attached..." : contextSnippets.length > 0 ? "Ask about the attached context..." : "Ask about this topic..."} rows={1} />
            {loading
              ? <button className="chat-stop" onClick={cancelRequest} title="Stop generating">{"\u25A0"}</button>
              : <button className="chat-send" onClick={sendMessage} disabled={!input.trim() && attachments.length === 0}>{"\u2192"}</button>
            }
          </div>
        </div>
      }
    </>
  );
}

// ─── Main App ───

export default function LessonApp() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [katexReady, setKatexReady] = useState(false);
  const [contextSnippets, setContextSnippets] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [graphParams, setGraphParams] = useState(DEFAULT_GRAPH_PARAMS);
  const mouseDownPos = useRef(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [threadTrigger, setThreadTrigger] = useState(null);
  const [threadCtxTrigger, setThreadCtxTrigger] = useState(null);

  G = THEMES_G[theme];

  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.key === "/") {
        e.preventDefault();
        setChatOpen(o => !o);
      }
      // Ctrl+Shift+F: add selection to thread context (if inside a thread panel)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "f") {
        const sel = window.getSelection();
        const text = sel ? sel.toString().trim() : "";
        if (text.length < 3) return;
        const threadEl = sel.anchorNode?.parentElement?.closest('.thread-panel[data-thread-id]');
        if (threadEl) {
          e.preventDefault();
          const tid = threadEl.getAttribute('data-thread-id');
          setThreadCtxTrigger({ threadId: tid, text, source: "thread selection", ts: Date.now() });
          sel.removeAllRanges();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleEditGraph = useCallback((edits) => {
    setGraphParams(prev => {
      const next = { ...prev };
      for (const [key, val] of Object.entries(edits)) {
        if (next[key]) next[key] = { ...next[key], ...val };
      }
      return next;
    });
  }, []);

  const handleClearSnippet = useCallback((i) => {
    setContextSnippets(prev => prev.filter((_, idx) => idx !== i));
  }, []);
  const handleClearAllSnippets = useCallback(() => setContextSnippets([]), []);

  const active = TOPICS[activeIdx];

  const addSnippet = useCallback((text, source) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < 3) return;
    setContextSnippets(prev => {
      if (prev.some(s => s.text === clean)) return prev;
      return [...prev, { text: clean, source }];
    });
  }, []);

  const handleContentMouseDown = useCallback((e) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleContentClick = useCallback((e) => {
    if (!chatOpen) return;
    if (e.target.closest(".chat-panel, .chat-toggle, .tab-bar, .header")) return;
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx > 5 || dy > 5) return;
    }
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) sel.removeAllRanges();
    const el = e.target.closest(".eq-block, .key-concept, .compare-card, .para, .info-list li, .section-title");
    if (!el) return;
    let source = "element";
    if (el.classList.contains("eq-block")) source = "equation";
    else if (el.classList.contains("key-concept")) source = "concept";
    else if (el.classList.contains("compare-card")) source = "comparison";
    else if (el.classList.contains("para")) source = "paragraph";
    else if (el.tagName === "LI") source = "list item";
    else if (el.classList.contains("section-title")) source = "section";
    addSnippet(el.textContent, source);
    setTimeout(() => document.querySelector(".chat-input")?.focus(), 0);
    el.classList.remove("ctx-flash");
    void el.offsetWidth;
    el.classList.add("ctx-flash");
    setTimeout(() => el.classList.remove("ctx-flash"), 600);
  }, [chatOpen, addSnippet]);

  const handleContentMouseUp = useCallback((e) => {
    if (!chatOpen) return;
    if (e.target.closest(".chat-panel, .chat-toggle")) return;
    if (mouseDownPos.current) {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx <= 5 && dy <= 5) return;
    }
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length > 2) {
        addSnippet(text, "selection");
        setTimeout(() => document.querySelector(".chat-input")?.focus(), 0);
        try {
          const range = sel.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const flash = document.createElement("div");
          flash.className = "ctx-sel-flash";
          flash.textContent = "+ added";
          flash.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top - 24}px;`;
          document.body.appendChild(flash);
          setTimeout(() => flash.remove(), 800);
        } catch (err) {}
        sel.removeAllRanges();
      }
    }, 10);
  }, [chatOpen, addSnippet]);

  const handleContextMenu = useCallback((e) => {
    if (!chatOpen) return;
    if (e.target.closest('.chat-input, .chat-input-row, .chat-model-select')) return;
    const sel = window.getSelection();
    const text = sel ? sel.toString().trim() : "";
    if (text.length < 3) return;
    e.preventDefault();
    const chatArea = document.querySelector('.chat-messages');
    const inChatArea = chatArea && chatArea.contains(sel.anchorNode);
    let chatMsgIdx = null;
    let chatBlockIdx = null;
    if (inChatArea) {
      const msgEl = sel.anchorNode?.parentElement?.closest('.chat-msg[data-msg-idx]');
      if (msgEl) {
        chatMsgIdx = parseInt(msgEl.dataset.msgIdx);
        const block = sel.anchorNode?.parentElement?.closest('[data-chat-block]');
        if (block) {
          const bubble = msgEl.querySelector('.chat-msg-rendered');
          if (bubble) {
            const allBlocks = bubble.querySelectorAll('[data-chat-block]');
            chatBlockIdx = Array.from(allBlocks).indexOf(block);
          }
        }
      }
    }
    // Detect if right-click is inside a thread panel
    const threadPanel = e.target.closest('.thread-panel[data-thread-id]');
    const threadId = threadPanel ? threadPanel.getAttribute('data-thread-id') : null;
    setCtxMenu({ x: Math.min(e.clientX, window.innerWidth - 160), y: Math.min(e.clientY, window.innerHeight - 80), text, chatMsgIdx, chatBlockIdx, threadId });
  }, [chatOpen]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = (e) => { if (!e.target.closest('.ctx-menu')) setCtxMenu(null); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [ctxMenu]);

  const handleCtxReply = useCallback(() => {
    if (!ctxMenu) return;
    addSnippet(ctxMenu.text, "selection");
    setCtxMenu(null);
    window.getSelection()?.removeAllRanges();
    setTimeout(() => document.querySelector(".chat-input")?.focus(), 0);
  }, [ctxMenu, addSnippet]);

  const handleCtxOpenThread = useCallback(() => {
    if (!ctxMenu || ctxMenu.chatMsgIdx == null) return;
    setThreadTrigger({ text: ctxMenu.text, msgIdx: ctxMenu.chatMsgIdx, blockIdx: ctxMenu.chatBlockIdx, ts: Date.now() });
    setCtxMenu(null);
    window.getSelection()?.removeAllRanges();
  }, [ctxMenu]);

  const handleCtxReplyInThread = useCallback(() => {
    if (!ctxMenu || !ctxMenu.threadId) return;
    setThreadCtxTrigger({ threadId: ctxMenu.threadId, text: ctxMenu.text, source: "thread selection", ts: Date.now() });
    setCtxMenu(null);
    window.getSelection()?.removeAllRanges();
  }, [ctxMenu]);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.js";
    script.onload = () => setKatexReady(true);
    document.head.appendChild(script);
    return () => { link.remove(); script.remove(); };
  }, []);

  if (!katexReady) {
    return (
      <>
        <style>{STYLES}</style>
        <div className={`theme-${theme}`} style={{ minHeight: "100vh", background: "var(--bg-main)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: "var(--text-dim)", fontFamily: "monospace", fontSize: 14 }}>Loading KaTeX...</p>
        </div>
      </>
    );
  }

  return (
    <div
      className={`theme-${theme} ${chatOpen ? "ctx-active" : ""}`}
      onMouseDown={handleContentMouseDown}
      onClick={handleContentClick}
      onMouseUp={handleContentMouseUp}
      onContextMenu={handleContextMenu}
      style={{ minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)", fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", position: "relative" }}
    >
      <style>{STYLES}</style>
      <div className="header">
        <div>
          <h1>Quantum Mechanics I: Waves and the Schrodinger Equation</h1>
          <p>ECE 109 -- Principles of Electronic Materials</p>
        </div>
        <button className="theme-toggle-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      </div>
      {import.meta.env.PROD && <div style={{ background: "var(--bg-card)", color: "var(--text-dim)", textAlign: "center", padding: "6px 24px", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", borderBottom: "1px solid var(--border)" }}>The AI chatbot is only available when running locally. See the <a href="https://github.com/ihsan-sa/ECE-109-Review" style={{ color: "var(--accent)" }}>README</a> for setup instructions.</div>}
      <div className="tab-bar">
        {TOPICS.map((t, i) => (
          <button key={t.id} className={`tab-btn ${i === activeIdx ? "active" : ""}`} onClick={() => setActiveIdx(i)}>{t.tab}</button>
        ))}
      </div>
      <div className="content-area">
        <div style={{ marginBottom: 8, padding: "16px 24px 0" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{active.title}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace" }}>{active.subtitle}</p>
        </div>
        {active.content(graphParams)}
      </div>
      <Chatbot topicId={active.id} topicTitle={active.title} contextSnippets={contextSnippets}
        onClearSnippet={handleClearSnippet} onClearAllSnippets={handleClearAllSnippets}
        open={chatOpen} setOpen={setChatOpen} onEditGraph={handleEditGraph} graphParams={graphParams} addSnippet={addSnippet} threadTrigger={threadTrigger} threadCtxTrigger={threadCtxTrigger} />
      {ctxMenu && (
        <div className="ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
          <button className="ctx-menu-item" onClick={handleCtxReply}>Reply</button>
          {ctxMenu.chatMsgIdx != null && (
            <button className="ctx-menu-item" onClick={handleCtxOpenThread}>Reply in thread</button>
          )}
          {ctxMenu.threadId && (
            <button className="ctx-menu-item" onClick={handleCtxReplyInThread}>Reply in this thread</button>
          )}
        </div>
      )}
    </div>
  );
}
