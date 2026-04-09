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
  "finite-well": `Topic: Finite Potential Well. Covers the 1D finite well of depth V_0 and width a. Three regions: I (x<0, V=V_0), II (0<x<a, V=0), III (x>a, V=V_0). Inside well: sinusoidal psi with wavenumber k = sqrt(2m_e E)/hbar. Outside: exponential decay psi ~ exp(-alpha x) where alpha = sqrt(2m_e(V_0 - E)/hbar^2). Boundary conditions: psi and dpsi/dx continuous at x=0 and x=a. Transcendental equation alpha = k tan(ka/2) for even states. Penetration depth delta = 1/alpha. Fewer bound states than infinite well; energy levels are lower. For a=2nm, V_0=0.5eV: E_1=0.057eV, E_2=0.22eV.`,
  "tunneling": `Topic: Quantum Tunneling. A particle with energy E encounters a barrier of height V_0 > E and width a. Transmission coefficient T = 1/(1 + D sinh^2(alpha a)) where D = V_0^2/(4E(V_0-E)) and alpha = sqrt(2m_e(V_0-E)/hbar^2). For thick barriers: T ~ exp(-2 alpha a). Reflection coefficient R = 1 - T. Applications: Scanning Tunneling Microscope (STM) uses exponential sensitivity of tunnel current to gap distance. Alpha decay: nuclear particle tunnels through Coulomb barrier. Tunnel diode: electrons tunnel through thin depletion region.`,
  "uncertainty": `Topic: Heisenberg Uncertainty Principle. Position-momentum: Delta_x * Delta_p >= hbar/2. Energy-time: Delta_E * Delta_t >= hbar/2. Impossible to simultaneously know both position and momentum with arbitrary precision. Consequence: zero-point energy in confined systems (E_1 > 0 for particle in a box). Natural linewidth of spectral lines from energy-time uncertainty: Delta_E = hbar/tau_r, so Delta_f ~ 1/(2*pi*tau_r); for tau_r ~ 10^-8 s, Delta_f ~ 10^7 Hz. The ground state energy of a confined electron is never zero.`,
  "hydrogen": `Topic: Hydrogen Atom. 3D Schrodinger equation with Coulomb potential V(r) = -Ze^2/(4 pi epsilon_0 r). Wavefunction psi(r,theta,phi) = R_{n,l}(r) Y_{l,m_l}(theta,phi). Three quantum numbers from 3D box: n (principal, n=1,2,3,...), l (orbital angular momentum, l=0,...,n-1), m_l (magnetic, m_l=-l,...,+l). Fourth quantum number m_s = +/- 1/2 (spin). Energy levels E_n = -13.6 eV/n^2 (for hydrogen, Z=1). Bohr radius a_0 = 0.0529 nm. Orbital labels: l=0 is s, l=1 is p, l=2 is d, l=3 is f. Degeneracy: n^2 states per energy level (ignoring spin), 2n^2 with spin.`,
  "periodic-table": `Topic: Atoms and the Periodic Table. Multi-electron atoms: electron-electron repulsion breaks l-degeneracy. Pauli exclusion principle: no two electrons can have the same set of four quantum numbers. Aufbau principle: fill orbitals from lowest energy up. Hund's rule: maximize spin in degenerate orbitals. Shielding effect: inner electrons screen nuclear charge, so effective Z depends on orbital. Shell filling order: 1s, 2s, 2p, 3s, 3p, 4s, 3d, 4p, ... Periodic trends: ionization energy generally increases across period, decreases down group. Electronegativity follows similar trend. Atomic radius decreases across period, increases down group.`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo, Winter 2026. This unit (Lectures 4-6) covers quantum mechanics: finite potential wells, quantum tunneling, the uncertainty principle, the hydrogen atom, and multi-electron atoms with the periodic table. The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

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
  finiteWell: { V0_eV: 10, wellWidth_nm: 0.5, nModes: 3 },
  tunneling: { barrierHeight_eV: 2.0, electronEnergy_eV: 1.0, showMultipleHeights: true },
  hydrogenLevels: { nMax: 5, showSubshells: true },
};

// ─── Graph Components ───

function FiniteWellWavefunctions({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.finiteWell, ...params };
  const w = 660, h = 370, ox = 40, oy = 330;
  const wellLeft = 200, wellRight = 420;
  const wellW = wellRight - wellLeft;
  const V0_px = 280;
  const wellTop = oy - V0_px;
  const tailLen = 140;

  const modes = [];
  for (let n = 1; n <= p.nModes; n++) {
    const En_frac = n * n / (p.nModes * p.nModes + 2);
    const E_px = En_frac * V0_px * 0.85;
    const baseline = oy - E_px;
    const amplitude = 34;
    const isEven = (n % 2 === 1);
    // Shrink kHalf so psi is significantly nonzero at the well edges.
    // Higher n → closer to V0 → larger boundary value (more penetration).
    const kHalf = (n * Math.PI - 0.5 - 0.3 * n) / 2;
    // Decay rate: lower states decay faster (further below V0)
    const decayRate = (1 - En_frac) * 3.5 + 1.2;

    const boundaryLeft = isEven
      ? amplitude * Math.cos(-kHalf)
      : amplitude * Math.sin(-kHalf);
    const boundaryRight = isEven
      ? amplitude * Math.cos(kHalf)
      : amplitude * Math.sin(kHalf);

    let pathStr = "";
    for (let px = wellLeft - tailLen; px <= wellRight + tailLen; px += 1) {
      let yVal = 0;
      if (px < wellLeft) {
        const dist = (wellLeft - px) / tailLen;
        yVal = boundaryLeft * Math.exp(-decayRate * dist * tailLen / 40);
      } else if (px > wellRight) {
        const dist = (px - wellRight) / tailLen;
        yVal = boundaryRight * Math.exp(-decayRate * dist * tailLen / 40);
      } else {
        const xCentered = (px - wellLeft) / wellW - 0.5;
        yVal = isEven
          ? amplitude * Math.cos(2 * kHalf * xCentered)
          : amplitude * Math.sin(2 * kHalf * xCentered);
      }
      const sy = baseline - yVal;
      pathStr += (px === wellLeft - tailLen ? "M" : " L") + px.toFixed(1) + "," + sy.toFixed(1);
    }
    const colors = [G.gold, G.blue, G.red];
    modes.push({ n, baseline, pathStr, color: colors[(n - 1) % 3], E_px });
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Wavefunctions in a finite potential well with evanescent tails</title>
        <defs>
          <marker id={`ahFW${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="16" fill={G.gold} fontSize="12" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Finite Well Wavefunctions (n=1..{p.nModes})
        </text>
        <rect x={wellLeft} y={wellTop} width={wellW} height={V0_px} fill={G.bg} stroke="none" opacity="0.3"/>
        <line x1={ox} y1={wellTop} x2={wellLeft} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellLeft} y1={wellTop} x2={wellLeft} y2={oy} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellLeft} y1={oy} x2={wellRight} y2={oy} stroke={G.ax} strokeWidth="1" strokeDasharray="4,3"/>
        <line x1={wellRight} y1={oy} x2={wellRight} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellRight} y1={wellTop} x2={w - 20} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <text x={wellLeft - 8} y={wellTop - 5} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">V_0</text>
        <text x={(wellLeft + wellRight) / 2} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">V=0</text>
        <text x={wellLeft} y={oy + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">x=0</text>
        <text x={wellRight} y={oy + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">x=a</text>
        <text x={ox + 20} y={wellTop + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Region I</text>
        <text x={(wellLeft + wellRight) / 2 - 18} y={wellTop + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Region II</text>
        <text x={wellRight + 10} y={wellTop + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">Region III</text>
        {modes.map(m => (
          <g key={m.n}>
            <line x1={wellLeft - tailLen} y1={m.baseline} x2={wellRight + tailLen} y2={m.baseline} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,4" opacity="0.4"/>
            <text x={wellRight + tailLen + 8} y={m.baseline + 4} fill={m.color} fontSize="10" fontFamily="'IBM Plex Mono'" fontWeight="600">n={m.n}</text>
            <path d={m.pathStr} fill="none" stroke={m.color} strokeWidth="2.5"/>
          </g>
        ))}
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahFW${mid})`}/>
        <text x={w - 8} y={oy + 14} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">x</text>
      </svg>
    </div>
  );
}

function FiniteWellProbDensity({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.finiteWell, ...params };
  const w = 660, h = 370, ox = 40, oy = 330;
  const wellLeft = 200, wellRight = 420;
  const wellW = wellRight - wellLeft;
  const V0_px = 280;
  const wellTop = oy - V0_px;
  const tailLen = 140;

  const modes = [];
  for (let n = 1; n <= p.nModes; n++) {
    const En_frac = n * n / (p.nModes * p.nModes + 2);
    const E_px = En_frac * V0_px * 0.85;
    const baseline = oy - E_px;
    const amplitude = 34;
    const isEven = (n % 2 === 1);
    const kHalf = (n * Math.PI - 0.5 - 0.3 * n) / 2;
    const decayRate = (1 - En_frac) * 3.5 + 1.2;

    const boundaryLeft = isEven
      ? amplitude * Math.cos(-kHalf)
      : amplitude * Math.sin(-kHalf);
    const boundaryRight = isEven
      ? amplitude * Math.cos(kHalf)
      : amplitude * Math.sin(kHalf);

    let pathStr = "";
    for (let px = wellLeft - tailLen; px <= wellRight + tailLen; px += 1) {
      let yVal = 0;
      if (px < wellLeft) {
        const dist = (wellLeft - px) / tailLen;
        yVal = boundaryLeft * Math.exp(-decayRate * dist * tailLen / 40);
      } else if (px > wellRight) {
        const dist = (px - wellRight) / tailLen;
        yVal = boundaryRight * Math.exp(-decayRate * dist * tailLen / 40);
      } else {
        const xCentered = (px - wellLeft) / wellW - 0.5;
        yVal = isEven
          ? amplitude * Math.cos(2 * kHalf * xCentered)
          : amplitude * Math.sin(2 * kHalf * xCentered);
      }
      // Scale |psi|^2 so tails are visible (boost by 1.8x)
      const psi2 = (yVal * yVal) / amplitude * 1.8;
      const sy = baseline - psi2;
      pathStr += (px === wellLeft - tailLen ? "M" : " L") + px.toFixed(1) + "," + sy.toFixed(1);
    }
    const colors = [G.gold, G.blue, G.red];
    modes.push({ n, baseline, pathStr, color: colors[(n - 1) % 3], E_px });
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Probability density for finite well bound states</title>
        <defs>
          <marker id={`ahPD${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="16" fill={G.gold} fontSize="12" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Probability Density |{"\u03C8"}|{"\u00B2"} (n=1..{p.nModes})
        </text>
        <rect x={wellLeft} y={wellTop} width={wellW} height={V0_px} fill={G.bg} stroke="none" opacity="0.3"/>
        <line x1={ox} y1={wellTop} x2={wellLeft} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellLeft} y1={wellTop} x2={wellLeft} y2={oy} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellLeft} y1={oy} x2={wellRight} y2={oy} stroke={G.ax} strokeWidth="1" strokeDasharray="4,3"/>
        <line x1={wellRight} y1={oy} x2={wellRight} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <line x1={wellRight} y1={wellTop} x2={w - 20} y2={wellTop} stroke={G.ax} strokeWidth="2"/>
        <text x={wellLeft - 8} y={wellTop - 5} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">V_0</text>
        <text x={(wellLeft + wellRight) / 2} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">V=0</text>
        <text x={wellLeft} y={oy + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">x=0</text>
        <text x={wellRight} y={oy + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">x=a</text>
        {modes.map(m => (
          <g key={m.n}>
            <line x1={wellLeft - tailLen} y1={m.baseline} x2={wellRight + tailLen} y2={m.baseline} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,4" opacity="0.4"/>
            <text x={wellRight + tailLen + 8} y={m.baseline + 4} fill={m.color} fontSize="10" fontFamily="'IBM Plex Mono'" fontWeight="600">n={m.n}</text>
            <path d={m.pathStr} fill="none" stroke={m.color} strokeWidth="2.5"/>
          </g>
        ))}
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahPD${mid})`}/>
        <text x={w - 8} y={oy + 14} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">x</text>
      </svg>
    </div>
  );
}

