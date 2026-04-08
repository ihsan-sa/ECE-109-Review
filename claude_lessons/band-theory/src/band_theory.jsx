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
  "band-formation": `Topic: Band Formation. Covers the H2 molecular orbital model: bonding orbital psi_sigma = psi_1s(r_A) + psi_1s(r_B), antibonding orbital psi_sigma* = psi_1s(r_A) - psi_1s(r_B). Energy splitting: bonding energy E_sigma(a) is lower than isolated E_1s, antibonding E_sigma* is higher. Generalization from 2-atom to N-atom system: N atoms produce N closely spaced energy levels forming an energy band. Li example: N Li atoms, 1 electron per atom, N orbitals (2s), 2N states (with spin). The 2s level splits into N finely separated levels forming a band from E_B (bottom) to E_T (top). Overlapping bands in metals: 3s and 3p bands overlap. Band width increases as interatomic separation decreases.`,
  "band-diagrams": `Topic: Band Diagrams. Simplified energy band diagram shows E_c (bottom of conduction band), E_v (top of valence band), E_g = E_c - E_v (band gap energy). Classification: Semiconductor (Si, E_g = 1.1 eV) has small gap; Insulator (SiO2, E_g = 9 eV) has large gap; Metal/Conductor has overlapping bands (partially filled conduction band). The simplified band diagram shows extremal band edge energies independent of crystal momentum k. The full E-k band structure is covered in the effective-mass topic.`,
  "semiconductors": `Topic: Semiconductors. At T=0K, valence band is completely full, conduction band is completely empty. Excitation mechanisms: (1) Photoexcitation requires hf > E_g, photon excites electron from VB to CB creating electron-hole pair; (2) Thermal excitation at T>0K. Key principle: fully filled bands and completely empty bands do NOT contribute to current flow; only partially filled bands carry current. In semiconductors, current flows via electrons in the CB and holes in the VB. Photoemission from semiconductors requires hf > E_g + chi where chi is the electron affinity (energy from CB bottom to vacuum level). For metals, photoemission requires hf > Phi (work function). Table 4.1: Fermi energy and work function for metals (Ag: Phi=4.26 eV, E_FO=5.5 eV; Al: Phi=4.28, E_FO=11.7; Au: Phi=5.1, E_FO=5.5; Cs: Phi=2.14, E_FO=1.58; Cu: Phi=4.65, E_FO=7.0; Li: Phi=2.9, E_FO=4.7; Mg: Phi=3.66, E_FO=7.1; Na: Phi=2.75, E_FO=3.2).`,
  "effective-mass": `Topic: Effective Mass and E-k Diagrams. In vacuum: a = F_ext/m_e. In crystal: internal forces from lattice ions modify the electron's response, so a = F_ext/m_e* where m_e* is the effective mass. E-k relation: E_kinetic = p^2/(2m_e*) = hbar^2 k^2/(2m_e*). Effective mass from curvature: 1/m_e* = (1/hbar^2)(d^2E/dk^2). Narrower parabola = smaller m_e* = more responsive electron. In general, m* is a tensor: m*_ij = (1/hbar^2)(d^2E/dk_i dk_j). E-k diagrams: Si is indirect bandgap (CB minimum at X point in <100> direction, VB maximum at Gamma), GaAs is direct bandgap (both at Gamma). Brillouin zone: k ranges from L (<111>) through Gamma to X (<100>). Table 4.2 effective masses in metals (m_e*/m_e): Ag=1.0, Au=1.1, Bi=0.008, Cu=1.3, Fe=12, K=1.2, Li=2.2, Mg=1.3, Na=1.2, Zn=0.85.`,
  "density-of-states": `Topic: Density of States. g(E) defined so g(E)dE = number of states in energy interval E to E+dE per unit volume. Derivation: electron in cubic PE well of size L has E = h^2/(8m_e L^2)(n_1^2 + n_2^2 + n_3^2). Count states with n_1^2+n_2^2+n_3^2 <= n'^2: orbital states in 1/8 sphere = S_orb(n') = (1/6)pi*n'^3. With spin: S(n') = (1/3)pi*n'^3. Total states up to energy E': S(E') = pi*L^3*(8m_e*E')^(3/2)/(3h^3). Per unit volume: S_v(E') = pi*(8m_e*E')^(3/2)/(3h^3). Density of states: g(E) = dS_v/dE = (8pi*sqrt(2))*(m_e/h^2)^(3/2)*E^(1/2).`,
  "fermi-dirac": `Topic: Fermi-Dirac Statistics. Boltzmann classical: P(E) = A*exp(-E/(kT)), ratio N_2/N_1 = exp(-(E_2-E_1)/(kT)). Fermi-Dirac distribution: f(E) = 1/(1 + exp((E-E_F)/(kT))). At E=E_F, f=1/2 (50% occupancy defines Fermi level). At T=0K, f(E) is a step function: f=1 for E<E_F, f=0 for E>E_F. Boltzmann approximation valid when E >> E_F or E << E_F. Fermi energy at T=0: E_FO = (h^2/(8m_e))*(3n/pi)^(2/3) where n is electron concentration. Temperature dependence: E_F(T) = E_FO[1 - (pi^2/12)(kT/E_FO)^2]. Average energy per electron at T=0: E_av = (3/5)E_FO.`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo, Winter 2026. This unit on Band Theory and Electronic Properties spans Lectures 9-12 (Kasap Ch. 4.1-4.4), covering: band formation from molecular orbitals, energy band diagrams, semiconductors vs insulators vs metals, effective mass, density of states, and Fermi-Dirac statistics. The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

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
  ekParabola: { mEffective: 1.0, showComparison: true },
  bandDiagram: { showFermiLevel: true, showExcitation: false },
  fermiDirac: { temperatures: [0, 100, 200, 300, 400], EF_eV: 0 },
  densityOfStates: { T_K: 300, EF_eV: 7.0, showOccupied: true },
};

// ─── Graph Components ───