function TunnelingProbability({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.tunneling, ...params };
  const w = 480, h = 280, ox = 55, oy = 240;
  const plotW = w - ox - 30, plotH = oy - 30;
  const dMax = 2.0;
  const me = 9.109e-31;
  const eV = 1.602e-19;
  const hbar = 1.055e-34;

  const barriers = p.showMultipleHeights
    ? [{ V0: 1.0, E: 0.5, color: G.grn, label: "V0=1, E=0.5" },
       { V0: 2.0, E: 1.0, color: G.gold, label: "V0=2, E=1.0" },
       { V0: 4.0, E: 1.0, color: G.red, label: "V0=4, E=1.0" }]
    : [{ V0: p.barrierHeight_eV, E: p.electronEnergy_eV, color: G.gold, label: `V0=${p.barrierHeight_eV}, E=${p.electronEnergy_eV}` }];

  const curves = barriers.map(b => {
    const alpha = Math.sqrt(2 * me * (b.V0 - b.E) * eV) / hbar;
    const D = (b.V0 * b.V0) / (4 * b.E * (b.V0 - b.E));
    const points = [];
    for (let d = 0; d <= dMax; d += 0.01) {
      const d_m = d * 1e-9;
      const arg = alpha * d_m;
      const sinhVal = (Math.exp(arg) - Math.exp(-arg)) / 2;
      const T = 1 / (1 + D * sinhVal * sinhVal);
      const logT = T > 1e-12 ? Math.log10(T) : -12;
      const x = ox + (d / dMax) * plotW;
      const y = oy - ((logT + 12) / 12) * plotH;
      points.push(`${x.toFixed(1)},${Math.max(oy - plotH, Math.min(oy, y)).toFixed(1)}`);
    }
    return { ...b, path: "M" + points.join(" L") };
  });

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Tunneling transmission coefficient versus barrier width</title>
        <defs>
          <marker id={`ahTP${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Tunneling Probability T vs Barrier Width
        </text>
        <line x1={ox} y1={oy} x2={ox + plotW + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahTP${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 10} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahTP${mid})`}/>
        <text x={ox + plotW / 2} y={oy + 28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">d (nm)</text>
        <text x={12} y={oy - plotH / 2} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90, 12, ${oy - plotH / 2})`}>log10(T)</text>
        {[0, 0.5, 1.0, 1.5, 2.0].map(d => {
          const x = ox + (d / dMax) * plotW;
          return (
            <g key={d}>
              <line x1={x} y1={oy} x2={x} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
              <text x={x} y={oy + 16} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{d}</text>
            </g>
          );
        })}
        {[-12, -9, -6, -3, 0].map(v => {
          const y = oy - ((v + 12) / 12) * plotH;
          return (
            <g key={v}>
              <line x1={ox - 4} y1={y} x2={ox} y2={y} stroke={G.ax} strokeWidth="1"/>
              <text x={ox - 8} y={y + 3} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">{v}</text>
              <line x1={ox} y1={y} x2={ox + plotW} y2={y} stroke={G.ax} strokeWidth="0.3" strokeDasharray="3,4" opacity="0.4"/>
            </g>
          );
        })}
        {curves.map((c, i) => (
          <g key={i}>
            <path d={c.path} fill="none" stroke={c.color} strokeWidth="2"/>
            <text x={ox + plotW - 5} y={oy - plotH + 14 + i * 14} fill={c.color} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">{c.label} eV</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function HydrogenEnergyLevels({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.hydrogenLevels, ...params };
  const w = 480, h = 340, ox = 70, oy = 310;
  const topY = 30;
  const plotH = oy - topY;

  const E0 = -13.6;
  const levels = [];
  for (let n = 1; n <= p.nMax; n++) {
    const En = E0 / (n * n);
    const yFrac = (En - E0) / (0 - E0);
    const y = oy - yFrac * plotH;
    const subshells = [];
    if (p.showSubshells) {
      const labels = ["s", "p", "d", "f", "g"];
      for (let l = 0; l < n && l < labels.length; l++) {
        subshells.push(`${n}${labels[l]}`);
      }
    }
    levels.push({ n, En, y, subshells });
  }

  const lineLeft = ox + 10;
  const lineRight = w - 120;
  const lineW = lineRight - lineLeft;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Hydrogen atom energy levels with subshell labels</title>
        <defs>
          <marker id={`ahHL${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="18" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Hydrogen Atom Energy Levels
        </text>
        <line x1={ox} y1={oy + 5} x2={ox} y2={topY - 5} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahHL${mid})`}/>
        <text x={ox - 5} y={topY - 8} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E (eV)</text>
        <line x1={lineLeft} y1={topY} x2={lineRight} y2={topY} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4"/>
        <text x={lineRight + 5} y={topY + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">0 eV (free)</text>
        {levels.map(lv => {
          const nSub = lv.subshells.length;
          const segW = nSub > 0 ? lineW / (p.nMax > 1 ? Math.max(nSub, 1) : 1) : lineW;
          return (
            <g key={lv.n}>
              {nSub > 0 ? lv.subshells.map((sub, si) => {
                const x1 = lineLeft + si * (lineW / Math.max(nSub + 1, 2));
                const x2 = x1 + lineW / Math.max(nSub + 1, 2) * 0.8;
                const colors = [G.gold, G.blue, G.red, G.grn, G.txt];
                return (
                  <g key={sub}>
                    <line x1={x1} y1={lv.y} x2={x2} y2={lv.y} stroke={colors[si % colors.length]} strokeWidth="2.5"/>
                    <text x={(x1 + x2) / 2} y={lv.y - 6} fill={colors[si % colors.length]} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="500">{sub}</text>
                  </g>
                );
              }) : (
                <line x1={lineLeft} y1={lv.y} x2={lineRight} y2={lv.y} stroke={G.gold} strokeWidth="2.5"/>
              )}
              <text x={ox - 2} y={lv.y + 4} fill={G.ltxt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">{lv.En.toFixed(2)}</text>
              <text x={lineRight + 5} y={lv.y + 4} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" fontWeight="600">n={lv.n}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Interactive Components ───

function TunnelingCalculator() {
  const [V0, setV0] = useState(2.0);
  const [E, setE] = useState(1.0);
  const [d, setD] = useState(0.5);
  const me = 9.109e-31;
  const eV = 1.602e-19;
  const hbar = 1.055e-34;

  const alpha = Math.sqrt(2 * me * Math.max(V0 - E, 1e-6) * eV) / hbar;
  const D_coeff = V0 > E && E > 0 ? (V0 * V0) / (4 * E * (V0 - E)) : 0;
  const d_m = d * 1e-9;
  const arg = alpha * d_m;
  const sinhVal = (Math.exp(arg) - Math.exp(-arg)) / 2;
  const T = V0 > E && E > 0 ? 1 / (1 + D_coeff * sinhVal * sinhVal) : (E >= V0 ? 1 : 0);
  const logT = T > 0 ? Math.log10(T) : -99;

  const sliderStyle = { width: "100%", accentColor: "var(--accent)", cursor: "pointer" };
  const labelStyle = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 };
  const valStyle = { color: "var(--accent)", fontWeight: 600 };

  return (
    <div className="key-concept">
      <span className="kc-label">Interactive Calculator</span>
      <div className="kc-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={labelStyle}><span>Barrier height V_0</span><span style={valStyle}>{V0.toFixed(2)} eV</span></div>
          <input type="range" min="0.5" max="10" step="0.1" value={V0} onChange={e => { const v = parseFloat(e.target.value); setV0(v); if (E >= v) setE(Math.max(0.1, v - 0.1)); }} style={sliderStyle} />
        </div>
        <div>
          <div style={labelStyle}><span>Electron energy E</span><span style={valStyle}>{E.toFixed(2)} eV</span></div>
          <input type="range" min="0.1" max={Math.max(V0 - 0.01, 0.2)} step="0.05" value={Math.min(E, V0 - 0.01)} onChange={e => setE(parseFloat(e.target.value))} style={sliderStyle} />
        </div>
        <div>
          <div style={labelStyle}><span>Barrier width d</span><span style={valStyle}>{d.toFixed(2)} nm</span></div>
          <input type="range" min="0.05" max="3" step="0.05" value={d} onChange={e => setD(parseFloat(e.target.value))} style={sliderStyle} />
        </div>
        <div className="data-table" style={{ margin: 0 }}>
          <table>
            <tbody>
              <tr><td>Decay constant alpha</td><td><Eq display={false}>{`${(alpha * 1e-9).toFixed(3)} \\text{ nm}^{-1}`}</Eq></td></tr>
              <tr><td>Transmission T</td><td><Eq display={false}>{`${T.toExponential(3)}`}</Eq></td></tr>
              <tr><td>log_10(T)</td><td><Eq display={false}>{`${logT.toFixed(2)}`}</Eq></td></tr>
              <tr><td>Reflection R</td><td><Eq display={false}>{`${(1 - T).toFixed(6)}`}</Eq></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TunnelingWavefunctionAnimation() {
  const [V0, setV0] = useState(3.0);
  const [dBarrier, setDBarrier] = useState(1.0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState(0);
  const frameRef = useRef(null);

  const me = 9.109e-31;
  const eV = 1.602e-19;
  const hbar = 1.055e-34;
  const E_eV = 1.0;
  const alpha = Math.sqrt(2 * me * Math.max(V0 - E_eV, 0.01) * eV) / hbar;
  const d_m = dBarrier * 1e-9;
  const D_coeff = V0 > E_eV ? (V0 * V0) / (4 * E_eV * (V0 - E_eV)) : 1;
  const arg = alpha * d_m;
  const sinhVal = (Math.exp(arg) - Math.exp(-arg)) / 2;
  const T = V0 > E_eV ? 1 / (1 + D_coeff * sinhVal * sinhVal) : 1;
  const sqrtT = Math.sqrt(Math.max(T, 1e-12));

  useEffect(() => {
    if (!playing) { if (frameRef.current) cancelAnimationFrame(frameRef.current); return; }
    let lastTime = null;
    const step = (ts) => {
      if (lastTime !== null) setPhase(prev => (prev + (ts - lastTime) * 0.003) % (2 * Math.PI));
      lastTime = ts;
      frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [playing]);

  const w = 600, h = 200;
  const barrierLeft = 200, barrierRight = 400;
  const midY = h / 2;
  const amp = 50;
  const k = 0.15;

  const decayRate = Math.min(alpha * 1e-9 * dBarrier, 10);
  const barrierW = barrierRight - barrierLeft;

  const incidentPath = [];
  for (let x = 0; x <= barrierLeft; x += 2) {
    const y = midY - amp * Math.sin(k * x - phase);
    incidentPath.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
  }

  const decayPath = [];
  const ampAtLeft = amp;
  const ampAtRight = amp * Math.max(sqrtT, 0.02);
  const yEntryVal = Math.sin(k * barrierLeft - phase);
  const yExitVal = Math.sin(k * barrierRight - phase);
  for (let x = barrierLeft; x <= barrierRight; x += 2) {
    const frac = (x - barrierLeft) / barrierW;
    const localAmp = ampAtLeft * Math.exp(-decayRate * frac);
    const exitAmp = ampAtRight;
    const blend = frac;
    const envelope = localAmp * yEntryVal * (1 - blend) + exitAmp * yExitVal * blend;
    const y = midY - envelope;
    decayPath.push(`${x === barrierLeft ? "M" : "L"}${x},${y.toFixed(1)}`);
  }

  const transPath = [];
  for (let x = barrierRight; x <= w; x += 2) {
    const y = midY - ampAtRight * Math.sin(k * x - phase);
    transPath.push(`${x === barrierRight ? "M" : "L"}${x},${y.toFixed(1)}`);
  }

  const sliderStyle = { width: "100%", accentColor: "var(--accent)", cursor: "pointer" };
  const labelStyle = { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 };
  const valStyle = { color: "var(--accent)", fontWeight: 600 };

  return (
    <div className="key-concept">
      <span className="kc-label">Tunneling Wavefunction Animation</span>
      <div className="kc-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ background: G.bg, borderRadius: 6, border: `1px solid ${G.ax}33` }}>
          <title>Animated tunneling wavefunction through a potential barrier</title>
          <rect x={barrierLeft} y={20} width={barrierW} height={h - 40} fill={G.ax} fillOpacity={0.18} stroke={G.ax} strokeWidth={1} strokeDasharray="4,3" />
          <text x={(barrierLeft + barrierRight) / 2} y={16} textAnchor="middle" fill={G.txt} fontSize={10} fontFamily="'IBM Plex Mono', monospace">Classically Forbidden</text>
          <path d={incidentPath.join("")} fill="none" stroke={G.blue} strokeWidth={2} />
          <path d={decayPath.join("")} fill="none" stroke={G.red} strokeWidth={2} strokeDasharray="4,2" />
          <path d={transPath.join("")} fill="none" stroke={G.gold} strokeWidth={2} />
          <text x={10} y={h - 8} fill={G.blue} fontSize={10} fontFamily="'IBM Plex Mono', monospace">Incident</text>
          <text x={(barrierLeft + barrierRight) / 2} y={h - 8} textAnchor="middle" fill={G.red} fontSize={10} fontFamily="'IBM Plex Mono', monospace">Evanescent</text>
          <text x={w - 10} y={h - 8} textAnchor="end" fill={G.gold} fontSize={10} fontFamily="'IBM Plex Mono', monospace">Transmitted</text>
          <text x={w - 10} y={18} textAnchor="end" fill={G.txt} fontSize={10} fontFamily="'IBM Plex Mono', monospace">T = {T.toExponential(2)}</text>
        </svg>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-dim)" }}>E = 1.0 eV (fixed)</span>
        </div>
        <div onClick={e => e.stopPropagation()}>
          <div style={labelStyle}><span>Barrier height V_0</span><span style={valStyle}>{V0.toFixed(1)} eV</span></div>
          <input type="range" min="1" max="5" step="0.1" value={V0} onChange={e => setV0(parseFloat(e.target.value))} style={sliderStyle} onClick={e => e.stopPropagation()} />
        </div>
        <div onClick={e => e.stopPropagation()}>
          <div style={labelStyle}><span>Barrier width d</span><span style={valStyle}>{dBarrier.toFixed(1)} nm</span></div>
          <input type="range" min="0.2" max="2.0" step="0.1" value={dBarrier} onChange={e => setDBarrier(parseFloat(e.target.value))} style={sliderStyle} onClick={e => e.stopPropagation()} />
        </div>
        <div onClick={e => e.stopPropagation()}>
          <div style={labelStyle}><span>Phase offset</span><span style={valStyle}>{(phase % (2 * Math.PI)).toFixed(2)} rad</span></div>
          <input type="range" min="0" max={2 * Math.PI} step="0.05" value={phase % (2 * Math.PI)} onChange={e => { setPlaying(false); setPhase(parseFloat(e.target.value)); }} style={sliderStyle} onClick={e => e.stopPropagation()} />
        </div>
      </div>
    </div>
  );
}

function OrbitalProbabilityCloud() {
  const [orbital, setOrbital] = useState("1s");
  const [dots, setDots] = useState([]);
  const a0 = 1;

  const generateDots = useCallback((orb) => {
    const newDots = [];
    const numDots = 800;
    let maxR, psiSq;

    switch (orb) {
      case "1s":
        maxR = 6 * a0;
        psiSq = (r) => Math.exp(-2 * r / a0);
        break;
      case "2s":
        maxR = 12 * a0;
        psiSq = (r) => Math.pow(2 - r / a0, 2) * Math.exp(-r / a0);
        break;
      case "2p":
        maxR = 12 * a0;
        psiSq = (r, theta) => r * r * Math.cos(theta) * Math.cos(theta) * Math.exp(-r / a0);
        break;
      case "3s":
        maxR = 20 * a0;
        psiSq = (r) => Math.pow(27 - 18 * r / a0 + 2 * r * r / (a0 * a0), 2) * Math.exp(-2 * r / (3 * a0));
        break;
      default:
        maxR = 6 * a0;
        psiSq = (r) => Math.exp(-2 * r / a0);
    }

    // Find max psi^2 for rejection sampling
    let maxPsi = 0;
    for (let i = 0; i < 2000; i++) {
      const r = Math.random() * maxR;
      const theta = Math.random() * Math.PI;
      const val = r * r * psiSq(r, theta);
      if (val > maxPsi) maxPsi = val;
    }

    let attempts = 0;
    while (newDots.length < numDots && attempts < numDots * 100) {
      attempts++;
      const r = Math.random() * maxR;
      const theta = Math.random() * Math.PI * 2;
      const cosTheta3D = Math.random() * 2 - 1;
      const theta3D = Math.acos(cosTheta3D);
      const prob = r * r * psiSq(r, theta3D);
      if (Math.random() < prob / maxPsi) {
        const phi = Math.random() * 2 * Math.PI;
        const xProj = r * Math.sin(theta3D) * Math.cos(phi);
        const yProj = r * cosTheta3D;
        newDots.push({ x: xProj, y: yProj });
      }
    }
    return newDots;
  }, []);

  useEffect(() => {
    setDots(generateDots(orbital));
  }, [orbital, generateDots]);

  const svgSize = 400;
  const scale = orbital === "3s" ? 9 : (orbital === "2s" || orbital === "2p" ? 14 : 25);
  const cx = svgSize / 2, cy = svgSize / 2;

  return (
    <div className="key-concept">
      <span className="kc-label">Orbital Probability Cloud</span>
      <div className="kc-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }} onClick={e => e.stopPropagation()}>
          <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--text-muted)" }}>Orbital:</label>
          <select value={orbital} onChange={e => { e.stopPropagation(); setOrbital(e.target.value); }} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, cursor: "pointer" }}>
            <option value="1s">1s</option>
            <option value="2s">2s</option>
            <option value="2p">2p (m=0)</option>
            <option value="3s">3s</option>
          </select>
          <button onClick={e => { e.stopPropagation(); setDots(generateDots(orbital)); }} style={{ padding: "3px 12px", borderRadius: 4, border: "1px solid var(--accent)", background: "transparent", color: "var(--accent)", cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600 }}>Regenerate</button>
        </div>
        <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ background: G.bg, borderRadius: 6, border: `1px solid ${G.ax}33`, maxWidth: 400 }}>
          <title>Orbital probability cloud dot plot for hydrogen atom</title>
          <line x1={0} y1={cy} x2={svgSize} y2={cy} stroke={G.ax} strokeWidth={0.5} strokeOpacity={0.3} />
          <line x1={cx} y1={0} x2={cx} y2={svgSize} stroke={G.ax} strokeWidth={0.5} strokeOpacity={0.3} />
          {dots.map((d, i) => (
            <circle key={i} cx={cx + d.x * scale} cy={cy - d.y * scale} r={1.5} fill={G.gold} fillOpacity={0.5} />
          ))}
          <circle cx={cx} cy={cy} r={3} fill={G.red} />
          <text x={cx + 6} y={cy - 4} fill={G.red} fontSize={10} fontFamily="'IBM Plex Mono', monospace">nucleus</text>
          <text x={svgSize - 8} y={svgSize - 8} textAnchor="end" fill={G.txt} fontSize={10} fontFamily="'IBM Plex Mono', monospace">{orbital} orbital, {dots.length} samples</text>
        </svg>
      </div>
    </div>
  );
}

function ShellFillingDiagram() {
  const fillOrder = [
    { label: "1s", n: 1, l: 0, max: 2 },
    { label: "2s", n: 2, l: 0, max: 2 },
    { label: "2p", n: 2, l: 1, max: 6 },
    { label: "3s", n: 3, l: 0, max: 2 },
    { label: "3p", n: 3, l: 1, max: 6 },
    { label: "4s", n: 4, l: 0, max: 2 },
    { label: "3d", n: 3, l: 2, max: 10 },
    { label: "4p", n: 4, l: 1, max: 6 },
    { label: "5s", n: 5, l: 0, max: 2 },
    { label: "4d", n: 4, l: 2, max: 10 },
    { label: "5p", n: 5, l: 1, max: 6 },
  ];
  const [electronCount, setElectronCount] = useState(11);

  let remaining = electronCount;
  const filled = fillOrder.map(sub => {
    const count = Math.min(remaining, sub.max);
    remaining -= count;
    return { ...sub, count };
  });

  // Cr (Z=24): [Ar] 3d^5 4s^1 and Cu (Z=29): [Ar] 3d^10 4s^1
  // Half-filled and fully-filled d subshells have extra stability
  if (electronCount === 24 || electronCount === 29) {
    const s4 = filled.find(s => s.label === "4s");
    const d3 = filled.find(s => s.label === "3d");
    if (s4 && d3) { s4.count = 1; d3.count = electronCount === 24 ? 5 : 10; }
  }

  const configStr = filled.filter(s => s.count > 0).map(s => `${s.label}^{${s.count}}`).join("\\,");
  const elementNames = ["", "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar", "K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"];
  const elName = electronCount <= 36 ? (elementNames[electronCount] || `Z=${electronCount}`) : `Z=${electronCount}`;

  const boxSize = 22;
  const gap = 3;

  return (
    <div className="key-concept">
      <span className="kc-label">Interactive Shell Filling (Z = {electronCount}, {elName})</span>
      <div className="kc-body">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }}>Electrons:</span>
          <input type="range" min="1" max="36" step="1" value={electronCount} onChange={e => setElectronCount(parseInt(e.target.value))} style={{ flex: 1, accentColor: "var(--accent)", cursor: "pointer" }} />
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--accent)", fontWeight: 600, minWidth: 20, textAlign: "right" }}>{electronCount}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {filled.map(sub => {
            const orbitals = sub.max / 2;
            return (
              <div key={sub.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: sub.count > 0 ? "var(--accent)" : "var(--text-dim)", fontWeight: sub.count > 0 ? 600 : 400 }}>{sub.label}</span>
                <div style={{ display: "flex", gap: gap }}>
                  {Array.from({ length: orbitals }, (_, i) => {
                    // Hund's rule: fill spin-up across all orbitals first, then spin-down
                    const hasSpinUp = i < Math.min(sub.count, orbitals) ? 1 : 0;
                    const hasSpinDown = sub.count > orbitals && i < (sub.count - orbitals) ? 1 : 0;
                    const eInBox = hasSpinUp + hasSpinDown;
                    return (
                      <div key={i} style={{ width: boxSize, height: boxSize, border: `1px solid ${sub.count > 0 ? "var(--accent)" : "var(--border)"}`, borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: "var(--accent)", fontWeight: 600, background: eInBox > 0 ? "var(--bg-eq)" : "transparent" }}>
                        {eInBox === 2 ? "\u2191\u2193" : eInBox === 1 ? "\u2191" : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <Eq>{configStr}</Eq>
      </div>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "finite-well",
    tab: "Finite Potential Well",
    title: "1. Finite Potential Well",
    subtitle: "Bound states with evanescent tails and penetration depth",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Setup: Three Regions">
          <P>Consider a finite potential well of depth <M>{"V_0"}</M> and width <M>{"a"}</M>. Unlike the infinite well, the potential outside is finite, so the wavefunction does not vanish at the boundaries.</P>
          <ul className="info-list">
            <li><b>Region I</b> (<M>{"x \\lt 0"}</M>): <M>{"V = V_0"}</M></li>
            <li><b>Region II</b> (<M>{"0 \\lt x \\lt a"}</M>): <M>{"V = 0"}</M> (inside the well)</li>
            <li><b>Region III</b> (<M>{"x \\gt a"}</M>): <M>{"V = V_0"}</M></li>
          </ul>
          <P>For bound states, the electron energy satisfies <M>{"0 \\lt E \\lt V_0"}</M>.</P>
        </Section>

        <Section title="Wavefunctions in Each Region">
          <P>The time-independent Schrodinger equation in 1D:</P>
          <Eq>{"\\frac{d^2 \\psi}{dx^2} + \\frac{2m_e}{\\hbar^2}(E - V)\\psi = 0"}</Eq>

          <KeyConcept label="Region II (Inside Well, V=0)">
            The solution is sinusoidal (free-particle-like):
            <Eq>{"\\psi_{\\text{II}}(x) = B_1 e^{jkx} + B_2 e^{-jkx}"}</Eq>
            where <M>{"k^2 = \\frac{2m_e E}{\\hbar^2}"}</M> and <M>{"E \\gt 0"}</M>.
          </KeyConcept>

          <KeyConcept label="Regions I and III (Outside Well)">
            Since <M>{"E - V_0 \\lt 0"}</M>, the solutions are exponential:
            <Eq>{"\\psi_{\\text{I}}(x) = A_1 e^{\\alpha x} + A_2 e^{-\\alpha x}"}</Eq>
            <Eq>{"\\psi_{\\text{III}}(x) = C_1 e^{\\alpha x} + C_2 e^{-\\alpha x}"}</Eq>
            where the decay constant is:
            <Eq>{"\\alpha^2 = \\frac{2m_e(V_0 - E)}{\\hbar^2}"}</Eq>
          </KeyConcept>

          <P>Physical requirement: <M>{"\\psi"}</M> must remain finite as <M>{"x \\to \\pm\\infty"}</M>. This eliminates the growing exponential in each outer region: <M>{"A_2 = 0"}</M> in Region I and <M>{"C_1 = 0"}</M> in Region III.</P>
        </Section>

        <Section title="Boundary Conditions">
          <P>At each interface, both <M>{"\\psi"}</M> and <M>{"d\\psi/dx"}</M> must be continuous:</P>
          <Eq>{"\\psi_{\\text{II}}(a) = \\psi_{\\text{III}}(a), \\quad \\frac{d\\psi_{\\text{II}}}{dx}\\bigg|_{x=a} = \\frac{d\\psi_{\\text{III}}}{dx}\\bigg|_{x=a}"}</Eq>
          <P>For the even-parity ground state (cosine solution centered at <M>{"a/2"}</M>):</P>
          <Eq>{"\\psi_{\\text{II}}(x) = A \\cos\\!\\left(k\\left(x - \\tfrac{a}{2}\\right)\\right)"}</Eq>
          <P>Applying boundary conditions at <M>{"x = a"}</M> yields transcendental equations for even and odd parity states:</P>
          <Eq>{"\\text{Even parity: } \\alpha = k \\tan\\!\\left(\\frac{ka}{2}\\right)"}</Eq>
          <Eq>{"\\text{Odd parity: } \\alpha = -k \\cot\\!\\left(\\frac{ka}{2}\\right)"}</Eq>
          <P>These must be solved graphically or numerically. The intersections of the right-hand side with <M>{"\\alpha(E) = \\sqrt{2m_e(V_0 - E)/\\hbar^2}"}</M> give the allowed energy levels. Note that there is always at least one even-parity bound state, no matter how shallow the well.</P>
        </Section>

        <Section title="Penetration Depth">
          <KeyConcept label="Penetration Depth" tested>
            The distance over which the wavefunction decays to 1/e of its boundary value:
            <Eq>{"\\delta = \\frac{1}{\\alpha} = \\frac{\\hbar}{\\sqrt{2m_e(V_0 - E)}}"}</Eq>
            Higher-energy states penetrate further into the barrier. As <M>{"E \\to V_0"}</M>, <M>{"\\delta \\to \\infty"}</M> and the state becomes unbound.
          </KeyConcept>
        </Section>

        <Section title="Number of Bound States">
          <P>The number of bound states in a finite well is always finite and can be estimated from:</P>
          <Eq>{"N \\geq 1, \\quad N \\leq \\left\\lfloor \\frac{1}{2} + \\frac{a}{\\pi}\\sqrt{\\frac{2m_e V_0}{\\hbar^2}} \\right\\rfloor"}</Eq>
          <P>There is always at least one bound state, regardless of how shallow the well.</P>
        </Section>

        <Section title="Key Differences from Infinite Well">
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Infinite Well</h4>
              <P><M>{"\\psi = 0"}</M> at boundaries. Energy: <M>{"E_n = \\frac{\\hbar^2 n^2 \\pi^2}{2m_e a^2}"}</M>. Infinite bound states.</P>
            </div>
            <div className="compare-card">
              <h4>Finite Well</h4>
              <P><M>{"\\psi \\neq 0"}</M> at boundaries (evanescent tails). Fewer bound states. <M>{"E_n^{(V_0)} \\lt E_n^{(\\infty)}"}</M> for each n.</P>
            </div>
          </div>
          <P>Example: for <M>{"a = 2"}</M> nm and <M>{"V_0 = 0.5"}</M> eV, only two bound states exist with <M>{"E_1 = 0.057"}</M> eV and <M>{"E_2 = 0.22"}</M> eV, compared to the infinite well values of 0.094 eV and 0.38 eV.</P>
        </Section>

        <Section title="Finite Well Wavefunctions">
          <FiniteWellWavefunctions params={gp.finiteWell} mid="t1" />
          <FiniteWellProbDensity params={gp.finiteWell} mid="t1pd" />
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW1" number="6b,c" title="Finite well comparison and penetration depth" points="10 pts">
            <P>A finite PE well of width 1 nm and barrier height <M>{"V_0 = 2.0"}</M> eV has three energy levels: <M>{"E_1 = 0.23"}</M>, <M>{"E_2 = 0.89"}</M>, <M>{"E_3 = 1.81"}</M> eV.</P>
            <P>(b) Are the finite well levels higher or lower than the infinite well levels?</P>
            <P>(c) Find the penetration depth for each energy level.</P>
            <CollapsibleBlock title="Solution">
              <P><b>(b) Finite well levels are lower than infinite well levels.</b></P>
              <P>In an infinite well, <M>{"\\psi"}</M> is forced to zero at the walls. In a finite well, the wavefunction penetrates into the barriers as evanescent tails (<M>{"\\psi \\sim e^{-\\alpha x}"}</M>), effectively increasing the wavelength of each standing-wave mode. Since <M>{"E_n \\propto 1/\\lambda^2"}</M>, longer wavelength means lower energy.</P>
              <P>Infinite well comparison (<M>{"E_n^\\infty = n^2 h^2/(8m_e a^2) = n^2 \\times 0.377"}</M> eV for <M>{"a = 1"}</M> nm):</P>
              <div className="data-table">
                <table>
                  <thead><tr><th>State</th><th><M>{"E_n^\\infty"}</M></th><th><M>{"E_n"}</M> (finite)</th><th>Reduction</th></tr></thead>
                  <tbody>
                    <tr><td><M>{"n=1"}</M></td><td>0.377 eV</td><td>0.23 eV</td><td>39%</td></tr>
                    <tr><td><M>{"n=2"}</M></td><td>1.508 eV</td><td>0.89 eV</td><td>41%</td></tr>
                    <tr><td><M>{"n=3"}</M></td><td>3.393 eV</td><td>1.81 eV</td><td>47%</td></tr>
                  </tbody>
                </table>
              </div>
              <P>Higher states are reduced more because they penetrate further into the barriers. Note <M>{"E_3^\\infty = 3.39"}</M> eV exceeds <M>{"V_0 = 2.0"}</M> eV; this state is barely confined in the finite well.</P>

              <svg viewBox="0 0 480 220" style={{ width: "100%", maxWidth: 480, display: "block", margin: "14px auto" }}>
                <text x="115" y="14" fill={G.ltxt} fontSize="11" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"Infinite Well"}</text>
                <line x1="30" y1="20" x2="30" y2="200" stroke={G.ax} strokeWidth="2" />
                <line x1="30" y1="200" x2="200" y2="200" stroke={G.ax} strokeWidth="1" />
                <line x1="200" y1="20" x2="200" y2="200" stroke={G.ax} strokeWidth="2" />
                <line x1="50" y1="183" x2="180" y2="183" stroke={G.blue} strokeWidth="2" strokeDasharray="5,3" />
                <text x="184" y="187" fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">{"0.38 eV"}</text>
                <line x1="50" y1="132" x2="180" y2="132" stroke={G.blue} strokeWidth="2" strokeDasharray="5,3" />
                <text x="184" y="136" fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">{"1.51 eV"}</text>
                <line x1="50" y1="47" x2="180" y2="47" stroke={G.blue} strokeWidth="2" strokeDasharray="5,3" />
                <text x="184" y="51" fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">{"3.39 eV"}</text>
                <text x="365" y="14" fill={G.ltxt} fontSize="11" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"Finite Well (V\u2080=2 eV)"}</text>
                <line x1="280" y1="110" x2="280" y2="200" stroke={G.ax} strokeWidth="2" />
                <line x1="280" y1="200" x2="450" y2="200" stroke={G.ax} strokeWidth="1" />
                <line x1="450" y1="110" x2="450" y2="200" stroke={G.ax} strokeWidth="2" />
                <line x1="265" y1="110" x2="280" y2="110" stroke={G.ax} strokeWidth="1" strokeDasharray="4,3" />
                <line x1="450" y1="110" x2="465" y2="110" stroke={G.ax} strokeWidth="1" strokeDasharray="4,3" />
                <text x="260" y="108" fill={G.txt} fontSize="9" textAnchor="end" fontFamily="'IBM Plex Mono'">{"V\u2080"}</text>
                <line x1="290" y1="190" x2="440" y2="190" stroke={G.gold} strokeWidth="2" />
                <text x="444" y="194" fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">{"0.23 eV"}</text>
                <line x1="290" y1="160" x2="440" y2="160" stroke={G.gold} strokeWidth="2" />
                <text x="444" y="164" fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">{"0.89 eV"}</text>
                <line x1="290" y1="119" x2="440" y2="119" stroke={G.gold} strokeWidth="2" />
                <text x="444" y="123" fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">{"1.81 eV"}</text>
                <line x1="200" y1="183" x2="280" y2="190" stroke={G.txt} strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
                <line x1="200" y1="132" x2="280" y2="160" stroke={G.txt} strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
                <line x1="200" y1="47" x2="280" y2="119" stroke={G.txt} strokeWidth="0.7" strokeDasharray="3,3" opacity="0.4" />
              </svg>

              <P><b>(c)</b> Penetration depth <M>{"\\delta = \\hbar / \\sqrt{2m_e(V_0 - E_n)}"}</M>:</P>
              <Eq>{"\\delta_1 = \\frac{1.054 \\times 10^{-34}}{\\sqrt{2(9.109 \\times 10^{-31})(1.77)(1.602 \\times 10^{-19})}} = \\frac{1.054 \\times 10^{-34}}{7.18 \\times 10^{-25}} = 0.147 \\text{ nm}"}</Eq>
              <Eq>{"\\delta_2 = \\frac{1.054 \\times 10^{-34}}{\\sqrt{2(9.109 \\times 10^{-31})(1.11)(1.602 \\times 10^{-19})}} = \\frac{1.054 \\times 10^{-34}}{5.69 \\times 10^{-25}} = 0.185 \\text{ nm}"}</Eq>
              <Eq>{"\\delta_3 = \\frac{1.054 \\times 10^{-34}}{\\sqrt{2(9.109 \\times 10^{-31})(0.19)(1.602 \\times 10^{-19})}} = \\frac{1.054 \\times 10^{-34}}{2.35 \\times 10^{-25}} = 0.448 \\text{ nm}"}</Eq>
              <P><b>Trend:</b> <M>{"\\delta_3 \\gg \\delta_2 > \\delta_1"}</M>. As <M>{"E_n \\to V_0"}</M>, <M>{"\\delta \\to \\infty"}</M> (state barely bound, wavefunction extends far into barrier). As <M>{"V_0 \\to \\infty"}</M>, <M>{"\\delta \\to 0"}</M> (recovers infinite well).</P>
              <KeyConcept label="Connection to Tunneling">
                The decay constant <M>{"\\alpha = 1/\\delta"}</M> is the same parameter controlling tunneling transmission: <M>{"T \\propto e^{-2\\alpha a}"}</M> (see <b>Quantum Tunneling</b> tab). In a well it describes evanescent decay outside; in a barrier it determines exponential attenuation through the barrier. Same physics, different geometry.
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW2" number="1" title="Double well" points="30 pts">
            <P>Qualitative problem. Consider a double square well potential (two wells of width <M>{"a"}</M>, depth <M>{"V_0"}</M>, separated by barrier of width <M>{"b"}</M>).</P>
            <P>(a) Sketch ground state <M>{"\\psi_1"}</M> and first excited state <M>{"\\psi_2"}</M> for (i) <M>{"b \\ll a"}</M>, (ii) <M>{"b \\approx a"}</M>, (iii) <M>{"b \\gg a"}</M>.</P>
            <P>(b) How do <M>{"E_1(b)"}</M> and <M>{"E_2(b)"}</M> vary as <M>{"b"}</M> goes from 0 to infinity?</P>
            <P>(c) Does the electron tend to draw the nuclei together or push them apart?</P>
            <CollapsibleBlock title="Solution">
              <P><b>(a)</b> The double well has mirror symmetry, so states are classified as symmetric (<M>{"\\psi_1"}</M>) or antisymmetric (<M>{"\\psi_2"}</M>).</P>

              <P><b>(i) <M>{"b \\ll a"}</M> (merged well):</b> The barrier is negligible; the system is a single well of width <M>{"\\approx 2a"}</M>. <M>{"\\psi_1"}</M> is the ground state: single broad sinusoidal peak. <M>{"\\psi_2"}</M> is the first excited state: full sine wave with a node at center and peaks of opposite sign in each half.</P>

              <P><b>(ii) <M>{"b \\approx a"}</M> (coupled wells):</b> The barrier is significant but tunneling connects the wells. <M>{"\\psi_1"}</M> (symmetric) has equal positive peaks in both wells, with exponential decay <M>{"\\psi \\sim e^{-\\alpha x}"}</M> through the barrier. <M>{"\\psi_2"}</M> (antisymmetric) has opposite-sign peaks with a node at the barrier center. The decay rate <M>{"\\alpha = \\sqrt{2m(V_0 - E)/\\hbar^2}"}</M> is the same parameter governing tunneling and penetration depth in the <b>Finite Well</b> and <b>Tunneling</b> tabs.</P>

              <P><b>(iii) <M>{"b \\gg a"}</M> (isolated wells):</b> Tunneling is negligible. Both states become degenerate (<M>{"E_1 \\approx E_2"}</M>), each equivalent to the ground state of an isolated well. Any linear combination is a valid solution, so the electron can be localized in either well.</P>

              <P><b>(b)</b> At <M>{"b = 0"}</M>, the merged well of width <M>{"2a"}</M> gives <M>{"E_1(0) \\approx E_0/4"}</M> (where <M>{"E_0"}</M> is the single-well ground state, since <M>{"E \\propto 1/a^2"}</M>). As <M>{"b"}</M> increases, the effective width shrinks, so <M>{"E_1"}</M> rises toward <M>{"E_0"}</M>. Meanwhile, <M>{"E_2"}</M> starts near <M>{"E_0"}</M> and converges to it from above. The tunnel splitting decreases exponentially:</P>
              <Eq>{"\\Delta E = E_2 - E_1 \\propto e^{-2\\alpha b}"}</Eq>

              <svg viewBox="0 0 460 200" style={{ width: "100%", maxWidth: 460, display: "block", margin: "14px auto" }}>
                <line x1="55" y1="180" x2="420" y2="180" stroke={G.ax} strokeWidth="1" />
                <line x1="55" y1="30" x2="55" y2="180" stroke={G.ax} strokeWidth="1" />
                <text x="240" y="198" fill={G.txt} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"Barrier width b"}</text>
                <text x="15" y="110" fill={G.txt} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono'" transform="rotate(-90,15,110)">{"Energy"}</text>
                <text x="62" y="195" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">{"0"}</text>
                <text x="410" y="195" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">{"\u221E"}</text>
                <line x1="55" y1="100" x2="420" y2="100" stroke={G.ax} strokeWidth="1" strokeDasharray="6,4" />
                <text x="425" y="104" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">{"E\u2080"}</text>
                <polyline points="60,160 80,148 100,138 120,130 140,124 160,118 180,114 200,110 220,108 250,105 280,103 310,102 350,101 400,100" fill="none" stroke={G.gold} strokeWidth="2.5" />
                <text x="65" y="175" fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'">{"E\u2081 (symmetric)"}</text>
                <polyline points="60,50 80,59 100,67 120,74 140,79 160,83 180,87 200,90 220,92 250,95 280,97 310,98 350,99 400,100" fill="none" stroke={G.blue} strokeWidth="2.5" />
                <text x="65" y="44" fill={G.blue} fontSize="10" fontFamily="'IBM Plex Mono'">{"E\u2082 (antisymmetric)"}</text>
                <line x1="140" y1="79" x2="140" y2="124" stroke={G.red} strokeWidth="1.5" />
                <polygon points="140,82 137,88 143,88" fill={G.red} />
                <polygon points="140,121 137,115 143,115" fill={G.red} />
                <text x="148" y="105" fill={G.red} fontSize="10" fontFamily="'IBM Plex Mono'">{"\u0394E"}</text>
              </svg>

              <P><b>(c)</b> The electron in <M>{"\\psi_1"}</M> has lower energy when <M>{"b"}</M> is small (larger splitting pushes <M>{"E_1"}</M> further below <M>{"E_0"}</M>). To minimize energy, the system prefers small <M>{"b"}</M>, so the electron tends to <b>draw the nuclei together</b>.</P>
              <P>Physically, the symmetric wavefunction has enhanced probability density between the two wells (nuclei). This shared electron density screens nuclear repulsion and provides the attractive force holding the bond together.</P>

              <KeyConcept label="Connection to Molecular Bonding">
                The symmetric state <M>{"\\psi_1"}</M> is the <b>bonding orbital</b>; the antisymmetric <M>{"\\psi_2"}</M> is the <b>antibonding orbital</b>. The splitting <M>{"\\Delta E(b)"}</M> determines bond energy. This is the quantum mechanical origin of the covalent bond, developed further in the <b>Bonding and Crystal Structures</b> lesson where the double-well model extends to the LCAO (linear combination of atomic orbitals) approach.
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW2" number="4" title="Asymmetric potential well" points="20 pts">
            <P>A particle of mass <M>{"m"}</M> in potential: <M>{"V = \\infty"}</M> for <M>{"x \\lt 0"}</M>, <M>{"V = -32\\hbar^2/(ma^2)"}</M> for <M>{"0 \\le x \\le a"}</M>, <M>{"V = 0"}</M> for <M>{"x > a"}</M>.</P>
            <P>(a) How many bound states? (b) Probability of particle being outside the well in the highest-energy bound state?</P>
            <CollapsibleBlock title="Solution">
              <P><b>(a) Deriving the transcendental equation:</b></P>
              <P>The infinite wall at <M>{"x = 0"}</M> enforces <M>{"\\psi(0) = 0"}</M>, so only sine solutions survive inside:</P>
              <ul className="info-list">
                <li><b>Inside</b> (<M>{"0 \\le x \\le a"}</M>): <M>{"\\psi = A\\sin(kx)"}</M>, where <M>{"k^2 = 2m(E + V_0)/\\hbar^2"}</M></li>
                <li><b>Outside</b> (<M>{"x > a"}</M>): <M>{"\\psi = Be^{-\\alpha x}"}</M>, where <M>{"\\alpha^2 = 2m|E|/\\hbar^2"}</M></li>
              </ul>
              <P>Define <M>{"z = ka"}</M>. Then <M>{"z^2 + (\\alpha a)^2 = 2mV_0 a^2/\\hbar^2 = 64"}</M> (since <M>{"V_0 = 32\\hbar^2/(ma^2)"}</M>). Matching <M>{"\\psi"}</M> and <M>{"\\psi'"}</M> at <M>{"x = a"}</M> and dividing:</P>
              <Eq>{"k\\cot(ka) = -\\alpha \\quad \\Longrightarrow \\quad z\\cot(z) = -\\sqrt{64 - z^2}"}</Eq>
              <P>Bound states require <M>{"0 \\lt z \\lt 8"}</M>. Each intersection of the LHS and RHS curves is a bound state:</P>

              {(() => {
                const W = 480, H = 260;
                const zMax = 8.5, vLo = -10, vHi = 3;
                const px = z => 50 + z / zMax * 410;
                const py = v => 30 + (vHi - v) / (vHi - vLo) * 210;
                const br = (z0, z1) => {
                  const p = [];
                  for (let z = z0; z <= z1; z += 0.025) {
                    const s = Math.sin(z);
                    if (Math.abs(s) < 0.015) continue;
                    const v = z * Math.cos(z) / s;
                    if (v < vLo || v > vHi) continue;
                    p.push(px(z).toFixed(1) + "," + py(v).toFixed(1));
                  }
                  return p.join(" ");
                };
                const cp = [];
                for (let z = 0; z <= 8.01; z += 0.04) cp.push(px(z).toFixed(1) + "," + py(-Math.sqrt(Math.max(0, 64 - z * z))).toFixed(1));
                const zs = [{ z: 2.786, lbl: "z\u2081=2.79" }, { z: 5.521, lbl: "z\u2082=5.52" }, { z: 7.957, lbl: "z\u2083=7.96" }];
                return (
                  <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", maxWidth: W, display: "block", margin: "14px auto" }}>
                    <line x1={px(0)} y1={py(vLo)} x2={px(zMax)} y2={py(vLo)} stroke={G.ax} strokeWidth="1" />
                    <line x1={px(0)} y1={py(vLo)} x2={px(0)} y2={py(vHi)} stroke={G.ax} strokeWidth="1" />
                    <line x1={px(0)} y1={py(0)} x2={px(zMax)} y2={py(0)} stroke={G.ax} strokeWidth="0.5" strokeDasharray="4,4" />
                    {[2, 4, 6, 8].map(t => <g key={t}><line x1={px(t)} y1={py(0) - 3} x2={px(t)} y2={py(0) + 3} stroke={G.ax} strokeWidth="1" /><text x={px(t)} y={py(0) + 15} fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{t}</text></g>)}
                    <text x={px(Math.PI)} y={py(0) + 27} fill={G.txt} fontSize="8" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"\u03C0"}</text>
                    <text x={px(2 * Math.PI)} y={py(0) + 27} fill={G.txt} fontSize="8" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"2\u03C0"}</text>
                    <polyline points={br(0.06, Math.PI - 0.06)} fill="none" stroke={G.gold} strokeWidth="2" />
                    <polyline points={br(Math.PI + 0.06, 2 * Math.PI - 0.06)} fill="none" stroke={G.gold} strokeWidth="2" />
                    <polyline points={br(2 * Math.PI + 0.06, 8)} fill="none" stroke={G.gold} strokeWidth="2" />
                    <polyline points={cp.join(" ")} fill="none" stroke={G.blue} strokeWidth="2" />
                    {zs.map((p, i) => {
                      const yv = -Math.sqrt(64 - p.z * p.z);
                      return <g key={i}><circle cx={px(p.z)} cy={py(yv)} r="5" fill={G.red} /><text x={px(p.z) + (i < 2 ? 9 : -9)} y={py(yv) - 8} fill={G.red} fontSize="10" textAnchor={i < 2 ? "start" : "end"} fontFamily="'IBM Plex Mono'">{p.lbl}</text></g>;
                    })}
                    <line x1={px(0.5)} y1={py(1.5)} x2={px(1.3)} y2={py(1.5)} stroke={G.gold} strokeWidth="2" />
                    <text x={px(1.4)} y={py(1.5) + 4} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">{"z cot(z)"}</text>
                    <line x1={px(3)} y1={py(1.5)} x2={px(3.8)} y2={py(1.5)} stroke={G.blue} strokeWidth="2" />
                    <text x={px(3.9)} y={py(1.5) + 4} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">{"-\u221A(64\u2212z\u00B2)"}</text>
                    <text x={px(zMax) - 5} y={py(vLo) + 15} fill={G.txt} fontSize="10" textAnchor="end" fontFamily="'IBM Plex Mono'">{"z = ka"}</text>
                  </svg>
                );
              })()}

              <P>Three intersections at <M>{"z_1 = 2.786"}</M>, <M>{"z_2 = 5.521"}</M>, <M>{"z_3 = 7.957"}</M> give <b>3 bound states</b>. No fourth exists because <M>{"z_0 = \\sqrt{64} = 8 \\lt 3\\pi \\approx 9.42"}</M> (the next branch starts at <M>{"z = 2\\pi"}</M> but the circle reaches zero at <M>{"z = 8"}</M>).</P>

              <P><b>(b)</b> For the highest state (<M>{"z_3 = 7.957"}</M>):</P>
              <Eq>{"\\alpha a = \\sqrt{64 - z_3^2} = \\sqrt{64 - 63.31} = \\sqrt{0.69} \\approx 0.83"}</Eq>
              <P>This very small <M>{"\\alpha a"}</M> means slow evanescent decay: <M>{"\\delta = 1/\\alpha = a/0.83 \\approx 1.2a"}</M>. The wavefunction extends roughly one well-width into the classically forbidden region.</P>
              <P>Computing the probability from the normalized wavefunction: <M>{"P_{\\text{in}} = \\int_0^a |\\psi|^2\\,dx"}</M> and <M>{"P_{\\text{out}} = \\int_a^\\infty |\\psi|^2\\,dx"}</M>. After normalization, <M>{"P_{\\text{outside}} \\approx 0.54"}</M> (54%). The particle spends more time outside the well than inside; characteristic of a barely-bound state (<M>{"E_3"}</M> very close to the continuum at <M>{"E = 0"}</M>).</P>

              <KeyConcept label="Barely-Bound States and Tunneling">
                When <M>{"\\alpha a \\ll 1"}</M>, the state is on the verge of becoming unbound. A small decrease in <M>{"V_0"}</M> would push <M>{"z_3"}</M> past <M>{"z_0"}</M>, eliminating the state entirely. The same evanescent decay that confines a particle in a well also permits transmission through a barrier (see <b>Quantum Tunneling</b> tab). Barely-bound states exhibit maximal penetration, bridging confinement and tunneling physics.
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "tunneling",
    tab: "Quantum Tunneling",
    title: "2. Quantum Tunneling",
    subtitle: "Transmission through classically forbidden barriers",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Classical vs Quantum Barrier">
          <P>In classical mechanics, a particle with energy <M>{"E \\lt V_0"}</M> is completely reflected by a potential barrier. In quantum mechanics, the wavefunction penetrates into and through the barrier, giving a nonzero probability of transmission.</P>
          <P>Consider a rectangular barrier of height <M>{"V_0"}</M> and width <M>{"a"}</M>:</P>
          <ul className="info-list">
            <li><b>Region I</b> (<M>{"x \\lt 0"}</M>): incident + reflected waves, <M>{"\\psi_{\\text{I}} = A_1 e^{jkx} + A_2 e^{-jkx}"}</M></li>
            <li><b>Region II</b> (<M>{"0 \\lt x \\lt a"}</M>): evanescent wave, <M>{"\\psi_{\\text{II}} = B_1 e^{\\alpha x} + B_2 e^{-\\alpha x}"}</M></li>
            <li><b>Region III</b> (<M>{"x \\gt a"}</M>): transmitted wave, <M>{"\\psi_{\\text{III}} = C_1 e^{jkx}"}</M></li>
          </ul>
        </Section>

        <Section title="Transmission Coefficient">
          <P>Applying boundary conditions at <M>{"x = 0"}</M> and <M>{"x = a"}</M>, the transmission coefficient is:</P>
          <Eq>{"T = \\frac{|\\psi_{\\text{III}}|^2}{|\\psi_{\\text{I,incident}}|^2} = \\frac{C_1^2}{A_1^2} = \\frac{1}{1 + D\\,\\sinh^2(\\alpha a)}"}</Eq>
          <P>where:</P>
          <Eq>{"D = \\frac{V_0^2}{4E(V_0 - E)}, \\quad \\alpha = \\frac{\\sqrt{2m_e(V_0 - E)}}{\\hbar}"}</Eq>

          <KeyConcept label="Thick Barrier Approximation">
            For <M>{"\\alpha a \\gg 1"}</M>, <M>{"\\sinh(\\alpha a) \\approx \\frac{1}{2}e^{\\alpha a}"}</M>, so:
            <Eq>{"T \\approx T_0 \\, e^{-2\\alpha a}, \\quad T_0 = \\frac{16 E(V_0 - E)}{V_0^2}"}</Eq>
            The transmission probability decays exponentially with barrier width and with <M>{"\\sqrt{V_0 - E}"}</M>. The prefactor <M>{"T_0"}</M> is of order unity and depends on the ratio <M>{"E/V_0"}</M>.
          </KeyConcept>

          <P>The reflection coefficient is simply:</P>
          <Eq>{"R = 1 - T"}</Eq>
        </Section>

        <Section title="Tunneling Probability vs Barrier Width">
          <TunnelingProbability params={gp.tunneling} mid="t2" />
        </Section>

        <Section title="Tunneling Calculator">
          <TunnelingCalculator />
        </Section>

        <Section title="Wavefunction Through a Barrier">
          <P>Watch the wavefunction propagate through a potential barrier. The incident wave (blue) decays exponentially inside the barrier (red, dashed), and a smaller transmitted wave (gold) emerges on the other side. Adjust the barrier parameters to see how they affect transmission.</P>
          <TunnelingWavefunctionAnimation />
        </Section>

        <Section title="Applications">
          <KeyConcept label="Scanning Tunneling Microscope (STM)">
            A sharp metal tip is held nanometers from a conductive surface. A bias voltage <M>{"V_b"}</M> is applied, creating a potential barrier (the vacuum gap). The tunneling current is:
            <Eq>{"I \\propto V_b \\cdot e^{-2\\alpha d}, \\quad \\alpha = \\frac{\\sqrt{2m_e \\phi}}{\\hbar}"}</Eq>
            where <M>{"\\phi"}</M> is the average work function and <M>{"d"}</M> is the tip-sample gap. The current is exponentially sensitive to <M>{"d"}</M>: a change of 0.1 nm changes the current by roughly one order of magnitude. Two operating modes exist: constant-current (feedback loop adjusts tip height to maintain fixed current, mapping topography) and constant-height (tip scans at fixed height, current variations map the surface).
          </KeyConcept>

          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "stm_gold_atomic_resolution.jpg"} alt="Scanning tunneling microscope image of gold Au(100) surface at atomic resolution showing individual atoms" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>STM image of Au(100) surface at atomic resolution. The STM itself operates via quantum tunneling. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, Public Domain</span></figcaption>
          </figure>

          <KeyConcept label="Alpha Decay">
            An alpha particle inside a nucleus is confined by the Coulomb barrier. Even though its energy is less than the barrier height, it has a small but nonzero probability of tunneling through. The decay rate depends exponentially on the barrier parameters, explaining the enormous range of half-lives observed in nature.
          </KeyConcept>

          <KeyConcept label="Tunnel Diode">
            In heavily doped p-n junctions, the depletion region is so thin (a few nm) that electrons can tunnel through it. This produces a region of negative differential resistance in the I-V curve, useful for high-frequency oscillators and fast switching circuits.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "uncertainty",
    tab: "Uncertainty Principle",
    title: "3. Heisenberg Uncertainty Principle",
    subtitle: "Fundamental limits on simultaneous measurements",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Position-Momentum Uncertainty">
          <P>It is fundamentally impossible to simultaneously determine a particle's position and momentum with arbitrary precision:</P>
          <Eq>{"\\Delta x \\cdot \\Delta p \\geq \\frac{\\hbar}{2}"}</Eq>
          <P>Here <M>{"\\Delta x"}</M> and <M>{"\\Delta p"}</M> are the standard deviations (uncertainties) in position and momentum measurements, and <M>{"\\hbar = h/(2\\pi) = 1.055 \\times 10^{-34}"}</M> J s.</P>

          <KeyConcept label="Not a Measurement Limitation">
            This is not about imperfect instruments. It is a fundamental property of nature arising from wave-particle duality. A particle described by a narrow wavepacket (small <M>{"\\Delta x"}</M>) necessarily has a broad spread of momentum components (large <M>{"\\Delta p"}</M>), and vice versa.
          </KeyConcept>
        </Section>

        <Section title="Energy-Time Uncertainty">
          <Eq>{"\\Delta E \\cdot \\Delta t \\geq \\frac{\\hbar}{2}"}</Eq>
          <P><M>{"\\Delta E"}</M> is the uncertainty in the energy of a state, and <M>{"\\Delta t"}</M> is the time over which the state exists or the measurement is performed.</P>

          <KeyConcept label="Natural Linewidth">
            An excited atomic state with lifetime <M>{"\\tau"}</M> has an energy uncertainty <M>{"\\Delta E \\geq \\hbar / (2\\tau)"}</M>. When the atom emits a photon, the photon energy is not perfectly sharp but has a natural linewidth proportional to <M>{"1/\\tau"}</M>. Short-lived states produce broad spectral lines; long-lived states produce narrow lines.
          </KeyConcept>
        </Section>

        <Section title="Consequence: Zero-Point Energy">
          <P>A particle confined to a region of size <M>{"a"}</M> has <M>{"\\Delta x \\leq a"}</M>. By the uncertainty principle:</P>
          <Eq>{"\\Delta p \\geq \\frac{\\hbar}{2a}"}</Eq>
          <P>This minimum momentum implies a minimum kinetic energy. For the infinite square well:</P>
          <Eq>{"E_1 = \\frac{\\hbar^2 \\pi^2}{2m_e a^2} = \\frac{h^2}{8m_e a^2} \\gt 0"}</Eq>

          <KeyConcept label="Zero-Point Energy">
            A confined quantum particle can never have zero kinetic energy. The ground state energy <M>{"E_1"}</M> is the zero-point energy. This is a direct consequence of the uncertainty principle: localizing a particle (small <M>{"\\Delta x"}</M>) requires nonzero momentum spread (and thus nonzero kinetic energy).
          </KeyConcept>

          <P>This explains why electrons in atoms, molecules, and solids always possess a minimum kinetic energy, and why atoms in a crystal lattice vibrate even at absolute zero temperature.</P>
        </Section>

        <Section title="Summary of Key Relations">
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Uncertainty Relation</th><th>Equation</th><th>Consequence</th></tr>
              </thead>
              <tbody>
                <tr><td>Position-Momentum</td><td><M>{"\\Delta x \\cdot \\Delta p \\geq \\hbar/2"}</M></td><td>Zero-point energy in confinement</td></tr>
                <tr><td>Energy-Time</td><td><M>{"\\Delta E \\cdot \\Delta t \\geq \\hbar/2"}</M></td><td>Natural linewidth of spectral lines</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    ),
  },
  {
    id: "hydrogen",
    tab: "Hydrogen Atom",
    title: "4. Hydrogen Atom",
    subtitle: "3D quantum numbers, energy levels, and orbital shapes",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="3D Potential Box: Three Quantum Numbers">
          <P>Extending the 1D infinite well to three dimensions, the Schrodinger equation becomes:</P>
          <Eq>{"\\frac{\\partial^2 \\psi}{\\partial x^2} + \\frac{\\partial^2 \\psi}{\\partial y^2} + \\frac{\\partial^2 \\psi}{\\partial z^2} + \\frac{2m_e}{\\hbar^2}(E - V)\\psi = 0"}</Eq>
          <P>For a box with sides <M>{"a, b, c"}</M>:</P>
          <Eq>{"\\psi_{n_1 n_2 n_3}(x,y,z) = A \\sin\\!\\left(\\frac{n_1 \\pi x}{a}\\right) \\sin\\!\\left(\\frac{n_2 \\pi y}{b}\\right) \\sin\\!\\left(\\frac{n_3 \\pi z}{c}\\right)"}</Eq>
          <Eq>{"E_{n_1 n_2 n_3} = \\frac{h^2}{8m_e}\\left(\\frac{n_1^2}{a^2} + \\frac{n_2^2}{b^2} + \\frac{n_3^2}{c^2}\\right)"}</Eq>

          <KeyConcept label="Degeneracy">
            For a cubic box (<M>{"a = b = c"}</M>), different combinations of <M>{"(n_1, n_2, n_3)"}</M> can give the same energy. For example, (2,1,1), (1,2,1), and (1,1,2) all have <M>{"E = 6h^2/(8m_e a^2)"}</M>. This is called degeneracy: multiple distinct quantum states share the same energy.
          </KeyConcept>
        </Section>

        <Section title="Coulomb Potential and Hydrogen">
          <P>The hydrogen atom has a Coulomb potential:</P>
          <Eq>{"V(r) = \\frac{-Ze^2}{4\\pi\\varepsilon_0 r}"}</Eq>
          <P>where <M>{"Z = 1"}</M> for hydrogen. Due to spherical symmetry, the wavefunction separates into radial and angular parts:</P>
          <Eq>{"\\psi(r, \\theta, \\phi) = \\psi_{n,\\ell,m_\\ell}(r, \\theta, \\phi) = R_{n,\\ell}(r) \\cdot Y_{\\ell, m_\\ell}(\\theta, \\phi)"}</Eq>
          <P>where <M>{"Y_{\\ell, m_\\ell}"}</M> are the spherical harmonics.</P>
        </Section>

        <Section title="Quantum Numbers">
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Quantum Number</th><th>Symbol</th><th>Allowed Values</th><th>Physical Meaning</th></tr>
              </thead>
              <tbody>
                <tr><td>Principal</td><td><M>{"n"}</M></td><td><M>{"1, 2, 3, \\ldots"}</M></td><td>Energy shell, size of orbital</td></tr>
                <tr><td>Orbital angular momentum</td><td><M>{"\\ell"}</M></td><td><M>{"0, 1, \\ldots, n{-}1"}</M></td><td>Shape of orbital (s, p, d, f)</td></tr>
                <tr><td>Magnetic</td><td><M>{"m_\\ell"}</M></td><td><M>{"-\\ell, \\ldots, 0, \\ldots, +\\ell"}</M></td><td>Orientation of orbital</td></tr>
                <tr><td>Spin</td><td><M>{"m_s"}</M></td><td><M>{"+\\tfrac{1}{2}, -\\tfrac{1}{2}"}</M></td><td>Intrinsic angular momentum</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Hydrogen Energy Levels">
          <Eq>{"E_n = \\frac{-13.6 \\text{ eV}}{n^2}"}</Eq>
          <P>The energy depends only on <M>{"n"}</M>, not on <M>{"\\ell"}</M> or <M>{"m_\\ell"}</M>. This means all subshells within the same shell are degenerate in hydrogen. The Bohr radius is <M>{"a_0 = 0.0529"}</M> nm.</P>
          <HydrogenEnergyLevels params={gp.hydrogenLevels} mid="t4" />

          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "hydrogen_spectrum_photo.jpg"} alt="Photograph of hydrogen gas discharge tube emission spectrum showing Balmer series visible spectral lines" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Hydrogen emission spectrum: discrete Balmer series lines (H-alpha 656nm red, H-beta 486nm cyan, H-gamma 434nm blue-violet) from quantized energy transitions. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC0 (Public Domain)</span></figcaption>
          </figure>
        </Section>

        <Section title="Orbital Probability Clouds">
          <P>The probability of finding the electron at a given position is proportional to <M>{"|\\psi(r, \\theta, \\phi)|^2"}</M>. This dot-density plot samples random positions weighted by the probability density, giving an intuitive picture of where the electron "lives" in each orbital.</P>
          <OrbitalProbabilityCloud />
        </Section>

        <Section title="Orbital Labels and Shapes">
          <div className="data-table">
            <table>
              <thead>
                <tr><th><M>{"\\ell"}</M></th><th>Letter</th><th>Shape</th><th>Number of orbitals (<M>{"2\\ell + 1"}</M>)</th></tr>
              </thead>
              <tbody>
                <tr><td>0</td><td>s</td><td>Spherically symmetric</td><td>1</td></tr>
                <tr><td>1</td><td>p</td><td>Dumbbell (three orientations: x, y, z)</td><td>3</td></tr>
                <tr><td>2</td><td>d</td><td>Cloverleaf (five orientations)</td><td>5</td></tr>
                <tr><td>3</td><td>f</td><td>Complex (seven orientations)</td><td>7</td></tr>
              </tbody>
            </table>
          </div>

          <KeyConcept label="Degeneracy Count">
            For principal quantum number <M>{"n"}</M>:
            <ul className="info-list">
              <li>Number of orbitals: <M>{"n^2"}</M> (ignoring spin)</li>
              <li>Number of states (with spin): <M>{"2n^2"}</M></li>
            </ul>
          </KeyConcept>
        </Section>

        <Section title="Angular Momentum">
          <P>The orbital angular momentum magnitude and its z-component are quantized:</P>
          <Eq>{"L = \\hbar\\sqrt{\\ell(\\ell + 1)}, \\quad L_z = m_\\ell \\hbar"}</Eq>
          <P>Note that <M>{"L"}</M> is always greater than the maximum <M>{"L_z = \\ell\\hbar"}</M>, so the angular momentum vector can never be fully aligned along any axis. This is a purely quantum mechanical result.</P>
          <P>The electron spin angular momentum follows the same pattern:</P>
          <Eq>{"S = \\hbar\\sqrt{s(s+1)} = \\frac{\\sqrt{3}}{2}\\hbar, \\quad S_z = m_s \\hbar = \\pm\\frac{\\hbar}{2}"}</Eq>
        </Section>

        <Section title="Selection Rules">
          <P>Not all transitions between energy levels are equally probable. For electric dipole transitions (emission/absorption of photons):</P>
          <Eq>{"\\Delta \\ell = \\pm 1, \\quad \\Delta m_\\ell = 0, \\pm 1"}</Eq>
          <P>For example, a transition from 2p to 1s is allowed (<M>{"\\Delta \\ell = -1"}</M>), but 2s to 1s is forbidden by the electric dipole selection rule (<M>{"\\Delta \\ell = 0"}</M>).</P>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW2" number="5" title="Virial theorem (Li ionization energy)" points="20 pts">
            <P>Li has nuclear charge <M>{"+3e"}</M>, full 1s shell, single 2s valence electron. Atomic radius 0.17 nm.</P>
            <P>(a) Using virial theorem with <M>{"Z_{eff} = 1"}</M> (perfect shielding by 1s electrons), estimate ionization energy. Compare to experimental 5.39 eV.</P>
            <P>(b) Repeat with <M>{"Z_{eff} = 1.25"}</M> (imperfect shielding).</P>
            <CollapsibleBlock title="Solution">
              <P><b>Setup:</b> The virial theorem for a Coulomb potential (<M>{"V \\propto 1/r"}</M>) states:</P>
              <Eq>{"\\langle T \\rangle = -E, \\quad \\langle V \\rangle = 2E"}</Eq>
              <P>The potential energy of the 2s electron at average radius <M>{"r_0"}</M> from a nucleus of effective charge <M>{"Z_{\\text{eff}}"}</M>:</P>
              <Eq>{"\\langle V \\rangle = \\frac{-Z_{\\text{eff}}\\,e^2}{4\\pi\\varepsilon_0\\,r_0}"}</Eq>
              <P>Since <M>{"E = \\langle V \\rangle / 2"}</M> by the virial theorem, the ionization energy is:</P>
              <Eq>{"I = -E = \\frac{Z_{\\text{eff}}\\,e^2}{8\\pi\\varepsilon_0\\,r_0}"}</Eq>
              <P>Using <M>{"e^2/(4\\pi\\varepsilon_0) = 1.44"}</M> eV nm:</P>
              <Eq>{"I = Z_{\\text{eff}} \\times \\frac{1.44}{2 \\times 0.17} = Z_{\\text{eff}} \\times 4.24 \\text{ eV}"}</Eq>

              <svg viewBox="0 0 420 200" style={{ width: "100%", maxWidth: 420, display: "block", margin: "14px auto" }}>
                <circle cx="140" cy="100" r="18" fill="rgba(224,108,117,0.15)" stroke={G.red} strokeWidth="1.5" />
                <text x="140" y="105" fill={G.red} fontSize="13" textAnchor="middle" fontFamily="'IBM Plex Mono'" fontWeight="600">{"+3e"}</text>
                <circle cx="140" cy="100" r="50" fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="5,3" />
                <circle cx="108" cy="72" r="7" fill={G.blue} opacity="0.6" />
                <text x="108" y="76" fill={G.ltxt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"\u2212e"}</text>
                <circle cx="172" cy="72" r="7" fill={G.blue} opacity="0.6" />
                <text x="172" y="76" fill={G.ltxt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"\u2212e"}</text>
                <text x="140" y="162" fill={G.blue} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"1s\u00B2 shell"}</text>
                <circle cx="140" cy="100" r="90" fill="none" stroke={G.gold} strokeWidth="1.5" strokeDasharray="8,4" />
                <circle cx="230" cy="100" r="7" fill={G.gold} opacity="0.7" />
                <text x="230" y="104" fill={G.ltxt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"\u2212e"}</text>
                <text x="140" y="202" fill={G.gold} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono'">{"2s\u00B9 valence"}</text>
                <text x="300" y="42" fill={G.ltxt} fontSize="11" fontFamily="'IBM Plex Mono'">{"Perfect shielding:"}</text>
                <text x="300" y="58" fill={G.txt} fontSize="11" fontFamily="'IBM Plex Mono'">{"Z_eff = 3\u22122 = 1"}</text>
                <text x="300" y="84" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'">{"Actual:"}</text>
                <text x="300" y="100" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'">{"Z_eff \u2248 1.25"}</text>
                <text x="300" y="126" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">{"(2s penetrates 1s shell)"}</text>
              </svg>

              <P><b>(a)</b> With <M>{"Z_{\\text{eff}} = 1"}</M> (perfect shielding: two 1s electrons fully cancel 2 of 3 protons):</P>
              <Eq>{"I = 1 \\times 4.24 = 4.24 \\text{ eV}"}</Eq>
              <P>This is 21% below the experimental 5.39 eV, indicating shielding is not perfect.</P>

              <P><b>(b)</b> With <M>{"Z_{\\text{eff}} = 1.25"}</M> (imperfect shielding):</P>
              <Eq>{"I = 1.25 \\times 4.24 = 5.30 \\text{ eV}"}</Eq>
              <P>Only 2% below experimental. The 2s orbital penetrates inside the 1s shell, so it "sees" more of the bare nuclear charge than perfect shielding predicts.</P>

              <KeyConcept label="Connection to Periodic Trends">
                This imperfect shielding is exactly the mechanism that breaks <M>{"\\ell"}</M>-degeneracy in multi-electron atoms (see <b>Atoms and Periodic Table</b> tab). Low-<M>{"\\ell"}</M> orbitals (s, p) penetrate closer to the nucleus and feel larger <M>{"Z_{\\text{eff}}"}</M> than high-<M>{"\\ell"}</M> orbitals (d, f). This is why 4s fills before 3d: despite higher <M>{"n"}</M>, the 4s orbital penetrates more and has lower energy.
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "periodic-table",
    tab: "Atoms & Periodic Table",
    title: "5. Atoms and the Periodic Table",
    subtitle: "Multi-electron atoms, exclusion principle, and electron configurations",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Multi-Electron Atoms">
          <P>Beyond hydrogen, atoms have multiple electrons that repel each other. The electron-electron repulsion breaks the <M>{"\\ell"}</M>-degeneracy: within the same shell <M>{"n"}</M>, different <M>{"\\ell"}</M> values now have different energies.</P>

          <KeyConcept label="Shielding Effect">
            Inner electrons partially screen the nuclear charge <M>{"Ze"}</M> from outer electrons. An electron in a low-<M>{"\\ell"}</M> orbital (e.g., s) penetrates closer to the nucleus and experiences a larger effective nuclear charge <M>{"Z_{\\text{eff}}"}</M> than an electron in a high-<M>{"\\ell"}</M> orbital (e.g., d or f). As a result, within the same shell, <M>{"E_s \\lt E_p \\lt E_d \\lt E_f"}</M>.
          </KeyConcept>
        </Section>

        <Section title="Pauli Exclusion Principle">
          <Eq>{"\\text{No two electrons can have the same set of four quantum numbers } (n, \\ell, m_\\ell, m_s)"}</Eq>
          <P>Each orbital (defined by <M>{"n, \\ell, m_\\ell"}</M>) can hold at most 2 electrons (spin up and spin down). Each subshell <M>{"\\ell"}</M> holds <M>{"2(2\\ell + 1)"}</M> electrons. Each shell <M>{"n"}</M> holds <M>{"2n^2"}</M> electrons.</P>
        </Section>

        <Section title="Aufbau Principle and Shell Filling Order">
          <P>Electrons fill orbitals from lowest energy to highest (aufbau = "building up" in German):</P>
          <Eq>{"1s \\to 2s \\to 2p \\to 3s \\to 3p \\to 4s \\to 3d \\to 4p \\to 5s \\to 4d \\to \\cdots"}</Eq>
          <P>Notice that 4s fills before 3d because the shielding effect makes 4s lower in energy than 3d in multi-electron atoms.</P>

          <KeyConcept label="Capacity of Each Subshell">
            <div className="data-table">
              <table>
                <thead>
                  <tr><th>Subshell</th><th><M>{"\\ell"}</M></th><th>Orbitals</th><th>Max electrons</th></tr>
                </thead>
                <tbody>
                  <tr><td>s</td><td>0</td><td>1</td><td>2</td></tr>
                  <tr><td>p</td><td>1</td><td>3</td><td>6</td></tr>
                  <tr><td>d</td><td>2</td><td>5</td><td>10</td></tr>
                  <tr><td>f</td><td>3</td><td>7</td><td>14</td></tr>
                </tbody>
              </table>
            </div>
          </KeyConcept>
        </Section>

        <Section title="Interactive Shell Filling">
          <ShellFillingDiagram />
        </Section>

        <Section title="Hund's Rules">
          <P>When filling degenerate orbitals within a subshell:</P>
          <ul className="info-list">
            <li><b>Rule 1</b>: Maximize total spin. Fill each orbital singly (all spin-up) before pairing.</li>
            <li><b>Rule 2</b>: Among states with the same spin, maximize total orbital angular momentum.</li>
          </ul>
          <P>Example: Carbon (6 electrons) has configuration <M>{"1s^2 2s^2 2p^2"}</M>. The two 2p electrons occupy separate orbitals with parallel spins rather than sharing one orbital.</P>
        </Section>

        <Section title="Periodic Trends">
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Ionization Energy</h4>
              <P>Energy to remove the outermost electron. Generally <b>increases</b> across a period (left to right) due to increasing <M>{"Z_{\\text{eff}}"}</M>, and <b>decreases</b> down a group due to larger atomic size and shielding.</P>
            </div>
            <div className="compare-card">
              <h4>Electronegativity</h4>
              <P>Tendency to attract electrons in a bond. Follows the same trend as ionization energy: increases across a period, decreases down a group. Fluorine is the most electronegative element.</P>
            </div>
          </div>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Atomic Radius</h4>
              <P><b>Decreases</b> across a period (more protons pull electrons closer) and <b>increases</b> down a group (new shells added). This trend is the inverse of ionization energy.</P>
            </div>
            <div className="compare-card">
              <h4>Electron Configurations</h4>
              <P>Example configurations: Na = <M>{"[\\text{Ne}]3s^1"}</M>, Fe = <M>{"[\\text{Ar}]3d^6 4s^2"}</M>, Cu = <M>{"[\\text{Ar}]3d^{10}4s^1"}</M> (exception: half/full d-shell stability).</P>
            </div>
          </div>
        </Section>

        <Section title="The Helium Problem">
          <P>Helium (Z=2) is the simplest multi-electron atom, but even it cannot be solved exactly because of the electron-electron repulsion term <M>{"e^2/(4\\pi\\varepsilon_0 r_{12})"}</M>. The ionization energy of He is 24.6 eV (first electron) vs 54.4 eV (second electron), illustrating the shielding effect of the first electron.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "graph-preview",
    tab: "Key Variables/Equations/Graphs",
    title: "All Graphs",
    subtitle: "Screenshot this tab and send to the chatbot for visual review",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Quick Reference: Key Variables">
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Symbol</th><th>Name</th><th>Meaning / Value</th></tr>
              </thead>
              <tbody>
                <tr><td><M>{"V_0"}</M></td><td>Well/barrier depth</td><td>Potential energy height (eV)</td></tr>
                <tr><td><M>{"a"}</M></td><td>Well/barrier width</td><td>Spatial extent (nm)</td></tr>
                <tr><td><M>{"\\psi"}</M></td><td>Wavefunction</td><td><M>{"|\\psi|^2"}</M> = probability density</td></tr>
                <tr><td><M>{"k"}</M></td><td>Wavenumber (inside well)</td><td><M>{"k = \\sqrt{2m_e E}/\\hbar"}</M></td></tr>
                <tr><td><M>{"\\alpha"}</M></td><td>Decay constant (outside well / in barrier)</td><td><M>{"\\alpha = \\sqrt{2m_e(V_0 - E)}/\\hbar"}</M></td></tr>
                <tr><td><M>{"\\delta"}</M></td><td>Penetration depth</td><td><M>{"1/\\alpha"}</M>; distance to 1/e decay</td></tr>
                <tr><td><M>{"T"}</M></td><td>Transmission coefficient</td><td>Tunneling probability through barrier</td></tr>
                <tr><td><M>{"R"}</M></td><td>Reflection coefficient</td><td><M>{"R = 1 - T"}</M></td></tr>
                <tr><td><M>{"\\Delta x,\\,\\Delta p"}</M></td><td>Position / momentum uncertainty</td><td>Standard deviations of measurements</td></tr>
                <tr><td><M>{"n"}</M></td><td>Principal quantum number</td><td>Energy shell / size; <M>{"n = 1, 2, 3, \\ldots"}</M></td></tr>
                <tr><td><M>{"\\ell"}</M></td><td>Orbital angular momentum QN</td><td>Shape (s,p,d,f); <M>{"\\ell = 0, \\ldots, n{-}1"}</M></td></tr>
                <tr><td><M>{"m_\\ell"}</M></td><td>Magnetic quantum number</td><td>Orientation; <M>{"m_\\ell = -\\ell, \\ldots, +\\ell"}</M></td></tr>
                <tr><td><M>{"m_s"}</M></td><td>Spin quantum number</td><td><M>{"\\pm\\tfrac{1}{2}"}</M></td></tr>
                <tr><td><M>{"Z_{\\text{eff}}"}</M></td><td>Effective nuclear charge</td><td>Screened charge felt by outer electrons</td></tr>
                <tr><td><M>{"a_0"}</M></td><td>Bohr radius</td><td>0.0529 nm</td></tr>
              </tbody>
            </table>
          </div>
          <P style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>Constants: <M>{"m_e = 9.109 \\times 10^{-31}"}</M> kg, <M>{"\\hbar = 1.055 \\times 10^{-34}"}</M> J s, <M>{"e = 1.602 \\times 10^{-19}"}</M> C</P>
        </Section>

        <Section title="Essential Equations">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "10px" }}>
            <KeyConcept label="Tunneling">
              <Eq>{"T = \\frac{1}{1 + D\\,\\sinh^2(\\alpha a)}, \\quad D = \\frac{V_0^2}{4E(V_0 - E)}"}</Eq>
              <P>Thick barrier: <M>{"T \\approx T_0\\,e^{-2\\alpha a}"}</M></P>
            </KeyConcept>
            <KeyConcept label="Penetration Depth">
              <Eq>{"\\delta = \\frac{1}{\\alpha} = \\frac{\\hbar}{\\sqrt{2m_e(V_0 - E)}}"}</Eq>
            </KeyConcept>
            <KeyConcept label="Uncertainty Relations">
              <Eq>{"\\Delta x \\cdot \\Delta p \\geq \\frac{\\hbar}{2}, \\qquad \\Delta E \\cdot \\Delta t \\geq \\frac{\\hbar}{2}"}</Eq>
            </KeyConcept>
            <KeyConcept label="Hydrogen Energy Levels">
              <Eq>{"E_n = \\frac{-13.6 \\text{ eV}}{n^2}"}</Eq>
              <P>Degeneracy: <M>{"n^2"}</M> orbitals, <M>{"2n^2"}</M> states</P>
            </KeyConcept>
            <KeyConcept label="Angular Momentum">
              <Eq>{"L = \\hbar\\sqrt{\\ell(\\ell+1)}, \\quad L_z = m_\\ell\\hbar"}</Eq>
            </KeyConcept>
            <KeyConcept label="Selection Rules">
              <Eq>{"\\Delta \\ell = \\pm 1, \\quad \\Delta m_\\ell = 0, \\pm 1"}</Eq>
            </KeyConcept>
          </div>
        </Section>

        <Section title="1. Finite Well Wavefunctions">
          <FiniteWellWavefunctions params={gp.finiteWell} mid="gp1" />
          <FiniteWellProbDensity params={gp.finiteWell} mid="gp1pd" />
        </Section>
        <Section title="2. Tunneling Probability">
          <TunnelingProbability params={gp.tunneling} mid="gp2" />
        </Section>
        <Section title="3. Hydrogen Energy Levels">
          <HydrogenEnergyLevels params={gp.hydrogenLevels} mid="gp3" />
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
function KeyConcept({ label, children, tested }) {
  return <div className={`key-concept${tested ? " hw-tested" : ""}`}><span className="kc-label">{label}</span><div className="kc-body">{children}</div></div>;
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

function HWQuestion({ hw, number, title, points, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "12px 0", border: "1px solid #2d6b3f", borderRadius: 6, overflow: "hidden", background: "rgba(45,107,63,0.06)" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", textAlign: "left", padding: "10px 14px", background: "rgba(45,107,63,0.12)",
        border: "none", color: "#5cb85c", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace",
        cursor: "pointer", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <span>{open ? "\u25BC" : "\u25BA"} {hw} P{number}: {title}</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>[{points}]</span>
      </button>
      {open && <div style={{ padding: "14px", background: "rgba(45,107,63,0.04)" }}>{children}</div>}
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
.hw-tested { border-left: 3px solid #5cb85c !important; box-shadow: inset 4px 0 0 -1px rgba(92,184,92,0.15); }
.hw-tested .kc-label::after { content: " [TESTED]"; color: #5cb85c; font-size: 11px; font-weight: 400; }

.info-list { margin: 8px 0; padding-left: 20px; list-style: none; }
.info-list li { position: relative; font-size: 15px; line-height: 2.2; color: var(--text-muted); padding-left: 4px; }
.info-list li::before { content: ">"; position: absolute; left: -16px; color: var(--accent); font-weight: 700; }

.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
@media (max-width: 520px) { .compare-grid { grid-template-columns: 1fr; } }
.compare-card { padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.compare-card h4 { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--accent); font-family: 'IBM Plex Mono', monospace; }

.data-table { margin: 12px 0; overflow-x: auto; }
.data-table table { width: 100%; border-collapse: collapse; font-size: 15px; }
.data-table th { text-align: left; padding: 8px 12px; background: var(--bg-eq); color: var(--accent); font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; border-bottom: 1px solid var(--border); }
.data-table td { padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border); font-family: 'IBM Plex Mono', monospace; }

.content-area { flex: 1; overflow-y: auto; padding-bottom: 80px; }

/* ─── Chatbot ─── */
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

/* ─── Context Selection ─── */
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

/* ─── Chat Reply Blocks ─── */
.chat-msg-rendered [data-chat-block] { cursor: pointer; transition: outline 0.15s, background 0.15s; border-radius: 3px; }
.chat-msg-rendered [data-chat-block]:hover { outline: 1px dashed var(--ctx-hover-outline); outline-offset: 2px; background: var(--ctx-hover-bg); }
.chat-reply-block { padding: 2px 0; }

/* ─── Context Menu ─── */
.ctx-menu { position: fixed; z-index: 10000; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; padding: 4px 0; box-shadow: 0 4px 16px rgba(0,0,0,0.4); font-family: 'IBM Plex Mono', monospace; min-width: 160px; }
.ctx-menu-item { display: block; width: 100%; padding: 6px 14px; background: none; border: none; color: var(--text-secondary); font-size: 14px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; text-align: left; }
.ctx-menu-item:hover { background: var(--ctx-hover-bg); color: var(--accent); }

/* --- Collapsible Block --- */
.collapsible-block { margin: 10px 0; border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
.collapsible-toggle { width: 100%; text-align: left; padding: 8px 12px; background: var(--bg-eq); border: none; color: var(--text-muted); font-size: 14px; font-family: 'IBM Plex Mono', monospace; cursor: pointer; transition: color 0.15s; }
.collapsible-toggle:hover { color: var(--accent); }
.collapsible-content { padding: 12px 14px; background: var(--bg-card); }

.graph-controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; padding: 6px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.graph-controls label { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px; }
.graph-ctrl-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--accent); font-weight: 500; white-space: nowrap; min-width: 120px; }
.graph-slider { flex: 1; min-width: 100px; height: 4px; accent-color: var(--accent); cursor: pointer; }
.graph-select { background: var(--bg-main); border: 1px solid var(--border); border-radius: 4px; color: var(--text-muted); font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 3px 6px; cursor: pointer; }
.graph-select:focus { border-color: var(--accent); outline: none; }
.graph-select option { background: var(--bg-panel); color: var(--text-muted); }

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
      try { return '<div class="chat-eq-block">' + window.katex.renderToString(deHtml(tex).trim(), { displayMode: true, throwOnError: false }) + '</div>'; }
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
      try { return window.katex.renderToString(deHtml(tex).trim(), { displayMode: false, throwOnError: false }); }
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
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations. -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/qm_atoms.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep thread responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/qm_atoms.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/qm_atoms.jsx now.`;
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
                {sessionStatus === "ready" && "Session active. Ask about finite wells, tunneling, hydrogen, or the periodic table. Click or highlight content to attach as context."}
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

// ─── Main App (copy verbatim, updated header) ───

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
      for (const [key, val] of Object.entries(edits)) { if (next[key]) next[key] = { ...next[key], ...val }; }
      return next;
    });
  }, []);

  const handleClearSnippet = useCallback((i) => { setContextSnippets(prev => prev.filter((_, idx) => idx !== i)); }, []);
  const handleClearAllSnippets = useCallback(() => setContextSnippets([]), []);

  const active = TOPICS[activeIdx];

  const addSnippet = useCallback((text, source) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < 3) return;
    setContextSnippets(prev => { if (prev.some(s => s.text === clean)) return prev; return [...prev, { text: clean, source }]; });
  }, []);

  const handleContentMouseDown = useCallback((e) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; }, []);

  const handleContentClick = useCallback((e) => {
    if (!chatOpen) return;
    if (e.target.closest(".chat-panel, .chat-toggle, .tab-bar, .header")) return;
    if (mouseDownPos.current) { const dx = Math.abs(e.clientX - mouseDownPos.current.x); const dy = Math.abs(e.clientY - mouseDownPos.current.y); if (dx > 5 || dy > 5) return; }
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
    el.classList.remove("ctx-flash"); void el.offsetWidth; el.classList.add("ctx-flash");
    setTimeout(() => el.classList.remove("ctx-flash"), 600);
  }, [chatOpen, addSnippet]);

  const handleContentMouseUp = useCallback((e) => {
    if (!chatOpen) return;
    if (e.target.closest(".chat-panel, .chat-toggle")) return;
    if (mouseDownPos.current) { const dx = Math.abs(e.clientX - mouseDownPos.current.x); const dy = Math.abs(e.clientY - mouseDownPos.current.y); if (dx <= 5 && dy <= 5) return; }
    setTimeout(() => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length > 2) {
        addSnippet(text, "selection");
        setTimeout(() => document.querySelector(".chat-input")?.focus(), 0);
        try { const range = sel.getRangeAt(0); const rect = range.getBoundingClientRect(); const flash = document.createElement("div"); flash.className = "ctx-sel-flash"; flash.textContent = "+ added"; flash.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top - 24}px;`; document.body.appendChild(flash); setTimeout(() => flash.remove(), 800); } catch (err) {}
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
          <h1>Quantum Mechanics II: Confinement, Tunneling, and Atoms</h1>
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
      <div style={{ textAlign: "center", padding: "16px 24px", marginTop: 24, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace" }}>&copy; 2026 Ihsan S. All rights reserved.</div>
    </div>
  );
}