function EkParabola({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.ekParabola, ...params };
  const [mSlider, setMSlider] = useState(p.mEffective);
  const w = 460, h = 280, ox = 230, oy = 250;
  const kMax = 3.0;
  const eMax = 5.0;
  const scaleX = 180 / kMax;
  const scaleY = 210 / eMax;

  const buildPath = (mEff) => {
    let d = "";
    for (let k = -kMax; k <= kMax; k += 0.05) {
      const E = (k * k) / (2 * mEff);
      if (E > eMax) continue;
      const x = ox + k * scaleX;
      const y = oy - E * scaleY;
      d += d ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };

  const mEff = mSlider;
  const pathMain = buildPath(mEff);
  const pathComp = p.showComparison && mEff !== 0.5 ? buildPath(0.5) : null;
  const pathFree = p.showComparison && mEff !== 1.0 ? buildPath(1.0) : null;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">m* / m_e = {mEff.toFixed(2)}</span>
          <input type="range" min="0.05" max="3.0" step="0.05" value={mSlider} onChange={e => setMSlider(parseFloat(e.target.value))} className="graph-slider" />
        </label>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>E-k parabolic dispersion relation with effective mass comparison</title>
        <defs>
          <marker id={`ah-ek${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          E-k Parabolic Dispersion
        </text>
        <line x1={50} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-ek${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-ek${mid})`}/>
        <text x={w - 8} y={oy + 14} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">k</text>
        <text x={ox - 10} y={28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E</text>
        {p.showComparison && pathComp && (
          <path d={pathComp} fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7"/>
        )}
        {p.showComparison && pathFree && (
          <path d={pathFree} fill="none" stroke={G.txt} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.5"/>
        )}
        <path d={pathMain} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        <text x={ox + 90} y={oy - 170} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'">
          {`m* = ${mEff.toFixed(2)} m_e`}
        </text>
        {p.showComparison && mEff !== 0.5 && (
          <text x={ox + 90} y={oy - 185} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">
            m* = 0.5 m_e (narrow)
          </text>
        )}
        {p.showComparison && mEff !== 1.0 && (
          <text x={ox + 90} y={oy - 200} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">
            m* = 1.0 m_e (free)
          </text>
        )}
        <text x={ox + 5} y={oy - 80} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" transform={`rotate(-50, ${ox + 5}, ${oy - 80})`}>
          Narrower = smaller m*
        </text>
        {[-2, -1, 1, 2].map(k => (
          <g key={k}>
            <line x1={ox + k * scaleX} y1={oy} x2={ox + k * scaleX} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={ox + k * scaleX} y={oy + 14} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{k}</text>
          </g>
        ))}
        {[1, 2, 3, 4].map(e => (
          <g key={e}>
            <line x1={ox - 4} y1={oy - e * scaleY} x2={ox} y2={oy - e * scaleY} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={oy - e * scaleY + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{e}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const MATERIAL_PRESETS = [
  { label: "Si / SiO2 / Metal", materials: [{ name: "Si (1.1 eV)", eg: 1.1, metal: false }, { name: "SiO2 (9 eV)", eg: 9, metal: false }, { name: "Metal", eg: 0, metal: true }], cats: ["Semiconductor", "Insulator", "Conductor"] },
  { label: "Ge / GaAs / Cu", materials: [{ name: "Ge (0.66 eV)", eg: 0.66, metal: false }, { name: "GaAs (1.42 eV)", eg: 1.42, metal: false }, { name: "Cu", eg: 0, metal: true }], cats: ["Semiconductor", "Semiconductor", "Conductor"] },
  { label: "GaN / Diamond / Al", materials: [{ name: "GaN (3.4 eV)", eg: 3.4, metal: false }, { name: "Diamond (5.5 eV)", eg: 5.5, metal: false }, { name: "Al", eg: 0, metal: true }], cats: ["Wide-gap SC", "Insulator", "Conductor"] },
];

function BandDiagram({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.bandDiagram, ...params };
  const [presetIdx, setPresetIdx] = useState(0);
  const preset = MATERIAL_PRESETS[presetIdx];
  const w = 480, h = 300;

  const drawBand = (x, bw, label, egap, isMetal, idx) => {
    const cy = 150;
    const bandH = 50;
    const gapPx = egap > 0 ? Math.min(egap * 12, 100) : 0;
    const evTop = cy + (isMetal ? -10 : gapPx / 2);
    const ecBot = cy - (isMetal ? -10 : gapPx / 2);
    const elements = [];

    if (isMetal) {
      elements.push(
        <rect key={`cb-${idx}`} x={x} y={cy - bandH - 20} width={bw} height={bandH + 40} fill={G.gold} opacity="0.08" stroke={G.ax} strokeWidth="0.5"/>,
        <line key={`ec-${idx}`} x1={x} y1={cy - bandH - 20} x2={x + bw} y2={cy - bandH - 20} stroke={G.ax} strokeWidth="1"/>,
        <line key={`fill-${idx}`} x1={x} y1={cy} x2={x + bw} y2={cy} stroke={G.gold} strokeWidth="1" strokeDasharray="4,2"/>,
        <text key={`lab-${idx}`} x={x + bw/2} y={cy - bandH - 25} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">empty</text>,
        <text key={`labf-${idx}`} x={x + bw/2} y={cy + 12} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">filled</text>,
      );
      for (let i = 0; i < 8; i++) {
        const yy = cy + 2 + i * 3;
        if (yy < cy + 20) {
          elements.push(
            <line key={`hatch-${idx}-${i}`} x1={x + 4} y1={yy} x2={x + bw - 4} y2={yy} stroke={G.ax} strokeWidth="0.3" opacity="0.5"/>
          );
        }
      }
      if (p.showFermiLevel) {
        elements.push(
          <line key={`ef-${idx}`} x1={x - 5} y1={cy} x2={x + bw + 5} y2={cy} stroke={G.red} strokeWidth="1.5" strokeDasharray="4,2"/>,
          <text key={`eft-${idx}`} x={x + bw + 8} y={cy + 3} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'">E_F</text>
        );
      }
    } else {
      elements.push(
        <rect key={`vb-${idx}`} x={x} y={evTop} width={bw} height={bandH} fill={G.blue} opacity="0.12" stroke={G.ax} strokeWidth="0.5"/>,
        <rect key={`cb-${idx}`} x={x} y={ecBot - bandH} width={bw} height={bandH} fill={G.gold} opacity="0.06" stroke={G.ax} strokeWidth="0.5"/>,
      );
      for (let i = 0; i < 10; i++) {
        const yy = evTop + 5 + i * 4;
        if (yy < evTop + bandH - 2) {
          elements.push(
            <line key={`hatch-${idx}-${i}`} x1={x + 4} y1={yy} x2={x + bw - 4} y2={yy} stroke={G.blue} strokeWidth="0.3" opacity="0.5"/>
          );
        }
      }
      elements.push(
        <text key={`ev-${idx}`} x={x + bw + 4} y={evTop + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">E_v</text>,
        <text key={`ec-${idx}`} x={x + bw + 4} y={ecBot - bandH + 12} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'">E_c</text>,
      );
      if (gapPx > 20) {
        elements.push(
          <line key={`gap1-${idx}`} x1={x + bw/2} y1={evTop} x2={x + bw/2} y2={ecBot - bandH + bandH} stroke={G.red} strokeWidth="1" strokeDasharray="3,2"/>,
          <text key={`egt-${idx}`} x={x + bw/2 - 16} y={cy + 4} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" fontWeight="600">
            {`E_g=${egap} eV`}
          </text>
        );
      }
      if (p.showExcitation && egap <= 2) {
        const arrowY1 = evTop - 2;
        const arrowY2 = ecBot - bandH + bandH/2;
        elements.push(
          <line key={`exc-${idx}`} x1={x + bw * 0.3} y1={arrowY1} x2={x + bw * 0.3} y2={arrowY2} stroke={G.grn} strokeWidth="1.5" markerEnd={`url(#ah-bd${mid})`}/>,
          <text key={`exct-${idx}`} x={x + bw * 0.3 - 12} y={(arrowY1 + arrowY2)/2} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'" transform={`rotate(-90, ${x + bw * 0.3 - 12}, ${(arrowY1 + arrowY2)/2})`}>hf</text>,
          <circle key={`hole-${idx}`} cx={x + bw * 0.3} cy={arrowY1 + 3} r="3" fill="none" stroke={G.red} strokeWidth="1.5"/>,
          <circle key={`elec-${idx}`} cx={x + bw * 0.3} cy={arrowY2} r="3" fill={G.blue}/>
        );
      }
    }
    elements.push(
      <text key={`title-${idx}`} x={x + bw/2} y={h - 15} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">{label}</text>
    );
    return elements;
  };

  const bandPositions = [30, 180, 340];
  const catPositions = [80, 230, 390];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">Materials:</span>
          <select value={presetIdx} onChange={e => setPresetIdx(parseInt(e.target.value))} className="graph-select">
            {MATERIAL_PRESETS.map((pr, i) => <option key={i} value={i}>{pr.label}</option>)}
          </select>
        </label>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Band diagrams comparing semiconductor, insulator, and metal</title>
        <defs>
          <marker id={`ah-bd${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.grn} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Band Diagrams: {preset.label}
        </text>
        {preset.materials.map((mat, i) => drawBand(bandPositions[i], 100, mat.name, mat.eg, mat.metal, i))}
        {preset.cats.map((cat, i) => (
          <text key={`cat-${i}`} x={catPositions[i]} y={h - 2} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{cat}</text>
        ))}
      </svg>
    </div>
  );
}

function FermiDiracDistribution({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.fermiDirac, ...params };
  const [userTemp, setUserTemp] = useState(300);
  const w = 480, h = 280, ox = 100, oy = 250;
  const EF = p.EF_eV;
  const baseTemps = [0, 100, 300];
  const temps = baseTemps.includes(userTemp) ? baseTemps : [...baseTemps, userTemp].sort((a, b) => a - b);
  const kB = 8.617e-5;
  const eRange = 0.3;
  const scaleX = 320 / 1.0;
  const scaleY = 200 / (2 * eRange);
  const colors = [G.gold, G.blue, G.red, G.grn, G.txt];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">Highlight T = {userTemp} K</span>
          <input type="range" min="0" max="1000" step="10" value={userTemp} onChange={e => setUserTemp(parseInt(e.target.value))} className="graph-slider" />
        </label>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Fermi-Dirac distribution at multiple temperatures</title>
        <defs>
          <marker id={`ah-fd${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Fermi-Dirac Distribution f(E)
        </text>
        <line x1={ox} y1={oy} x2={ox + 340} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-fd${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={30} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-fd${mid})`}/>
        <text x={ox + 340} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">f(E)</text>
        <text x={ox - 8} y={36} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E</text>
        <line x1={ox} y1={oy - eRange * scaleY} x2={ox + 320} y2={oy - eRange * scaleY} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4"/>
        <text x={ox - 6} y={oy - eRange * scaleY + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">E_F</text>
        <line x1={ox + 0.5 * scaleX} y1={oy + 4} x2={ox + 0.5 * scaleX} y2={oy} stroke={G.ax} strokeWidth="1"/>
        <text x={ox + 0.5 * scaleX} y={oy + 14} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">0.5</text>
        <line x1={ox + 1.0 * scaleX} y1={oy + 4} x2={ox + 1.0 * scaleX} y2={oy} stroke={G.ax} strokeWidth="1"/>
        <text x={ox + 1.0 * scaleX} y={oy + 14} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">1.0</text>
        <circle cx={ox + 0.5 * scaleX} cy={oy - eRange * scaleY} r="3" fill={G.red}/>
        <text x={ox + 0.5 * scaleX + 6} y={oy - eRange * scaleY - 6} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'">f(E_F) = 0.5</text>

        {temps.map((T, i) => {
          let d = "";
          const col = colors[i % colors.length];
          if (T === 0) {
            const y0 = oy - (EF - eRange) * scaleY;
            const yEF = oy - eRange * scaleY;
            const yTop = oy - 2 * eRange * scaleY;
            d = `M${ox + 1.0 * scaleX},${(oy + 5).toFixed(1)} L${ox + 1.0 * scaleX},${yEF.toFixed(1)} L${ox},${yEF.toFixed(1)} L${ox},${(yTop - 10).toFixed(1)}`;
          } else {
            for (let E_rel = -eRange; E_rel <= eRange; E_rel += 0.002) {
              const E_abs = E_rel + EF;
              const f = 1.0 / (1.0 + Math.exp(E_rel / (kB * T)));
              const x = ox + f * scaleX;
              const y = oy - (E_rel + eRange) * scaleY;
              d += d ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
            }
          }
          const isHighlight = T === userTemp && T !== 0;
          return (
            <g key={T}>
              <path d={d} fill="none" stroke={col} strokeWidth={T === 0 ? "2.5" : isHighlight ? "2.8" : "1.5"} opacity={isHighlight || T === 0 ? 1 : 0.5}/>
              <text x={ox + 330} y={40 + i * 14} fill={col} fontSize="9" fontFamily="'IBM Plex Mono'" fontWeight={isHighlight ? "700" : "400"}>
                {T === 0 ? "T = 0 K" : `T = ${T} K`}{isHighlight ? " *" : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function DensityOfStates({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.densityOfStates, ...params };
  const [dosTemp, setDosTemp] = useState(p.T_K);
  const w = 480, h = 300, ox = 100, oy = 270;
  const EF = p.EF_eV;
  const T = dosTemp;
  const kB = 8.617e-5;
  const eMax = 12;
  const scaleX = 300;
  const scaleY = 220 / eMax;

  const gNorm = (E) => E > 0 ? Math.sqrt(E / eMax) : 0;

  let gPath = "";
  let occPath = "";
  const gMax = gNorm(eMax);

  for (let E = 0; E <= eMax; E += 0.05) {
    const gVal = gNorm(E);
    const x = ox + (gVal / gMax) * scaleX;
    const y = oy - E * scaleY;
    gPath += gPath ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${ox},${oy} L${x.toFixed(1)},${y.toFixed(1)}`;
  }

  if (p.showOccupied && T > 0) {
    let pts = [];
    for (let E = 0.01; E <= eMax; E += 0.05) {
      const gVal = gNorm(E);
      const f = 1.0 / (1.0 + Math.exp((E - EF) / (kB * T)));
      const gf = (gVal / gMax) * f;
      const x = ox + gf * scaleX;
      const y = oy - E * scaleY;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    occPath = `M${ox},${oy} L${pts.join(" L")} L${ox},${(oy - eMax * scaleY).toFixed(1)} Z`;
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">T = {T} K (kT = {(8.617e-5 * T).toFixed(4)} eV)</span>
          <input type="range" min="1" max="2000" step="10" value={dosTemp} onChange={e => setDosTemp(parseInt(e.target.value))} className="graph-slider" />
        </label>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Density of states with occupied electron distribution</title>
        <defs>
          <marker id={`ah-dos${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Density of States and Occupied States
        </text>
        <line x1={ox} y1={oy} x2={ox + scaleX + 30} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-dos${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={30} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-dos${mid})`}/>
        <text x={ox + scaleX + 30} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">g(E)</text>
        <text x={ox - 8} y={36} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E</text>

        {p.showOccupied && occPath && (
          <path d={occPath} fill={G.blue} opacity="0.15" stroke="none"/>
        )}
        {p.showOccupied && T > 0 && (() => {
          let dOcc = "";
          for (let E = 0.01; E <= eMax; E += 0.05) {
            const gVal = gNorm(E);
            const f = 1.0 / (1.0 + Math.exp((E - EF) / (kB * T)));
            const gf = (gVal / gMax) * f;
            const x = ox + gf * scaleX;
            const y = oy - E * scaleY;
            dOcc += dOcc ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${ox},${oy} L${x.toFixed(1)},${y.toFixed(1)}`;
          }
          return <path d={dOcc} fill="none" stroke={G.blue} strokeWidth="2"/>;
        })()}
        <path d={gPath} fill="none" stroke={G.gold} strokeWidth="2.5"/>

        <line x1={ox - 5} y1={oy - EF * scaleY} x2={ox + scaleX} y2={oy - EF * scaleY} stroke={G.red} strokeWidth="1" strokeDasharray="6,3"/>
        <text x={ox + scaleX + 4} y={oy - EF * scaleY + 3} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">E_F = {EF} eV</text>

        <text x={ox + 200} y={oy - 180} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">g(E) ~ E^(1/2)</text>
        {p.showOccupied && <text x={ox + 80} y={oy - 80} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">g(E)f(E)</text>}
        <text x={ox + 200} y={oy - 165} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">{`T = ${T} K`}</text>

        {[2, 4, 6, 8, 10].map(e => (
          <g key={e}>
            <line x1={ox - 4} y1={oy - e * scaleY} x2={ox} y2={oy - e * scaleY} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={oy - e * scaleY + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{e}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Animation Components ───

function BandFormationAnimation({ mid = "" }) {
  const [separation, setSeparation] = useState(5.0);
  const animFrameRef = useRef(null);
  const [animating, setAnimating] = useState(false);
  const sepRef = useRef(separation);
  const w = 500, h = 300;

  useEffect(() => { sepRef.current = separation; }, [separation]);

  useEffect(() => {
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const startAnim = () => {
    if (animating) {
      cancelAnimationFrame(animFrameRef.current);
      setAnimating(false);
      return;
    }
    setAnimating(true);
    setSeparation(5.0);
    sepRef.current = 5.0;
    const t0 = performance.now();
    const duration = 4000;
    const step = (now) => {
      const frac = Math.min((now - t0) / duration, 1);
      const val = 5.0 - frac * 4.0;
      setSeparation(parseFloat(val.toFixed(2)));
      sepRef.current = val;
      if (frac < 1) { animFrameRef.current = requestAnimationFrame(step); }
      else { setAnimating(false); }
    };
    animFrameRef.current = requestAnimationFrame(step);
  };

  const N = 8;
  const R = separation;
  const spread = Math.max(0, (5.0 - R) / 4.0);

  const sBaseY = 180;
  const pBaseY = 100;
  const maxSpreadS = 55;
  const maxSpreadP = 55;

  const sLevels = [];
  const pLevels = [];
  for (let i = 0; i < N; i++) {
    const t = (i / (N - 1)) - 0.5;
    sLevels.push(sBaseY + t * spread * maxSpreadS * 2);
    pLevels.push(pBaseY + t * spread * maxSpreadP * 2);
  }

  const overlap = spread > 0.85;
  const sBandTop = Math.min(...sLevels);
  const sBandBot = Math.max(...sLevels);
  const pBandTop = Math.min(...pLevels);
  const pBandBot = Math.max(...pLevels);

  const xLeft = 60;
  const xRight = 420;
  const lineLen = 100;
  const bandX = 280;
  const bandW = 140;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">R / a = {R.toFixed(2)} (interatomic separation)</span>
          <input type="range" min="1.0" max="5.0" step="0.05" value={separation}
            onChange={e => { setSeparation(parseFloat(e.target.value)); if (animating) { cancelAnimationFrame(animFrameRef.current); setAnimating(false); } }}
            className="graph-slider" />
        </label>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); startAnim(); }}
          style={{ marginLeft: 12 }}>
          {animating ? "Stop" : "Animate"}
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Band formation from discrete atomic levels to continuous bands</title>
        <text x={w / 2} y="16" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Band Formation: Discrete Levels to Continuous Bands
        </text>

        <text x={xLeft + lineLen / 2} y="34" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Separated Atoms</text>
        <text x={bandX + bandW / 2} y="34" fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Crystal (R/a = {R.toFixed(1)})</text>

        {/* Left side: degenerate levels */}
        {Array.from({ length: N }).map((_, i) => (
          <line key={`s-deg-${i}`} x1={xLeft} y1={sBaseY} x2={xLeft + lineLen} y2={sBaseY}
            stroke={G.gold} strokeWidth="1.5" opacity={0.3 + 0.7 / N} />
        ))}
        <text x={xLeft - 8} y={sBaseY + 4} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">s</text>

        {Array.from({ length: N }).map((_, i) => (
          <line key={`p-deg-${i}`} x1={xLeft} y1={pBaseY} x2={xLeft + lineLen} y2={pBaseY}
            stroke={G.blue} strokeWidth="1.5" opacity={0.3 + 0.7 / N} />
        ))}
        <text x={xLeft - 8} y={pBaseY + 4} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">p</text>

        {/* Right side: split levels or band */}
        {spread < 0.7 ? (
          <>
            {sLevels.map((y, i) => (
              <line key={`s-split-${i}`} x1={bandX} y1={y} x2={bandX + bandW} y2={y}
                stroke={G.gold} strokeWidth="1.2" />
            ))}
            {pLevels.map((y, i) => (
              <line key={`p-split-${i}`} x1={bandX} y1={y} x2={bandX + bandW} y2={y}
                stroke={G.blue} strokeWidth="1.2" />
            ))}
          </>
        ) : (
          <>
            <rect x={bandX} y={sBandTop} width={bandW} height={sBandBot - sBandTop}
              fill={G.gold} opacity="0.18" stroke={G.gold} strokeWidth="1" />
            <rect x={bandX} y={pBandTop} width={bandW} height={pBandBot - pBandTop}
              fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray={overlap ? "none" : "4,2"} />
            {overlap && (
              <rect x={bandX} y={pBandBot} width={bandW} height={Math.max(0, sBandTop - pBandBot)}
                fill={G.grn} opacity="0.10" stroke="none" />
            )}
          </>
        )}

        {/* Labels for bands */}
        {spread >= 0.7 && (
          <>
            <text x={bandX + bandW + 8} y={(sBandTop + sBandBot) / 2 + 3} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">
              Valence (s)
            </text>
            <text x={bandX + bandW + 8} y={(pBandTop + pBandBot) / 2 + 3} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">
              Conduction (p)
            </text>
            {overlap && (
              <text x={bandX + bandW / 2} y={pBandBot + (sBandTop - pBandBot) / 2 + 3} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">
                overlap
              </text>
            )}
          </>
        )}

        {/* Energy axis */}
        <line x1={30} y1={h - 20} x2={30} y2={25} stroke={G.ax} strokeWidth="1" />
        <text x={22} y={28} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">E</text>
        <polygon points="30,25 27,33 33,33" fill={G.ax} />

        {/* Connecting arrows */}
        <line x1={xLeft + lineLen + 10} y1={sBaseY} x2={bandX - 10} y2={(sBandTop + sBandBot) / 2}
          stroke={G.ax} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.5" />
        <line x1={xLeft + lineLen + 10} y1={pBaseY} x2={bandX - 10} y2={(pBandTop + pBandBot) / 2}
          stroke={G.ax} strokeWidth="0.8" strokeDasharray="3,3" opacity="0.5" />

        <text x={w / 2} y={h - 6} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Decreasing R: levels split, bands form, s and p bands can overlap
        </text>
      </svg>
    </div>
  );
}

function SiBandFormation({ mid = "" }) {
  const w = 720, h = 430;
  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Silicon band formation: atomic levels to crystal bands, gap reduces from ~7 eV to 1.1 eV</title>

        {/* Energy axis */}
        <line x1="30" y1="395" x2="30" y2="55" stroke={G.ax} strokeWidth="1.5" />
        <polygon points="30,50 26,60 34,60" fill={G.ax} />
        <text x="17" y="48" fill={G.txt} fontSize="12" fontFamily="'IBM Plex Sans',sans-serif">E</text>

        {/* Column headers */}
        <text x="145" y="30" fill={G.txt} fontSize="13" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">1 Si Atom</text>
        <text x="365" y="30" fill={G.txt} fontSize="13" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">N Atoms (small N)</text>
        <text x="590" y="30" fill={G.txt} fontSize="13" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">Si Crystal</text>

        {/* Dividers */}
        <line x1="248" y1="42" x2="248" y2="395" stroke={G.ax} strokeWidth="0.5" strokeDasharray="4" />
        <line x1="482" y1="42" x2="482" y2="395" stroke={G.ax} strokeWidth="0.5" strokeDasharray="4" />

        {/* Column 1: 1 Atom */}
        <line x1="88" y1="120" x2="198" y2="120" stroke={G.blue} strokeWidth="2.5" />
        <text x="205" y="117" fill={G.blue} fontSize="11" fontFamily="'IBM Plex Sans',sans-serif">3p</text>
        <text x="205" y="131" fill={G.ax} fontSize="9" fontFamily="'IBM Plex Sans',sans-serif">{"6 states, 2e\u207B"}</text>
        <circle cx="123" cy="115" r="3" fill={G.red} />
        <circle cx="135" cy="115" r="3" fill={G.red} />

        <line x1="88" y1="295" x2="198" y2="295" stroke={G.blue} strokeWidth="2.5" />
        <text x="205" y="292" fill={G.blue} fontSize="11" fontFamily="'IBM Plex Sans',sans-serif">3s</text>
        <text x="205" y="306" fill={G.ax} fontSize="9" fontFamily="'IBM Plex Sans',sans-serif">{"2 states, 2e\u207B"}</text>
        <circle cx="123" cy="290" r="3" fill={G.red} />
        <circle cx="135" cy="290" r="3" fill={G.red} />

        {/* Gap bracket ~7 eV */}
        <line x1="70" y1="125" x2="70" y2="290" stroke={G.gold} strokeWidth="1.5" />
        <line x1="65" y1="125" x2="75" y2="125" stroke={G.gold} strokeWidth="1.5" />
        <line x1="65" y1="290" x2="75" y2="290" stroke={G.gold} strokeWidth="1.5" />
        <text x="62" y="212" fill={G.gold} fontSize="12" textAnchor="end" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">~7 eV</text>

        {/* Column 2: Small N */}
        <rect x="306" y="100" width="118" height="42" fill={G.blue} opacity="0.08" rx="3" />
        {[102, 111, 120, 129, 138].map(y => (
          <line key={`3p-${y}`} x1="310" y1={y} x2="420" y2={y} stroke={G.blue} strokeWidth="1.2" />
        ))}
        <text x="428" y="118" fill={G.blue} fontSize="10" fontFamily="'IBM Plex Sans',sans-serif">from 3p</text>
        <text x="428" y="131" fill={G.ax} fontSize="9" fontFamily="'IBM Plex Sans',sans-serif">N levels</text>

        <rect x="306" y="275" width="118" height="42" fill={G.blue} opacity="0.08" rx="3" />
        {[277, 286, 295, 304, 313].map(y => (
          <line key={`3s-${y}`} x1="310" y1={y} x2="420" y2={y} stroke={G.blue} strokeWidth="1.2" />
        ))}
        <text x="428" y="293" fill={G.blue} fontSize="10" fontFamily="'IBM Plex Sans',sans-serif">from 3s</text>
        <text x="428" y="306" fill={G.ax} fontSize="9" fontFamily="'IBM Plex Sans',sans-serif">N levels</text>

        {/* Gap bracket: narrows */}
        <line x1="290" y1="143" x2="290" y2="272" stroke={G.gold} strokeWidth="1.5" />
        <line x1="285" y1="143" x2="295" y2="143" stroke={G.gold} strokeWidth="1.5" />
        <line x1="285" y1="272" x2="295" y2="272" stroke={G.gold} strokeWidth="1.5" />
        <text x="282" y="205" fill={G.gold} fontSize="11" textAnchor="end" fontFamily="'IBM Plex Sans',sans-serif">gap</text>
        <text x="282" y="218" fill={G.gold} fontSize="11" textAnchor="end" fontFamily="'IBM Plex Sans',sans-serif">narrows</text>

        {/* Column 3: Crystal */}
        <rect x="520" y="85" width="130" height="90" fill={G.blue} opacity="0.12" rx="4" stroke={G.blue} strokeWidth="1.5" />
        <text x="585" y="125" fill={G.blue} fontSize="12" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">CB</text>
        <text x="585" y="140" fill={G.ax} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Sans',sans-serif">4N states (empty)</text>

        <rect x="520" y="202" width="130" height="168" fill={G.blue} opacity="0.25" rx="4" stroke={G.blue} strokeWidth="1.5" />
        <text x="585" y="280" fill={G.blue} fontSize="12" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">VB</text>
        <text x="585" y="295" fill={G.ax} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Sans',sans-serif">4N states (full)</text>

        {/* Ec, Ev */}
        <line x1="520" y1="175" x2="660" y2="175" stroke={G.grn} strokeWidth="1" strokeDasharray="4,3" />
        <text x="667" y="179" fill={G.grn} fontSize="10" fontFamily="'IBM Plex Mono',monospace">Ec</text>
        <line x1="520" y1="202" x2="660" y2="202" stroke={G.grn} strokeWidth="1" strokeDasharray="4,3" />
        <text x="667" y="206" fill={G.grn} fontSize="10" fontFamily="'IBM Plex Mono',monospace">Ev</text>

        {/* Band gap bracket: 1.1 eV */}
        <line x1="505" y1="178" x2="505" y2="199" stroke={G.gold} strokeWidth="2" />
        <line x1="500" y1="178" x2="510" y2="178" stroke={G.gold} strokeWidth="2" />
        <line x1="500" y1="199" x2="510" y2="199" stroke={G.gold} strokeWidth="2" />
        <text x="497" y="193" fill={G.gold} fontSize="12" textAnchor="end" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">1.1 eV</text>

        {/* Connecting dashed lines */}
        <line x1="198" y1="120" x2="306" y2="120" stroke={G.blue} strokeWidth="0.7" strokeDasharray="3" opacity="0.35" />
        <line x1="198" y1="295" x2="306" y2="295" stroke={G.blue} strokeWidth="0.7" strokeDasharray="3" opacity="0.35" />
        <line x1="424" y1="105" x2="520" y2="110" stroke={G.blue} strokeWidth="0.7" strokeDasharray="3" opacity="0.35" />
        <line x1="424" y1="135" x2="520" y2="220" stroke={G.red} strokeWidth="0.8" strokeDasharray="3" opacity="0.45" />
        <line x1="424" y1="280" x2="520" y2="270" stroke={G.blue} strokeWidth="0.7" strokeDasharray="3" opacity="0.35" />
        <line x1="424" y1="310" x2="520" y2="360" stroke={G.blue} strokeWidth="0.7" strokeDasharray="3" opacity="0.35" />

        {/* Annotations */}
        <text x="590" y="393" fill={G.txt} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Sans',sans-serif">{"3s + 3p bands overlap and rehybridize (sp\u00B3)"}</text>
        <text x="365" y="422" fill={G.gold} fontSize="11" textAnchor="middle" fontWeight="bold" fontFamily="'IBM Plex Sans',sans-serif">{"Gap: ~7 eV (atom)  \u2192  1.1 eV (crystal)"}</text>
      </svg>
    </div>
  );
}

function ElectronPopulationAnimation({ mid = "" }) {
  const [temperature, setTemperature] = useState(0);
  const [playing, setPlaying] = useState(false);
  const animFrameRef = useRef(null);
  const tempRef = useRef(temperature);
  const w = 540, h = 350;

  const EF = 5.0;
  const kB = 8.617e-5;
  const eMax = 10.0;
  const maxT = 8000;

  useEffect(() => { tempRef.current = temperature; }, [temperature]);
  useEffect(() => {
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, []);

  const togglePlay = () => {
    if (playing) {
      cancelAnimationFrame(animFrameRef.current);
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const t0 = performance.now();
    const startT = tempRef.current;
    const targetT = startT < maxT / 2 ? maxT : 0;
    const duration = 4000;
    const step = (now) => {
      const frac = Math.min((now - t0) / duration, 1);
      const val = startT + (targetT - startT) * frac;
      setTemperature(Math.round(val));
      tempRef.current = val;
      if (frac < 1) animFrameRef.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    animFrameRef.current = requestAnimationFrame(step);
  };

  const T = temperature;
  const fermi = (E) => T === 0
    ? (E < EF ? 1 : E === EF ? 0.5 : 0)
    : 1 / (1 + Math.exp((E - EF) / (kB * Math.max(T, 1))));
  const gE = (E) => E > 0 ? Math.sqrt(E / eMax) : 0;

  // Three-panel layout: g(E) x f(E) = n(E)
  const topY = 48, botY = h - 48;
  const eToY = (E) => botY - (E / eMax) * (botY - topY);
  const pW = 100;
  const p1 = 42, p2 = 195, p3 = 365;

  // Build curve paths
  const dE = 0.06;
  let gLine = `M${p1},${botY}`;
  let gfFill = `M${p1},${botY}`;
  let fLine = `M${p2},${eToY(0)}`;
  let nLine = `M${p3},${botY}`;
  let nFill = `M${p3},${botY}`;

  for (let E = 0; E <= eMax; E += dE) {
    const g = gE(E);
    const f = fermi(E);
    const y = eToY(E);
    gLine += ` L${(p1 + g * pW).toFixed(1)},${y.toFixed(1)}`;
    gfFill += ` L${(p1 + g * f * pW).toFixed(1)},${y.toFixed(1)}`;
    fLine += ` L${(p2 + f * pW).toFixed(1)},${y.toFixed(1)}`;
    const n = g * f;
    nLine += ` L${(p3 + n * pW).toFixed(1)},${y.toFixed(1)}`;
    nFill += ` L${(p3 + n * pW).toFixed(1)},${y.toFixed(1)}`;
  }
  gfFill += ` L${p1},${topY} Z`;
  nFill += ` L${p3},${topY} Z`;

  // f(E) filled area
  let fFill = fLine + ` L${p2},${eToY(eMax)} L${p2},${eToY(0)} Z`;

  const efY = eToY(EF);
  const font = "'IBM Plex Mono'";

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div className="graph-controls" onClick={e => e.stopPropagation()}>
        <label>
          <span className="graph-ctrl-label">T = {T} K (kT = {(kB * T).toFixed(4)} eV)</span>
          <input type="range" min="0" max={maxT} step="50" value={temperature}
            onChange={e => { setTemperature(parseInt(e.target.value)); if (playing) { cancelAnimationFrame(animFrameRef.current); setPlaying(false); } }}
            className="graph-slider" />
        </label>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); togglePlay(); }}
          style={{ marginLeft: 12 }}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Electron population distribution across bands versus temperature</title>

        {/* Panel labels */}
        <text x={p1 + pW / 2} y={botY + 18} fill={G.gold} fontSize="10" fontFamily={font} textAnchor="middle" fontWeight="600">g(E)</text>
        <text x={p2 + pW / 2} y={botY + 18} fill={G.blue} fontSize="10" fontFamily={font} textAnchor="middle" fontWeight="600">f(E)</text>
        <text x={p3 + pW / 2} y={botY + 18} fill={G.grn} fontSize="10" fontFamily={font} textAnchor="middle" fontWeight="600">n(E) = g*f</text>

        {/* Operator symbols between panels */}
        <text x={(p1 + pW + p2) / 2} y={(topY + botY) / 2 + 4} fill={G.txt} fontSize="16" fontFamily={font} textAnchor="middle" opacity="0.6">&times;</text>
        <text x={(p2 + pW + p3) / 2} y={(topY + botY) / 2 + 4} fill={G.txt} fontSize="16" fontFamily={font} textAnchor="middle" opacity="0.6">=</text>

        {/* Shared energy axis labels */}
        <text x={p1 - 6} y={topY - 6} fill={G.txt} fontSize="10" fontFamily={font} textAnchor="end">E (eV)</text>
        {[0, 2, 4, 6, 8, 10].map(e => (
          <g key={`etick-${e}`}>
            <line x1={p1 - 4} y1={eToY(e)} x2={p1} y2={eToY(e)} stroke={G.ax} strokeWidth="1" />
            <text x={p1 - 7} y={eToY(e) + 3} fill={G.txt} fontSize="8" fontFamily={font} textAnchor="end">{e}</text>
          </g>
        ))}

        {/* E_F dashed line across all panels */}
        <line x1={p1 - 4} y1={efY} x2={p3 + pW + 4} y2={efY} stroke={G.red} strokeWidth="1" strokeDasharray="5,3" opacity="0.7" />
        <text x={p3 + pW + 8} y={efY + 3} fill={G.red} fontSize="9" fontFamily={font}>E_F</text>

        {/* Panel 1: g(E) -- density of states */}
        <line x1={p1} y1={botY} x2={p1} y2={topY} stroke={G.ax} strokeWidth="1" />
        <line x1={p1} y1={botY} x2={p1 + pW} y2={botY} stroke={G.ax} strokeWidth="0.5" opacity="0.3" />
        <path d={gfFill} fill={G.gold} opacity="0.18" stroke="none" />
        <path d={gLine} fill="none" stroke={G.gold} strokeWidth="2" />

        {/* Panel 2: f(E) -- Fermi-Dirac distribution */}
        <line x1={p2} y1={botY} x2={p2} y2={topY} stroke={G.ax} strokeWidth="1" />
        <line x1={p2} y1={botY} x2={p2 + pW} y2={botY} stroke={G.ax} strokeWidth="0.5" opacity="0.3" />
        {/* f=0 and f=1 reference lines */}
        <line x1={p2 + pW} y1={botY} x2={p2 + pW} y2={topY} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,4" opacity="0.3" />
        <text x={p2 - 3} y={botY + 3} fill={G.txt} fontSize="7" fontFamily={font} textAnchor="end">0</text>
        <text x={p2 + pW + 3} y={botY + 3} fill={G.txt} fontSize="7" fontFamily={font}>1</text>
        <path d={fFill} fill={G.blue} opacity="0.12" stroke="none" />
        <path d={fLine} fill="none" stroke={G.blue} strokeWidth="2.5" />
        {/* f=1/2 marker at EF */}
        <circle cx={p2 + 0.5 * pW} cy={efY} r="3.5" fill={G.red} />

        {/* Panel 3: n(E) = g(E)*f(E) -- occupied states */}
        <line x1={p3} y1={botY} x2={p3} y2={topY} stroke={G.ax} strokeWidth="1" />
        <line x1={p3} y1={botY} x2={p3 + pW} y2={botY} stroke={G.ax} strokeWidth="0.5" opacity="0.3" />
        <path d={nFill} fill={G.grn} opacity="0.2" stroke="none" />
        <path d={nLine} fill="none" stroke={G.grn} strokeWidth="2.5" />
      </svg>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "band-formation",
    tab: "Band Formation",
    title: "1. Band Formation",
    subtitle: "From molecular orbitals to energy bands in solids",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Hydrogen Molecule: Bonding and Antibonding Orbitals">
          <P>When two hydrogen atoms approach each other, their 1s atomic orbitals overlap and form two <b>molecular orbitals</b>:</P>
          <KeyConcept label="Bonding Orbital">
            The symmetric combination of atomic wavefunctions. The electron probability density is concentrated between the two nuclei, lowering the total energy.
          </KeyConcept>
          <Eq>{"\\psi_\\sigma = \\psi_{1s}(r_A) + \\psi_{1s}(r_B)"}</Eq>
          <KeyConcept label="Antibonding Orbital">
            The antisymmetric combination. A node exists between the nuclei, raising the total energy above the isolated atom level.
          </KeyConcept>
          <Eq>{"\\psi_{\\sigma^*} = \\psi_{1s}(r_A) - \\psi_{1s}(r_B)"}</Eq>
          <P>The bonding orbital energy <M>{"E_\\sigma(a)"}</M> is lower than the isolated <M>{"E_{1s}"}</M>, while the antibonding energy <M>{"E_{\\sigma^*}(a)"}</M> is higher. The energy difference <M>{"\\Delta E"}</M> is the <b>bonding energy</b>. Each orbital can hold up to 2 electrons (one spin-up, one spin-down) by the Pauli Exclusion Principle.</P>
        </Section>

        <Section title="From 3 Atoms to N Atoms">
          <P>For 3 hydrogen atoms, we get 3 molecular orbitals at 3 distinct energy levels (<M>{"E_a, E_b, E_c"}</M>). The system has 3 electrons, 3 orbitals (1s), and 6 states (with spin).</P>
          <P>Generalizing to <M>{"N"}</M> atoms: each atomic energy level splits into <M>{"N"}</M> closely-spaced molecular energy levels. For <M>{"N \\sim 10^{23}"}</M> (Avogadro's number), these levels are so close together they form a continuous <b>energy band</b>.</P>
          <KeyConcept label="Energy Band">
            A quasi-continuous range of allowed electron energies formed when N atomic orbitals interact. The band extends from a bottom energy E_B to a top energy E_T. Each atomic orbital contributes N states to the band, accommodating 2N electrons (with spin).
          </KeyConcept>
          <P>Example: <M>{"N"}</M> Li atoms. Li has electron configuration 1s2 2s1. The system has <M>{"N"}</M> electrons in the 2s orbital, producing <M>{"N"}</M> orbitals and <M>{"2N"}</M> states. Since only <M>{"N"}</M> electrons occupy these <M>{"2N"}</M> states, the 2s band is only <b>half-filled</b>.</P>
        </Section>

        <Section title="Overlapping Bands in Metals">
          <P>In metals like Na (3s1), the 3s and 3p energy bands can <b>overlap</b> at the equilibrium interatomic separation. This means there is no gap between them; electrons can move freely between these bands.</P>
          <P>Key points about band overlap:</P>
          <ul className="info-list">
            <li>Band width increases as interatomic separation decreases (stronger orbital overlap)</li>
            <li>Inner shells (1s, 2s) form narrow bands; outer shells (3s, 3p) form wider bands</li>
            <li>When bands overlap, the combined band can accommodate more electrons in a partially-filled configuration</li>
            <li>Partially filled bands are the hallmark of metals and enable electrical conduction</li>
          </ul>
          <BandFormationAnimation mid="-t1" />
        </Section>

        <Section title="Silicon: Atomic Levels to Crystal Bands">
          <P>Silicon has 4 valence electrons in 3s and 3p orbitals (~7 eV apart). As atoms come together, each level splits into <M>{"N"}</M> sub-levels. The bands broaden until 3s and 3p overlap, then sp³ rehybridization sorts all <M>{"8N"}</M> states into <M>{"4N"}</M> bonding (VB) and <M>{"4N"}</M> antibonding (CB). The gap ratios below are drawn to scale.</P>
          <SiBandFormation mid="-t1b" />
          <P>The red dashed line shows where part of the 3p-derived band crosses into the VB due to hybridization. This is why "3s band" and "3p band" lose meaning in the crystal; we instead speak of valence and conduction bands.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "band-diagrams",
    tab: "Band Diagrams",
    title: "2. Band Diagrams",
    subtitle: "Energy band diagrams and material classification",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Simplified Energy Band Diagram">
          <P>The <b>simplified energy band diagram</b> shows the bottom edge of the conduction band (<M>{"E_c"}</M>) and the top edge of the valence band (<M>{"E_v"}</M>). These represent the extremal band edge energies, independent of crystal momentum <M>{"k"}</M>. The full <M>{"E"}</M>-<M>{"k"}</M> dependence is explored in the Effective Mass section.</P>
          <KeyConcept label="Conduction Band (CB)">
            The lowest energy band that is either empty or partially occupied at T = 0 K. Electrons in this band are free to move and contribute to electrical current.
          </KeyConcept>
          <KeyConcept label="Valence Band (VB)">
            The highest energy band that is completely filled with electrons at T = 0 K. When full, electrons cannot contribute to current because there are no empty states to move into.
          </KeyConcept>
          <KeyConcept label="Band Gap Energy">
            The energy separation between the top of the valence band and the bottom of the conduction band.
          </KeyConcept>
          <Eq>{"E_g = E_c - E_v"}</Eq>
          <BandDiagram params={gp.bandDiagram} mid="-t2" />
        </Section>

        <Section title="Material Classification by Band Structure">
          <P>Materials are classified by their band gap and band filling:</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Semiconductor</h4>
              <P>Small band gap (Si: <M>{"E_g = 1.1"}</M> eV, Ge: 0.66 eV). At T = 0 K, VB is full and CB is empty. At room temperature, thermal energy can excite electrons across the gap. Can be doped.</P>
            </div>
            <div className="compare-card">
              <h4>Insulator</h4>
              <P>Large band gap (SiO2: <M>{"E_g = 9"}</M> eV, diamond: 5.5 eV). Thermal energy at room temperature is insufficient to excite electrons across the gap. Very low conductivity.</P>
            </div>
            <div className="compare-card">
              <h4>Metal (Conductor)</h4>
              <P>Overlapping bands or partially filled conduction band. Electrons near the Fermi level have empty states available immediately above them, enabling current flow with any applied field.</P>
            </div>
          </div>
          <P><b>Key principle:</b> Fully filled bands and completely empty bands do NOT contribute to conduction. Only <b>partially filled</b> bands carry current.</P>
        </Section>

        <Section title="E-k Diagrams">
          <P>The full E-k diagram plots electron energy versus crystal momentum <M>{"k"}</M> along different crystallographic directions in the Brillouin zone. The horizontal axis spans from L (along <M>{"\\langle 111 \\rangle"}</M>) through <M>{"\\Gamma"}</M> (k = 0) to X (along <M>{"\\langle 100 \\rangle"}</M>).</P>
          <KeyConcept label="Direct Bandgap (GaAs)">
            The conduction band minimum and valence band maximum occur at the same k-value (both at the Gamma point). An electron can transition between bands by absorbing/emitting a photon without changing momentum. Essential for LEDs and lasers.
          </KeyConcept>
          <KeyConcept label="Indirect Bandgap (Si)">
            The conduction band minimum is at a different k-value than the valence band maximum. Si has its CB minimum near the X point along the <M>{"\\langle 100 \\rangle"}</M> direction, while the VB maximum is at Gamma. Transitions require a phonon (lattice vibration) to conserve momentum.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "semiconductors",
    tab: "Semiconductors",
    title: "3. Semiconductors",
    subtitle: "Electron-hole pairs, excitation mechanisms, and current flow",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Electron-Hole Pairs">
          <P>In a semiconductor at <M>{"T = 0"}</M> K, the valence band is completely filled and the conduction band is completely empty. No current can flow because there are no empty states for electrons to move into.</P>
          <P>When energy is supplied (via photons or thermal vibrations), an electron can be excited from the VB to the CB. This creates:</P>
          <ul className="info-list">
            <li>An <b>electron</b> (<M>{"e^-"}</M>) in the conduction band: a mobile negative charge carrier</li>
            <li>A <b>hole</b> (<M>{"h^+"}</M>) in the valence band: an empty state that behaves as a mobile positive charge carrier</li>
          </ul>
          <P>The electron and hole are always created in pairs. The hole represents the absence of an electron in an otherwise full band.</P>
        </Section>

        <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
          <img src={IMG + "silicon-wafer-iridescence.jpg"} alt="Multicrystalline silicon wafer showing iridescent colors from thin-film interference, with visible crystal grain boundaries" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
          <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Multicrystalline silicon wafer with anti-reflection coating. Visible grain boundaries show where different crystal orientations meet. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 4.0</span></figcaption>
        </figure>

        <Section title="Excitation Mechanisms">
          <KeyConcept label="Photoexcitation">
            A photon with energy greater than the band gap can excite an electron from VB to CB.
          </KeyConcept>
          <Eq>{"hf \\gt E_g"}</Eq>
          <P>The photon energy must exceed <M>{"E_g"}</M> for excitation to occur. For Si (<M>{"E_g = 1.1"}</M> eV), this corresponds to wavelengths shorter than about 1130 nm (near-infrared).</P>
          <KeyConcept label="Thermal Excitation">
            At temperatures above 0 K, lattice vibrations (phonons) provide energy to excite electrons across the band gap. The probability of thermal excitation increases exponentially with temperature.
          </KeyConcept>
        </Section>

        <Section title="Current Flow in Semiconductors">
          <P>Current in a semiconductor has two components:</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Electron Current (CB)</h4>
              <P>Electrons in the partially-filled conduction band are free to accelerate under an applied electric field. They move opposite to the field direction (conventional current flows with the field).</P>
            </div>
            <div className="compare-card">
              <h4>Hole Current (VB)</h4>
              <P>When an electron in the VB moves to fill a hole, the hole effectively moves in the opposite direction. Holes behave as positive charges moving with the electric field.</P>
            </div>
          </div>
        </Section>

        <Section title="Photoemission">
          <P>For photoemission (ejecting electrons completely out of the material into vacuum):</P>
          <KeyConcept label="Metals: Work Function">
            Photoemission from a metal requires photon energy exceeding the work function.
          </KeyConcept>
          <Eq>{"hf \\gt \\Phi \\quad \\text{(metals)}"}</Eq>
          <Eq>{"KE = hf - \\Phi"}</Eq>
          <KeyConcept label="Semiconductors: Electron Affinity">
            The electron affinity chi is the energy needed to remove an electron from the bottom of the conduction band to the vacuum level. Photoemission requires the photon to excite the electron across the band gap AND overcome the electron affinity.
          </KeyConcept>
          <Eq>{"hf \\gt E_g + \\chi \\quad \\text{(semiconductors)}"}</Eq>
          <P>Table of Fermi energies and work functions for selected metals:</P>
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Metal</th><th>Ag</th><th>Al</th><th>Au</th><th>Cs</th><th>Cu</th><th>Li</th><th>Mg</th><th>Na</th></tr>
              </thead>
              <tbody>
                <tr><td><M>{"\\Phi"}</M> (eV)</td><td>4.26</td><td>4.28</td><td>5.1</td><td>2.14</td><td>4.65</td><td>2.9</td><td>3.66</td><td>2.75</td></tr>
                <tr><td><M>{"E_{FO}"}</M> (eV)</td><td>5.5</td><td>11.7</td><td>5.5</td><td>1.58</td><td>7.0</td><td>4.7</td><td>7.1</td><td>3.2</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    ),
  },
  {
    id: "effective-mass",
    tab: "Effective Mass",
    title: "4. Effective Mass",
    subtitle: "E-k curvature, effective mass tensor, and electron dynamics in crystals",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Concept of Effective Mass">
          <P>In vacuum, an electron subjected to an external force <M>{"F_{\\text{ext}}"}</M> accelerates as:</P>
          <Eq>{"a = \\frac{F_{\\text{ext}}}{m_e}"}</Eq>
          <P>Inside a crystal, the electron also experiences internal forces from the periodic lattice potential (ion cores). Rather than tracking these internal forces explicitly, we absorb their effect into an <b>effective mass</b> <M>{"m_e^*"}</M>:</P>
          <Eq>{"a_{\\text{cryst}} = \\frac{F_{\\text{ext}}}{m_e^*}"}</Eq>
          <P>The effective mass encapsulates how the crystal lattice modifies the electron's inertial response to external forces.</P>
        </Section>

        <Section title="E-k Relation and Curvature">
          <P>The kinetic energy of an electron with crystal momentum <M>{"p = \\hbar k"}</M> is:</P>
          <Eq>{"E_{\\text{kinetic}} = \\frac{p^2}{2m_e^*} = \\frac{\\hbar^2 k^2}{2m_e^*}"}</Eq>
          <P>The effective mass is determined by the <b>curvature</b> of the E-k dispersion relation:</P>
          <Eq>{"\\frac{1}{m_e^*} = \\frac{1}{\\hbar^2} \\frac{\\partial^2 E}{\\partial k^2}"}</Eq>
          <P>A <b>narrower</b> parabola (higher curvature) corresponds to a <b>smaller</b> effective mass, meaning the electron responds more readily to external forces.</P>
          <EkParabola params={gp.ekParabola} mid="-t4" />
        </Section>

        <Section title="Effective Mass Tensor">
          <P>In general, the effective mass depends on the crystallographic direction. The full effective mass is a <b>tensor</b> (3x3 matrix):</P>
          <Eq>{"\\left(\\frac{1}{m^*}\\right)_{ij} = \\frac{1}{\\hbar^2} \\frac{\\partial^2 E}{\\partial k_i \\, \\partial k_j}"}</Eq>
          <P>This means the effective mass can be different along different crystal directions (e.g., along [100] vs [111]).</P>
        </Section>

        <Section title="Effective Mass in Metals">
          <P>Table 4.2: Effective mass of electrons in selected metals (as ratio <M>{"m_e^*/m_e"}</M>):</P>
          <div className="data-table">
            <table>
              <thead>
                <tr><th>Metal</th><th>Ag</th><th>Au</th><th>Bi</th><th>Cu</th><th>Fe</th><th>K</th><th>Li</th><th>Mg</th><th>Na</th><th>Zn</th></tr>
              </thead>
              <tbody>
                <tr><td><M>{"m_e^*/m_e"}</M></td><td>1.0</td><td>1.1</td><td>0.008</td><td>1.3</td><td>12</td><td>1.2</td><td>2.2</td><td>1.3</td><td>1.2</td><td>0.85</td></tr>
              </tbody>
            </table>
          </div>
          <P>Notable: Bi has an extremely small effective mass (0.008 <M>{"m_e"}</M>), meaning electrons are very responsive. Fe has a very large effective mass (12 <M>{"m_e"}</M>), indicating strong interactions with the lattice.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "density-of-states",
    tab: "Density of States",
    title: "5. Density of States",
    subtitle: "Counting quantum states in k-space",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Definition of g(E)">
          <P>The <b>density of states</b> <M>{"g(E)"}</M> is defined such that <M>{"g(E)\\,dE"}</M> gives the number of electron states per unit volume in the energy interval <M>{"E"}</M> to <M>{"E + dE"}</M>.</P>
          <KeyConcept label="Density of States">
            g(E) tells us how many quantum states are available for electrons at a given energy. It is crucial for determining how electrons fill the available energy levels.
          </KeyConcept>
          <P>The total number of states per unit volume up to energy <M>{"E'"}</M> is:</P>
          <Eq>{"S_v(E') = \\int_0^{E'} g(E)\\,dE"}</Eq>
        </Section>

        <Section title="Derivation: Counting States in k-Space">
          <P>For a free electron in a cubic potential well of side <M>{"L"}</M>, the allowed energies are:</P>
          <Eq>{"E = \\frac{h^2}{8m_e L^2}(n_1^2 + n_2^2 + n_3^2)"}</Eq>
          <P>where <M>{"n_1, n_2, n_3"}</M> are positive integers. Each combination <M>{"(n_1, n_2, n_3)"}</M> is one orbital state.</P>
          <P>To count all states with energy less than <M>{"E'"}</M>, we need all integer combinations satisfying <M>{"n_1^2 + n_2^2 + n_3^2 \\leq n'^2"}</M> where <M>{"n'^2 = 8m_e L^2 E'/h^2"}</M>. This is the volume of 1/8 of a sphere of radius <M>{"n'"}</M> in n-space (since <M>{"n_i \\gt 0"}</M>):</P>
          <Eq>{"S_{\\text{orb}}(n') = \\frac{1}{8}\\left(\\frac{4}{3}\\pi n'^3\\right) = \\frac{\\pi}{6}n'^3"}</Eq>
          <P>Including spin (2 electrons per orbital state):</P>
          <Eq>{"S(n') = 2 S_{\\text{orb}}(n') = \\frac{\\pi}{3}n'^3"}</Eq>
        </Section>

        <Section title="Final Result">
          <P>Substituting <M>{"n'^2 = 8m_e L^2 E'/h^2"}</M> and dividing by volume <M>{"L^3"}</M>:</P>
          <Eq>{"S_v(E') = \\frac{\\pi(8m_e E')^{3/2}}{3h^3}"}</Eq>
          <P>The density of states is the derivative:</P>
          <Eq>{"g(E) = \\frac{dS_v}{dE} = (8\\pi\\sqrt{2})\\left(\\frac{m_e}{h^2}\\right)^{3/2} E^{1/2}"}</Eq>
          <P>The <M>{"E^{1/2}"}</M> dependence means the density of states increases as a square root function of energy. More states are available at higher energies.</P>
          <DensityOfStates params={gp.densityOfStates} mid="-t5" />
        </Section>
      </div>
    ),
  },
  {
    id: "fermi-dirac",
    tab: "Fermi-Dirac",
    title: "6. Fermi-Dirac Statistics",
    subtitle: "Occupation probability, Fermi energy, and temperature effects",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Boltzmann Classical Statistics">
          <P>In classical physics, the probability of a particle having energy <M>{"E"}</M> decreases exponentially:</P>
          <Eq>{"P(E) = A \\exp\\left(-\\frac{E}{kT}\\right)"}</Eq>
          <P>The ratio of particles at two different energies:</P>
          <Eq>{"\\frac{N_2}{N_1} = \\exp\\left(-\\frac{E_2 - E_1}{kT}\\right)"}</Eq>
          <P>This works well for dilute gases but fails for electrons in metals, where quantum effects (Pauli exclusion) dominate.</P>
        </Section>

        <Section title="Fermi-Dirac Distribution">
          <P>Electrons are fermions and obey the <b>Fermi-Dirac distribution</b>:</P>
          <Eq>{"f(E) = \\frac{1}{1 + \\exp\\left(\\frac{E - E_F}{kT}\\right)}"}</Eq>
          <P>where <M>{"E_F"}</M> is the <b>Fermi energy</b> and <M>{"k_B = 1.381 \\times 10^{-23}"}</M> J/K is Boltzmann's constant (<M>{"k_B = 8.617 \\times 10^{-5}"}</M> eV/K).</P>
          <KeyConcept label="Fermi Energy" tested>
            The energy at which the occupation probability is exactly 1/2. At E = E_F, f(E_F) = 1/2. This defines the boundary between mostly-occupied and mostly-empty states.
          </KeyConcept>
          <FermiDiracDistribution params={gp.fermiDirac} mid="-t6" />
        </Section>

        <Section title="Behavior at Different Temperatures">
          <P>At <M>{"T = 0"}</M> K, the Fermi-Dirac distribution becomes a <b>step function</b>:</P>
          <ul className="info-list">
            <li><M>{"f(E) = 1"}</M> for <M>{"E \\lt E_F"}</M> (all states below Fermi level are occupied)</li>
            <li><M>{"f(E) = 0"}</M> for <M>{"E \\gt E_F"}</M> (all states above Fermi level are empty)</li>
          </ul>
          <P>As temperature increases, the step softens into a sigmoid. States just below <M>{"E_F"}</M> become partially empty, and states just above <M>{"E_F"}</M> become partially occupied. The transition width is proportional to <M>{"kT"}</M>.</P>
          <ElectronPopulationAnimation mid="-t6a" />
        </Section>

        <Section title="Boltzmann Approximation">
          <P>When <M>{"E - E_F \\gg kT"}</M> (far above the Fermi level), the exponential dominates and the Fermi-Dirac distribution approximates to Boltzmann:</P>
          <Eq>{"f(E) \\approx \\exp\\left(-\\frac{E - E_F}{kT}\\right) \\quad \\text{for } E - E_F \\gg kT"}</Eq>
          <P>This approximation is commonly used for electrons in the conduction band of semiconductors, where <M>{"E_c - E_F \\gg kT"}</M>.</P>
        </Section>

        <Section title="Fermi Energy at 0 K">
          <P>The Fermi energy at absolute zero is determined by the electron concentration <M>{"n"}</M> (number of free electrons per unit volume):</P>
          <Eq>{"E_{FO} = \\frac{h^2}{8m_e}\\left(\\frac{3n}{\\pi}\\right)^{2/3}"}</Eq>
          <P>Temperature dependence of the Fermi energy:</P>
          <Eq>{"E_F(T) = E_{FO}\\left[1 - \\frac{\\pi^2}{12}\\left(\\frac{kT}{E_{FO}}\\right)^2\\right]"}</Eq>
          <P>The correction is very small: at room temperature, <M>{"kT \\approx 0.026"}</M> eV while <M>{"E_{FO}"}</M> is typically several eV, so <M>{"(kT/E_{FO})^2 \\sim 10^{-4}"}</M>.</P>
          <KeyConcept label="Average Energy at T = 0 K" tested>
            The average kinetic energy of electrons in a metal at absolute zero is not zero (unlike classical prediction). It equals 3/5 of the Fermi energy.
          </KeyConcept>
          <Eq>{"\\bar{E} = \\frac{3}{5}E_{FO}"}</Eq>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW3" number="7" title="Temperature dependence of Fermi energy" points="20 pts">
            <P>Cu: <M>{"E_{FO} = 7.0"}</M> eV. (a) Calculate <M>{"E_F"}</M> at 300 K and percentage change. (b) Average energy and mean speed at 0 K and 300 K.</P>
            <CollapsibleBlock title="Solution">
              <P><b>(a)</b> <M>{"E_F(300) = 7.0[1 - (\\pi^2/12)(0.0259/7.0)^2] = 6.993"}</M> eV. Change: -0.0011% (negligible because <M>{"k_BT \\ll E_{FO}"}</M>).</P>
              <P><b>(b)</b> At 0 K: <M>{"\\langle E \\rangle_0 = (3/5)E_{FO} = 4.2"}</M> eV. <M>{"\\langle v \\rangle_0 = \\sqrt{2 \\langle E \\rangle/m_e} = 1.215 \\times 10^6"}</M> m/s.</P>
              <P>At 300 K: <M>{"\\langle E \\rangle = (3/5)E_{FO}[1 + (5\\pi^2/12)(k_BT/E_{FO})^2] = 4.200"}</M> eV. Speed barely changes (<M>{"1.2154 \\times 10^6"}</M> m/s).</P>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW3" number="8" title="Conduction electrons in copper" points="20 pts">
            <P><M>{"E_F = 7.0"}</M> eV, drift mobility <M>{"\\mu = 33"}</M> cm<M>{"^2"}</M> V<M>{"^{-1}"}</M> s<M>{"^{-1}"}</M>. Find <M>{"v_F"}</M>, compare to thermal velocity, explain why <M>{"v_F \\gg v_{thermal}"}</M>.</P>
            <CollapsibleBlock title="Solution">
              <P><M>{"v_F = \\sqrt{2E_F/m_e} = \\sqrt{2 \\times 7.0 \\times 1.6 \\times 10^{-19}/9.109 \\times 10^{-31}} = 1.57 \\times 10^6"}</M> m/s</P>
              <P>Thermal velocity (classical): <M>{"v_{th} = \\sqrt{2k_BT/m_e} = 9.5 \\times 10^4"}</M> m/s (or <M>{"v_{rms} = \\sqrt{3k_BT/m_e} = 1.17 \\times 10^5"}</M> m/s)</P>
              <P><M>{"v_F/v_{th} \\approx 13{-}17"}</M>. <M>{"v_F \\gg v_{thermal}"}</M> because conduction electrons form a degenerate Fermi gas: they fill states up to <M>{"E_F = 7"}</M> eV, which is much greater than <M>{"k_BT = 0.026"}</M> eV at 300 K.</P>
            </CollapsibleBlock>
          </HWQuestion>
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
        <Section title="1. E-k Parabolic Dispersion">
          <EkParabola params={gp.ekParabola} mid="-gp1" />
        </Section>
        <Section title="2. Band Diagrams">
          <BandDiagram params={gp.bandDiagram} mid="-gp2" />
        </Section>
        <Section title="3. Fermi-Dirac Distribution">
          <FermiDiracDistribution params={gp.fermiDirac} mid="-gp3" />
        </Section>
        <Section title="4. Density of States">
          <DensityOfStates params={gp.densityOfStates} mid="-gp4" />
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

// ─── HW Question Component ───

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

// ─── Collapsible Block (copy verbatim) ───

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

.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin: 12px 0; }
@media (max-width: 520px) { .compare-grid { grid-template-columns: 1fr; } }
.compare-card { padding: 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.compare-card h4 { margin: 0 0 8px; font-size: 16px; font-weight: 700; color: var(--accent); font-family: 'IBM Plex Mono', monospace; }

.data-table { margin: 12px 0; overflow-x: auto; }
.data-table table { width: 100%; border-collapse: collapse; font-size: 15px; }
.data-table th { text-align: left; padding: 8px 12px; background: var(--bg-eq); color: var(--accent); font-family: 'IBM Plex Mono', monospace; font-weight: 600; font-size: 13px; border-bottom: 1px solid var(--border); }
.data-table td { padding: 8px 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border); font-family: 'IBM Plex Mono', monospace; }

.content-area { flex: 1; overflow-y: auto; padding-bottom: 80px; }

.graph-controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; padding: 6px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; }
.graph-controls label { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 180px; }
.graph-ctrl-label { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--accent); font-weight: 500; white-space: nowrap; min-width: 120px; }
.graph-slider { flex: 1; min-width: 100px; height: 4px; accent-color: var(--accent); cursor: pointer; }
.graph-select { background: var(--bg-main); border: 1px solid var(--border); border-radius: 4px; color: var(--text-muted); font-size: 11px; font-family: 'IBM Plex Mono', monospace; padding: 3px 6px; cursor: pointer; }
.graph-select:focus { border-color: var(--accent); outline: none; }
.graph-select option { background: var(--bg-panel); color: var(--text-muted); }

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
      // Only wrap if line doesn't already have $$ and looks like pure math (not prose with a stray backslash)
      if (/\$/.test(match)) return match;
      const stripped = match.trim();
      // Count "words" that are 4+ lowercase letters not preceded by backslash (prose indicator)
      const proseWords = stripped.match(/(?<!\\)[a-z]{4,}/g) || [];
      // Filter out known math function names
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
        // Extend backwards to capture leading variable and operator, e.g. "E = " before \frac
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
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations. -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/band_theory.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep thread responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/band_theory.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/band_theory.jsx now.`;
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
                {sessionStatus === "ready" && "Session active. Ask about band theory, semiconductors, Fermi-Dirac statistics, or any topic. Click or highlight content to attach as context."}
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
          <h1>Band Theory and Electronic Properties</h1>
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
