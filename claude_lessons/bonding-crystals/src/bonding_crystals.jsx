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
  "bonding-forces": `Topic: Interatomic Forces and Potential Energy. Covers: why molecules form (lower PE), attractive force F_A (Coulomb for ionic, van der Waals), repulsive force F_R (electron cloud overlap, Pauli exclusion), net force F_N = F_A + F_R = 0 at equilibrium separation r_0. Single-pair potential energy E(r) = -A/r + B/r^m, where A = e^2/(4*pi*eps_0) ≈ 1.436 eV*nm is the Coulomb constant. For the full crystal lattice, the Madelung constant M multiplies the Coulomb term: E_lattice = -M*e^2/(4*pi*eps_0*r) + B/r^m. M = 1.748 for NaCl. m typically 6-12 for vdW or 8 for ionic. Bond energy E_bond = |E(r_0)| is the energy at the equilibrium separation. Variables: r = interatomic separation, r_0 = equilibrium separation (0.28 nm for NaCl), e = 1.6e-19 C, eps_0 = 8.854e-12 F/m, M = Madelung constant.`,
  "bond-types": `Topic: Types of Bonding. Covers: Covalent bonding (directional, shared electron pairs, hybridized orbitals, examples: diamond, Si, Ge, GaAs), metallic bonding (electron sea/cloud model, non-directional, ductile, good conductors), ionic bonding (electron transfer, electrostatic attraction, NaCl, high melting point, insulating), van der Waals bonding (London dispersion forces, induced dipole-dipole, weak, low melting point, noble gas crystals), hydrogen bonding (permanent dipole in H-X where X = O, N, F; important in H2O, ice, biology), mixed bonding (most materials have partial ionic + covalent character). Comparison properties: bond energy (0.01-0.1 eV for vdW up to 4-7 eV for covalent), melting temperature, elastic modulus, density. Electronegativity difference determines ionic vs covalent character.`,
  "crystal-structures": `Topic: Crystal Structures. Covers: crystalline (long-range periodic order) vs amorphous (short-range order only). Crystal = lattice + basis. Unit cell defined by lattice vectors a, b, c and angles alpha, beta, gamma. Translation vector R = h*a + k*b + l*c (h,k,l integers). Primitive unit cell contains exactly one lattice point. Wigner-Seitz cell: draw perpendicular bisectors to nearest neighbors. 2D Bravais lattices: 5 types (square, rectangular, centered rectangular, hexagonal, oblique). 3D Bravais lattices: 14 types in 7 crystal systems (cubic: SC/BCC/FCC, tetragonal: simple/body-centered, orthorhombic: simple/base/body/face, hexagonal, rhombohedral/trigonal, monoclinic: simple/base, triclinic). Cubic system: a=b=c, alpha=beta=gamma=90 deg. Diamond structure: FCC lattice with 2-atom basis (offset by a/4, a/4, a/4). Atoms per unit cell: SC=1, BCC=2, FCC=4, Diamond=8, HCP=6. Coordination number: SC=6, BCC=8, FCC=12, Diamond=4, HCP=12. APF: SC=0.52, BCC=0.68, FCC=0.74, Diamond=0.34, HCP=0.74. Radius vs lattice parameter: SC r=a/2, BCC r=a*sqrt(3)/4, FCC r=a*sqrt(2)/4, Diamond r=a*sqrt(3)/8.`,
  "miller-indices": `Topic: Miller Indices and Diffraction. Covers: crystal directions [uvw] denoting direction u*a + v*b + w*c. Negative indices written with overbar. Family of directions <uvw>. Crystal planes (hkl): take reciprocals of fractional intercepts with axes. Family of planes {hkl}. Interplanar spacing for cubic: d_{hkl} = a / sqrt(h^2 + k^2 + l^2). Bragg's diffraction law: 2*d*sin(theta) = n*lambda, where theta is the angle of incidence, lambda is wavelength, n is integer order. Interactive Bragg calculator available (default: NaCl a=0.5641nm, Cu K-alpha lambda=0.1541nm). X-ray diffraction (XRD) for structure determination. Powder diffraction: polycrystalline sample, rings on detector, identifies crystal structure from peak positions. Systematic absences: BCC reflects only when h+k+l = even, FCC reflects only when h,k,l all odd or all even.`,
  "defects": `Topic: Crystal Defects. Covers: Point defects: vacancies (Schottky defect in ionic = cation + anion vacancy pair), interstitials (self or foreign), substitutional impurities, Frenkel defect (ion displaced to interstitial site, leaving vacancy). Vacancy concentration: n_v = N * exp(-E_v / (k_B * T)). Line defects: edge dislocation (extra half-plane of atoms, Burgers vector perpendicular to dislocation line), screw dislocation (Burgers vector parallel to dislocation line). Burgers vector b: close the Burgers circuit around dislocation. Planar defects: grain boundaries (misorientation between crystallites), twin boundaries (mirror reflection), stacking faults (error in stacking sequence ABCABC for FCC). Surface effects: broken bonds at surface. Stoichiometric vs nonstoichiometric compounds (e.g., Fe_{1-x}O). Defects affect mechanical strength, diffusion, electrical conductivity, optical properties.`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials) at the University of Waterloo, Winter 2026. This unit covers bonding, crystal structures, and crystal defects, spanning Lectures 7-8 and Kasap chapters 1.1-1.3, 1.9, 3.4, 3.7, 3.8. The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

const MODELS = [
  { model: "claude-sonnet-4-6", label: "Sonnet 4.6", key: "s" },
  { model: "claude-opus-4-6", label: "Opus 4.6", key: "k" },
  { model: "claude-haiku-4-5-20251001", label: "Haiku 4.5", key: "h" },
];

const EFFORT_LEVELS = ["low", "medium", "high", "max"];

// ─── Theme-Aware Graph Colors (copy verbatim) ───

const THEMES_G = {
  dark:  { bg: "#13151c", ax: "#6b7084", gold: "#c8a45a", blue: "#4a90d9", red: "#e06c75", grn: "#69b578", txt: "#9498ac", ltxt: "#b0b4c4", purple: "#a077d4", orange: "#e0a060" },
  light: { bg: "#f0efe8", ax: "#888", gold: "#9a7b2e", blue: "#2a6abf", red: "#c0392b", grn: "#2d8a4e", txt: "#555", ltxt: "#333", purple: "#7b5bb5", orange: "#c4822e" },
};
let G = THEMES_G.light;

// ─── Default Graph Parameters ───

const DEFAULT_GRAPH_PARAMS = {
  interatomicPE: { m: 8, showComponents: true, showForce: false },
  interatomicForce: { showPE: false, showForce: true },
};

// ─── Graph Components ───

function InteratomicPotentialEnergy({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.interatomicPE, ...params };
  const w = 480, h = 300, ox = 60, oy = 200;
  const rMin = 0.15, rMax = 0.8, rStep = 0.005;
  // NaCl parameters in nm and eV
  const A_coeff = 1.436; // e^2/(4*pi*eps_0) in eV*nm (single ion-pair Coulomb constant)
  const m = p.m;
  // B chosen so equilibrium at r0 = 0.28 nm: dE/dr = 0 => B = A*r0^(m-1)/m
  const r0 = 0.28;
  const B_coeff = A_coeff * Math.pow(r0, m - 1) / m;

  const E_fn = (r) => -A_coeff / r + B_coeff / Math.pow(r, m);
  const E_attr = (r) => -A_coeff / r;
  const E_rep = (r) => B_coeff / Math.pow(r, m);

  const E0 = E_fn(r0);

  // Scale: r in nm mapped to x pixels, E in eV mapped to y pixels
  const scaleX = (w - ox - 20) / (rMax - rMin);
  const scaleY = 18; // pixels per eV
  const eCenter = -3; // center the E axis around this value

  const toX = (r) => ox + (r - rMin) * scaleX;
  const toY = (e) => oy - (e - eCenter) * scaleY;

  // Build paths
  let netPath = "";
  let attrPath = "";
  let repPath = "";
  let first = true;
  for (let r = rMin; r <= rMax; r += rStep) {
    const en = E_fn(r);
    const ea = E_attr(r);
    const er = E_rep(r);
    const x = toX(r);
    const yNet = Math.max(10, Math.min(h - 10, toY(en)));
    const yAttr = Math.max(10, Math.min(h - 10, toY(ea)));
    const yRep = Math.max(10, Math.min(h - 10, toY(er)));
    const cmd = first ? "M" : "L";
    netPath += `${cmd}${x.toFixed(1)},${yNet.toFixed(1)} `;
    if (p.showComponents) {
      attrPath += `${cmd}${x.toFixed(1)},${yAttr.toFixed(1)} `;
      repPath += `${cmd}${x.toFixed(1)},${yRep.toFixed(1)} `;
    }
    first = false;
  }

  const r0x = toX(r0);
  const r0y = toY(E0);
  const zeroY = toY(0);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Interatomic potential energy curve showing equilibrium separation</title>
        <defs>
          <marker id={`ah-pe${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        {/* Title */}
        <text x={w/2} y="16" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Interatomic Potential Energy (NaCl)
        </text>
        {/* Axes */}
        <line x1={ox} y1={h - 10} x2={ox} y2={10} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-pe${mid})`}/>
        <line x1={ox} y1={zeroY} x2={w - 10} y2={zeroY} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-pe${mid})`}/>
        {/* Zero line label */}
        <text x={ox - 8} y={zeroY + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">0</text>
        {/* Y axis label */}
        <text x={15} y={h/2} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${h/2})`}>E(r) [eV]</text>
        {/* X axis label */}
        <text x={w/2} y={h - 2} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">r [nm]</text>
        {/* Tick marks on x axis */}
        {[0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map(r => {
          const tx = toX(r);
          return (
            <g key={r}>
              <line x1={tx} y1={zeroY - 3} x2={tx} y2={zeroY + 3} stroke={G.ax} strokeWidth="1"/>
              <text x={tx} y={zeroY + 14} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{r.toFixed(1)}</text>
            </g>
          );
        })}
        {/* Tick marks on y axis */}
        {[-8, -6, -4, -2, 2, 4, 6].map(e => {
          const ty = toY(e);
          if (ty < 15 || ty > h - 15) return null;
          return (
            <g key={e}>
              <line x1={ox - 3} y1={ty} x2={ox + 3} y2={ty} stroke={G.ax} strokeWidth="1"/>
              <text x={ox - 8} y={ty + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{e}</text>
            </g>
          );
        })}
        {/* Component curves */}
        {p.showComponents && (
          <>
            <path d={attrPath} fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7"/>
            <path d={repPath} fill="none" stroke={G.red} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7"/>
            <text x={toX(0.55)} y={toY(E_attr(0.55)) + 14} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">-A/r (attractive)</text>
            <text x={toX(0.35)} y={toY(E_rep(0.35)) - 8} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">{"B/r\u207F (repulsive)"}</text>
          </>
        )}
        {/* Net PE curve */}
        <path d={netPath} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Equilibrium point */}
        <circle cx={r0x} cy={r0y} r="4" fill={G.red} />
        <line x1={r0x} y1={r0y} x2={r0x} y2={zeroY} stroke={G.red} strokeWidth="1" strokeDasharray="3,2"/>
        {/* E_bond annotation */}
        <line x1={r0x + 8} y1={r0y} x2={r0x + 8} y2={zeroY} stroke={G.grn} strokeWidth="1.5"/>
        <line x1={r0x + 4} y1={r0y} x2={r0x + 12} y2={r0y} stroke={G.grn} strokeWidth="1"/>
        <line x1={r0x + 4} y1={zeroY} x2={r0x + 12} y2={zeroY} stroke={G.grn} strokeWidth="1"/>
        <text x={r0x + 16} y={(r0y + zeroY) / 2 + 3} fill={G.grn} fontSize="10" fontFamily="'IBM Plex Mono'" fontWeight="600">E_bond</text>
        {/* r0 label */}
        <text x={r0x} y={zeroY + 26} fill={G.red} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"r\u2080 = 0.28 nm"}
        </text>
        {/* Net PE label */}
        <text x={toX(0.5)} y={toY(E_fn(0.5)) - 6} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" fontWeight="600">E(r) net</text>
      </svg>
    </div>
  );
}

function InteratomicForce({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.interatomicForce, ...params };
  const w = 480, h = 280, ox = 60, oy = 150;
  const rMin = 0.15, rMax = 0.8, rStep = 0.005;
  const A_coeff = 1.436;
  const m = 8;
  const r0 = 0.28;
  const B_coeff = A_coeff * Math.pow(r0, m - 1) / m;

  // F = -dE/dr = -A/r^2 + m*B/r^(m+1)
  const F_fn = (r) => -A_coeff / (r * r) + m * B_coeff / Math.pow(r, m + 1);
  const F_attr = (r) => -A_coeff / (r * r);
  const F_rep = (r) => m * B_coeff / Math.pow(r, m + 1);

  const scaleX = (w - ox - 20) / (rMax - rMin);
  const scaleY = 2.0; // pixels per eV/nm
  const toX = (r) => ox + (r - rMin) * scaleX;
  const toY = (f) => oy - f * scaleY;

  let forcePath = "";
  let attrFPath = "";
  let repFPath = "";
  let first = true;
  for (let r = rMin; r <= rMax; r += rStep) {
    const fn = F_fn(r);
    const fa = F_attr(r);
    const fr = F_rep(r);
    const x = toX(r);
    const yF = Math.max(15, Math.min(h - 15, toY(fn)));
    const yA = Math.max(15, Math.min(h - 15, toY(fa)));
    const yR = Math.max(15, Math.min(h - 15, toY(fr)));
    const cmd = first ? "M" : "L";
    forcePath += `${cmd}${x.toFixed(1)},${yF.toFixed(1)} `;
    attrFPath += `${cmd}${x.toFixed(1)},${yA.toFixed(1)} `;
    repFPath += `${cmd}${x.toFixed(1)},${yR.toFixed(1)} `;
    first = false;
  }

  const r0x = toX(r0);
  const zeroY = oy;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Interatomic force curve as derivative of potential energy</title>
        <defs>
          <marker id={`ah-f${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Interatomic Force F(r) = -dE/dr
        </text>
        {/* Axes */}
        <line x1={ox} y1={h - 10} x2={ox} y2={10} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-f${mid})`}/>
        <line x1={ox} y1={zeroY} x2={w - 10} y2={zeroY} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-f${mid})`}/>
        <text x={ox - 8} y={zeroY + 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">0</text>
        <text x={15} y={h/2} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${h/2})`}>F(r) [eV/nm]</text>
        <text x={w/2} y={h - 2} fill={G.ltxt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">r [nm]</text>
        {/* Component force curves */}
        <path d={attrFPath} fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6"/>
        <path d={repFPath} fill="none" stroke={G.red} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6"/>
        {/* Net force */}
        <path d={forcePath} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Equilibrium */}
        <circle cx={r0x} cy={zeroY} r="4" fill={G.red}/>
        <line x1={r0x} y1={25} x2={r0x} y2={h - 20} stroke={G.red} strokeWidth="1" strokeDasharray="3,2" opacity="0.4"/>
        <text x={r0x} y={h - 18} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">{"r\u2080"}</text>
        {/* Region labels */}
        <text x={toX(0.4)} y={zeroY + 30} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Attractive (F\u2099 \u003C 0)"}</text>
        <text x={toX(0.22)} y={zeroY - 50} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"Repulsive (F\u2099 > 0)"}</text>
        {/* Labels */}
        <text x={toX(0.55)} y={Math.max(20, toY(F_attr(0.55))) + 12} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">F_A (attractive)</text>
        <text x={toX(0.22)} y={Math.min(h - 20, toY(F_rep(0.22))) - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">F_R (repulsive)</text>
      </svg>
    </div>
  );
}

// ─── Interactive Components ───

function BraggCalculator() {
  const [a, setA] = useState(0.5641); // NaCl lattice parameter in nm
  const [h, setH] = useState(2);
  const [k, setK] = useState(0);
  const [l, setL] = useState(0);
  const [lambda, setLambda] = useState(0.1541); // Cu K-alpha in nm
  const [n, setN] = useState(1);

  const denom = Math.sqrt(h * h + k * k + l * l);
  const d = denom > 0 ? a / denom : Infinity;
  const sinTheta = denom > 0 ? (n * lambda) / (2 * d) : 0;
  const valid = sinTheta > 0 && sinTheta <= 1;
  const theta = valid ? Math.asin(sinTheta) * (180 / Math.PI) : null;
  const twoTheta = theta !== null ? 2 * theta : null;

  const inputStyle = { width: 56, background: "var(--bg-main)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text-primary)", padding: "4px 6px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", textAlign: "center" };
  const labelStyle = { fontSize: 12, color: "var(--text-muted)", fontFamily: "'IBM Plex Mono', monospace", minWidth: 24 };
  const rowStyle = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 };

  return (
    <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, margin: "12px 0" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>Bragg Diffraction Calculator</div>
      <div style={rowStyle}>
        <span style={labelStyle}>a =</span>
        <input type="number" step="0.01" value={a} onChange={e => setA(parseFloat(e.target.value) || 0)} style={inputStyle} />
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>nm (lattice parameter)</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>(hkl)</span>
        <input type="number" step="1" value={h} onChange={e => setH(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 36 }} />
        <input type="number" step="1" value={k} onChange={e => setK(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 36 }} />
        <input type="number" step="1" value={l} onChange={e => setL(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: 36 }} />
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>{"\u03BB ="}</span>
        <input type="number" step="0.001" value={lambda} onChange={e => setLambda(parseFloat(e.target.value) || 0)} style={inputStyle} />
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>nm (wavelength; Cu K-alpha = 0.1541)</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>n =</span>
        <input type="number" step="1" min="1" max="10" value={n} onChange={e => setN(parseInt(e.target.value) || 1)} style={{ ...inputStyle, width: 36 }} />
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>diffraction order</span>
      </div>
      <div style={{ marginTop: 8, padding: "8px 10px", background: "var(--bg-eq)", borderRadius: 4, fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
        <div style={{ color: "var(--text-muted)" }}>
          d<sub>{h}{k}{l}</sub> = {denom > 0 ? `${d.toFixed(4)} nm` : "---"}
        </div>
        {valid ? (
          <div style={{ color: "var(--accent)", fontWeight: 600, marginTop: 4 }}>
            {"\u03B8"} = {theta.toFixed(2)}{"\u00B0"} , 2{"\u03B8"} = {twoTheta.toFixed(2)}{"\u00B0"}
          </div>
        ) : (
          <div style={{ color: "var(--chat-stop-color)", marginTop: 4 }}>
            {denom === 0 ? "Enter nonzero (hkl)" : `No reflection: sin\u03B8 = ${sinTheta.toFixed(3)} > 1`}
          </div>
        )}
      </div>
    </div>
  );
}

function CrystalStructureCompare() {
  const [selected, setSelected] = useState("SC");
  const structures = {
    SC: { name: "Simple Cubic", atoms: 1, cn: 6, apf: 0.52, rRatio: "a/2", examples: "Po", desc: "Atoms at 8 corners. Each corner shared by 8 cells, so 8 x (1/8) = 1 atom per cell." },
    BCC: { name: "Body-Centered Cubic", atoms: 2, cn: 8, apf: 0.68, rRatio: "a\u221A3/4", examples: "Fe(\u03B1), W, Cr, Mo", desc: "8 corner atoms (8 x 1/8 = 1) + 1 body center atom = 2 atoms per cell." },
    FCC: { name: "Face-Centered Cubic", atoms: 4, cn: 12, apf: 0.74, rRatio: "a\u221A2/4", examples: "Cu, Al, Au, Ag, Ni", desc: "8 corner atoms (8 x 1/8 = 1) + 6 face atoms (6 x 1/2 = 3) = 4 atoms per cell." },
    Diamond: { name: "Diamond Cubic", atoms: 8, cn: 4, apf: 0.34, rRatio: "a\u221A3/8", examples: "C, Si, Ge", desc: "FCC lattice with 2-atom basis. 4 FCC atoms + 4 interior tetrahedral atoms = 8 atoms per cell." },
    HCP: { name: "Hex. Close-Packed", atoms: 6, cn: 12, apf: 0.74, rRatio: "a/2", examples: "Zn, Ti, Mg, Co", desc: "12 corner atoms (12 x 1/6 = 2) + 2 face atoms (2 x 1/2 = 1) + 3 interior atoms = 6 atoms per cell." },
  };
  const s = structures[selected];
  const btnStyle = (key) => ({
    padding: "4px 10px", borderRadius: 4, border: `1px solid ${selected === key ? "var(--accent)" : "var(--border)"}`,
    background: selected === key ? "var(--accent)" : "var(--bg-main)", color: selected === key ? "var(--bg-main)" : "var(--text-muted)",
    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", fontWeight: selected === key ? 600 : 400,
  });

  return (
    <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, margin: "12px 0" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>Crystal Structure Comparison</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {Object.keys(structures).map(key => (
          <button key={key} style={btnStyle(key)} onClick={() => setSelected(key)}>{key}</button>
        ))}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>{s.name}</div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 8 }}>{s.desc}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace" }}>
        <span style={{ color: "var(--text-dim)" }}>Atoms/cell:</span><span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.atoms}</span>
        <span style={{ color: "var(--text-dim)" }}>Coord. number:</span><span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.cn}</span>
        <span style={{ color: "var(--text-dim)" }}>APF:</span><span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.apf}</span>
        <span style={{ color: "var(--text-dim)" }}>r vs a:</span><span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{s.rRatio}</span>
        <span style={{ color: "var(--text-dim)" }}>Examples:</span><span style={{ color: "var(--accent)" }}>{s.examples}</span>
      </div>
    </div>
  );
}

// ─── Bragg Diffraction Animation ───

function BraggDiffractionAnimation() {
  const [theta, setTheta] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const animRef = useRef(null);
  const prevRef = useRef(null);

  const w = 600, h = 300;
  const numPlanes = 5;
  const d = 45; // plane spacing in SVG units
  const planeY0 = 80; // first plane y
  const planeX0 = 80, planeX1 = 520;
  const lambda = 30; // wavelength in SVG units for visualization

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      prevRef.current = null;
      return;
    }
    const step = (ts) => {
      if (prevRef.current === null) prevRef.current = ts;
      const dt = (ts - prevRef.current) / 1000;
      prevRef.current = ts;
      setTime(t => t + dt * 60);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing]);

  const thetaRad = (theta * Math.PI) / 180;
  const sinT = Math.sin(thetaRad);
  const cosT = Math.cos(thetaRad);

  // Check Bragg condition: 2d*sin(theta) = n*lambda
  const pathDiff = 2 * d * sinT;
  const nOrder = pathDiff / lambda;
  const isConstructive = Math.abs(nOrder - Math.round(nOrder)) < 0.08 && Math.round(nOrder) >= 1;

  // Incident and reflected ray geometry for plane 0 and plane 1
  const hitX = 250; // where ray 1 hits plane 0
  const hit2X = hitX + 80; // where ray 2 hits plane 1
  const rayLen = 120;

  // Ray 1: hits plane 0
  const r1HitY = planeY0;
  const r1StartX = hitX - rayLen * cosT;
  const r1StartY = r1HitY - rayLen * sinT;
  const r1EndX = hitX + rayLen * cosT;
  const r1EndY = r1HitY - rayLen * sinT;

  // Ray 2: hits plane 1
  const r2HitY = planeY0 + d;
  const r2StartX = hit2X - rayLen * cosT;
  const r2StartY = r2HitY - rayLen * sinT;
  const r2EndX = hit2X + rayLen * cosT;
  const r2EndY = r2HitY - rayLen * sinT;

  // Path difference visualization: perpendiculars from ray 1 to ray 2 path
  // Drop perpendicular from r1 hit to incident ray 2 direction
  const perpAX = hit2X - d / Math.tan(thetaRad);
  const perpAY = planeY0;
  const perpBX = hit2X + d / Math.tan(thetaRad);
  const perpBY = planeY0;

  // Wave crests along incident rays
  const waveCrests = [];
  const numCrests = 8;
  for (let i = 0; i < numCrests; i++) {
    const phase = ((time * 0.8 + i * lambda) % (numCrests * lambda)) / (numCrests * lambda);
    const t1 = 1 - phase;
    // Incident crest on ray 1
    waveCrests.push({
      x: r1StartX + (hitX - r1StartX) * t1,
      y: r1StartY + (r1HitY - r1StartY) * t1,
      opacity: t1 > 0 && t1 < 1 ? 0.7 : 0,
    });
  }
  for (let i = 0; i < numCrests; i++) {
    const phase = ((time * 0.8 + i * lambda) % (numCrests * lambda)) / (numCrests * lambda);
    const t1 = phase;
    // Reflected crest on ray 1
    waveCrests.push({
      x: hitX + (r1EndX - hitX) * t1,
      y: r1HitY + (r1EndY - r1HitY) * t1,
      opacity: t1 > 0 && t1 < 1 ? 0.7 : 0,
      reflected: true,
    });
  }

  const controlStyle = { display: "flex", alignItems: "center", gap: 8, margin: "8px 0", flexWrap: "wrap" };
  const btnStyle = {
    padding: "4px 12px", borderRadius: 4, border: `1px solid var(--border)`,
    background: playing ? G.gold : "var(--bg-main)", color: playing ? "#13151c" : "var(--text-muted)",
    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", fontWeight: 600,
  };

  return (
    <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, margin: "12px 0" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>Bragg Diffraction Animation</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" style={{ background: G.bg, borderRadius: 4, display: "block" }}>
        <title>Bragg diffraction animation showing incident and reflected beams</title>
        {/* Crystal planes */}
        {Array.from({ length: numPlanes }, (_, i) => (
          <line key={`p${i}`} x1={planeX0} y1={planeY0 + i * d} x2={planeX1} y2={planeY0 + i * d}
            stroke={G.ax} strokeWidth={1.5} opacity={0.6} />
        ))}
        {/* Plane labels */}
        <text x={planeX1 + 8} y={planeY0 + 4} fill={G.txt} fontSize={10} fontFamily="'IBM Plex Mono', monospace">plane 0</text>
        <text x={planeX1 + 8} y={planeY0 + d + 4} fill={G.txt} fontSize={10} fontFamily="'IBM Plex Mono', monospace">plane 1</text>
        {/* d spacing bracket */}
        <line x1={planeX0 - 15} y1={planeY0} x2={planeX0 - 15} y2={planeY0 + d} stroke={G.gold} strokeWidth={1} />
        <line x1={planeX0 - 20} y1={planeY0} x2={planeX0 - 10} y2={planeY0} stroke={G.gold} strokeWidth={1} />
        <line x1={planeX0 - 20} y1={planeY0 + d} x2={planeX0 - 10} y2={planeY0 + d} stroke={G.gold} strokeWidth={1} />
        <text x={planeX0 - 28} y={planeY0 + d / 2 + 4} fill={G.gold} fontSize={11} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">d</text>

        {/* Incident ray 1 */}
        <line x1={r1StartX} y1={r1StartY} x2={hitX} y2={r1HitY} stroke={G.blue} strokeWidth={1.5} />
        <line x1={hitX} y1={r1HitY} x2={r1EndX} y2={r1EndY} stroke={G.blue} strokeWidth={1.5} strokeDasharray="4,3" />
        {/* Incident ray 2 */}
        <line x1={r2StartX} y1={r2StartY} x2={hit2X} y2={r2HitY} stroke={G.red} strokeWidth={1.5} />
        <line x1={hit2X} y1={r2HitY} x2={r2EndX} y2={r2EndY} stroke={G.red} strokeWidth={1.5} strokeDasharray="4,3" />

        {/* Theta angle arc for ray 1 */}
        {theta < 85 && (
          <>
            <path d={`M ${hitX + 25} ${r1HitY} A 25 25 0 0 0 ${hitX + 25 * cosT} ${r1HitY - 25 * sinT}`}
              fill="none" stroke={G.gold} strokeWidth={1} />
            <text x={hitX + 32} y={r1HitY - 8} fill={G.gold} fontSize={10} fontFamily="'IBM Plex Mono', monospace">{"\u03B8"}</text>
          </>
        )}

        {/* Extra path segment for ray 2 (path difference) */}
        <line x1={perpAX} y1={perpAY} x2={hit2X} y2={r2HitY} stroke={G.grn} strokeWidth={2} opacity={0.8} />
        <line x1={hit2X} y1={r2HitY} x2={perpBX} y2={perpBY} stroke={G.grn} strokeWidth={2} opacity={0.8} />
        <text x={(perpAX + perpBX) / 2} y={planeY0 + d + 22} fill={G.grn} fontSize={10} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">
          {"2d sin\u03B8"}
        </text>

        {/* Wave crests */}
        {playing && waveCrests.map((c, i) => (
          <circle key={`wc${i}`} cx={c.x} cy={c.y} r={3} fill={c.reflected ? G.blue : G.blue} opacity={c.opacity} />
        ))}

        {/* Constructive / Destructive label */}
        {isConstructive ? (
          <>
            <rect x={200} y={h - 45} width={200} height={30} rx={4} fill={G.gold} opacity={0.15} />
            <text x={300} y={h - 24} fill={G.gold} fontSize={16} fontWeight="bold" fontFamily="'IBM Plex Mono', monospace" textAnchor="middle"
              style={{ filter: "drop-shadow(0 0 6px rgba(200,164,90,0.7))" }}>
              Constructive!
            </text>
          </>
        ) : (
          <text x={300} y={h - 24} fill={G.txt} fontSize={14} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle" opacity={0.5}>
            Destructive
          </text>
        )}

        {/* Info */}
        <text x={10} y={h - 8} fill={G.txt} fontSize={9} fontFamily="'IBM Plex Mono', monospace">
          {`2d sin\u03B8 = ${pathDiff.toFixed(1)}  |  n\u03BB = ${(Math.round(nOrder) * lambda).toFixed(1)}  |  n \u2248 ${nOrder.toFixed(2)}`}
        </text>
      </svg>
      <div style={controlStyle}>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>
          {playing ? "Pause" : "Play"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace" }}>{"\u03B8"} =</span>
        <input type="range" min={5} max={85} step={1} value={theta}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); setTheta(Number(e.target.value)); }}
          style={{ width: 160 }} />
        <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, minWidth: 32 }}>{theta}{"\u00B0"}</span>
      </div>
    </div>
  );
}

// ─── Thermal Vibration Animation ───

function ThermalVibrationAnimation() {
  const gridSize = 6;
  const spacing = 55;
  const atomR = 12;
  const svgSize = 400;
  const padding = 40;

  const [temperature, setTemperature] = useState(300);
  const [playing, setPlaying] = useState(false);
  const [offsets, setOffsets] = useState(() =>
    Array.from({ length: gridSize * gridSize }, () => ({ dx: 0, dy: 0 }))
  );
  const animRef = useRef(null);
  const targetRef = useRef(
    Array.from({ length: gridSize * gridSize }, () => ({ dx: 0, dy: 0 }))
  );
  const currentRef = useRef(
    Array.from({ length: gridSize * gridSize }, () => ({ dx: 0, dy: 0 }))
  );

  // Vacancy at grid (2,3), interstitial between (4,4) and (5,5)
  const vacancyIdx = 2 * gridSize + 3;
  const interstitialPos = {
    x: padding + 4.5 * spacing,
    y: padding + 4.5 * spacing,
  };

  const maxAmp = (temperature / 1000) * 14; // max displacement in SVG px

  useEffect(() => {
    if (!playing) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      return;
    }
    let frameCount = 0;
    const step = () => {
      frameCount++;
      // Pick new random targets every ~30 frames
      if (frameCount % 30 === 0) {
        for (let i = 0; i < gridSize * gridSize; i++) {
          if (i === vacancyIdx) continue;
          const amp = maxAmp;
          targetRef.current[i] = {
            dx: (Math.random() - 0.5) * 2 * amp,
            dy: (Math.random() - 0.5) * 2 * amp,
          };
        }
      }
      // Smoothly interpolate toward targets
      const newOffsets = [];
      for (let i = 0; i < gridSize * gridSize; i++) {
        if (i === vacancyIdx) {
          newOffsets.push({ dx: 0, dy: 0 });
          continue;
        }
        const cur = currentRef.current[i];
        const tgt = targetRef.current[i];
        const lerp = 0.08;
        const nx = cur.dx + (tgt.dx - cur.dx) * lerp;
        const ny = cur.dy + (tgt.dy - cur.dy) * lerp;
        currentRef.current[i] = { dx: nx, dy: ny };
        newOffsets.push({ dx: nx, dy: ny });
      }
      setOffsets(newOffsets);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing, maxAmp]);

  // Reset offsets when temperature changes and not playing
  useEffect(() => {
    if (!playing && temperature === 0) {
      const zero = Array.from({ length: gridSize * gridSize }, () => ({ dx: 0, dy: 0 }));
      setOffsets(zero);
      currentRef.current = zero.map(o => ({ ...o }));
      targetRef.current = zero.map(o => ({ ...o }));
    }
  }, [temperature, playing]);

  const controlStyle = { display: "flex", alignItems: "center", gap: 8, margin: "8px 0", flexWrap: "wrap" };
  const btnStyle = {
    padding: "4px 12px", borderRadius: 4, border: `1px solid var(--border)`,
    background: playing ? G.gold : "var(--bg-main)", color: playing ? "#13151c" : "var(--text-muted)",
    fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", cursor: "pointer", fontWeight: 600,
  };

  return (
    <div style={{ padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 6, margin: "12px 0" }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: "var(--accent)", marginBottom: 8 }}>Thermal Vibration and Point Defects</div>
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} width="100%" style={{ background: G.bg, borderRadius: 4, display: "block", maxWidth: 400 }}>
        <title>Crystal lattice thermal vibration with point defects</title>
        {/* Grid atoms */}
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const row = Math.floor(i / gridSize);
          const col = i % gridSize;
          const cx = padding + col * spacing;
          const cy = padding + row * spacing;
          if (i === vacancyIdx) {
            // Vacancy: dashed circle outline
            return (
              <circle key={`v${i}`} cx={cx} cy={cy} r={atomR}
                fill="none" stroke={G.ax} strokeWidth={1.2} strokeDasharray="4,3" opacity={0.5} />
            );
          }
          const o = offsets[i] || { dx: 0, dy: 0 };
          return (
            <circle key={`a${i}`} cx={cx + o.dx} cy={cy + o.dy} r={atomR}
              fill={G.blue} opacity={0.85} />
          );
        })}
        {/* Interstitial atom */}
        <circle cx={interstitialPos.x + (playing ? (offsets[0]?.dx || 0) * 0.5 : 0)}
          cy={interstitialPos.y + (playing ? (offsets[0]?.dy || 0) * 0.5 : 0)}
          r={atomR * 0.6} fill={G.red} opacity={0.9} />
        {/* Labels */}
        <text x={padding + 3 * spacing} y={padding + 2 * spacing + atomR + 14}
          fill={G.txt} fontSize={9} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">vacancy</text>
        <text x={interstitialPos.x} y={interstitialPos.y + atomR * 0.6 + 14}
          fill={G.red} fontSize={9} fontFamily="'IBM Plex Mono', monospace" textAnchor="middle">interstitial</text>
        {/* Temperature display */}
        <text x={svgSize - 10} y={20} fill={G.gold} fontSize={13} fontWeight="bold"
          fontFamily="'IBM Plex Mono', monospace" textAnchor="end">{temperature} K</text>
      </svg>
      <div style={controlStyle}>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>
          {playing ? "Pause" : "Play"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "'IBM Plex Mono', monospace" }}>T =</span>
        <input type="range" min={0} max={1000} step={10} value={temperature}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); setTemperature(Number(e.target.value)); }}
          style={{ width: 160 }} />
        <span style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, minWidth: 40 }}>{temperature} K</span>
      </div>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "bonding-forces",
    tab: "Interatomic Forces",
    title: "1. Interatomic Forces and Potential Energy",
    subtitle: "Why atoms bond, equilibrium separation, and bond energy",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Why Do Atoms Bond?">
          <P>Atoms bond because the <b>total energy of the bonded system is lower</b> than the energy of the isolated atoms. The system naturally seeks the lowest-energy configuration. At large separations, atoms do not interact. As they approach, attractive forces pull them together, but at very close range, repulsive forces push them apart. The balance of these forces determines the equilibrium bond length.</P>
        </Section>

        <Section title="Interatomic Forces">
          <P>The net force between two atoms is the sum of an attractive component <M>{"F_A"}</M> and a repulsive component <M>{"F_R"}</M>:</P>
          <Eq>{"F_N(r) = F_A(r) + F_R(r)"}</Eq>
          <P><b>Attractive force</b> <M>{"F_A"}</M>: arises from Coulombic attraction (ionic bonds), van der Waals interactions (dipole-dipole, induced dipole), or electron sharing (covalent bonds). This force is negative (pulling atoms together) and dominates at large separations.</P>
          <P><b>Repulsive force</b> <M>{"F_R"}</M>: arises from overlap of electron clouds (Pauli exclusion principle). Electrons in filled inner shells repel strongly at short range. This force is positive and dominates at very small separations.</P>
          <KeyConcept label="Equilibrium Separation r_0">
            At equilibrium, the net force is zero: <M>{"F_N(r_0) = F_A(r_0) + F_R(r_0) = 0"}</M>. The atoms settle at the separation <M>{"r_0"}</M> where attractive and repulsive forces exactly balance. For NaCl, <M>{"r_0 \\approx 0.28"}</M> nm.
          </KeyConcept>
        </Section>

        <Section title="Potential Energy">
          <P>The potential energy <M>{"E(r)"}</M> is related to force by <M>{"F = -dE/dr"}</M>. A common model for the interatomic PE is:</P>
          <Eq>{"E(r) = -\\frac{A}{r} + \\frac{B}{r^m}"}</Eq>
          <P>The first term is the attractive PE (negative, stabilizing) and the second is the repulsive PE (positive, destabilizing). The exponent <M>{"m"}</M> is typically large (6-12 for van der Waals, about 8 for ionic NaCl).</P>
          <InteratomicPotentialEnergy params={gp.interatomicPE} mid="t1" />
          <P>The minimum of the net PE curve occurs at <M>{"r = r_0"}</M>, and the depth of this minimum is the <b>bond energy</b> <M>{"E_{\\text{bond}}"}</M>.</P>
        </Section>

        <Section title="Ionic Bonding Parameters (NaCl)">
          <P>For a single ion pair, the attractive constant <M>{"A"}</M> in the PE expression is the Coulomb constant:</P>
          <Eq>{"A = \\frac{e^2}{4\\pi \\varepsilon_0} \\approx 1.436 \\text{ eV{\\cdot}nm}"}</Eq>
          <P>For the complete crystal lattice, the <b>Madelung constant</b> <M>{"M"}</M> accounts for the sum of all Coulomb interactions beyond the nearest pair. The lattice potential energy per pair becomes:</P>
          <Eq>{"E_{\\text{lattice}}(r) = -\\frac{M \\cdot e^2}{4\\pi \\varepsilon_0 \\, r} + \\frac{B}{r^m}"}</Eq>
          <P>For NaCl, <M>{"M = 1.748"}</M>.</P>
          <KeyConcept label="Madelung Constant">
            The Madelung constant sums the Coulomb contributions from all ions in the crystal: nearest neighbors are attracted, next-nearest repelled, etc. For the NaCl structure, <M>{"M = 1.748"}</M>. The value depends only on the geometry of the crystal, not on the specific ions.
          </KeyConcept>
          <P>The graph above plots the single-pair potential with <M>{"A \\approx 1.436"}</M> eV-nm. With <M>{"m = 8"}</M> and <M>{"r_0 = 0.28"}</M> nm, the bond energy per ion pair is:</P>
          <Eq>{"E_{\\text{bond}} = \\frac{A}{r_0}\\left(1 - \\frac{1}{m}\\right)"}</Eq>
          <P>Substituting values: <M>{"E_{\\text{bond}} = \\frac{1.436}{0.28}\\left(1 - \\frac{1}{8}\\right) \\approx 4.49"}</M> eV per ion pair. The full lattice cohesive energy is larger by a factor related to <M>{"M"}</M>.</P>
        </Section>

        <Section title="Force Curve">
          <P>The force is the negative derivative of the PE: <M>{"F(r) = -dE/dr"}</M>. The force curve crosses zero at <M>{"r_0"}</M>.</P>
          <InteratomicForce params={gp.interatomicForce} mid="t1" />
          <P>For <M>{"r \\lt r_0"}</M>, the net force is repulsive (positive). For <M>{"r \\gt r_0"}</M>, the net force is attractive (negative). This restoring force makes the bond act like a spring near equilibrium.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "bond-types",
    tab: "Bond Types",
    title: "2. Types of Chemical Bonding",
    subtitle: "Covalent, metallic, ionic, van der Waals, and hydrogen bonding",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Covalent Bonding">
          <P><b>Covalent bonds</b> form when atoms share electron pairs. The shared electrons are localized between the two atoms, making the bond <b>directional</b>. Hybridization of atomic orbitals (sp, sp2, sp3) determines the bond geometry.</P>
          <KeyConcept label="Covalent Bond Properties">
            Directional, strong (2-7 eV), determines crystal structure through orbital geometry. Examples: diamond (sp3, tetrahedral), Si, Ge, GaAs. Hardness and high melting points are common.
          </KeyConcept>
        </Section>

        <Section title="Metallic Bonding">
          <P><b>Metallic bonding</b> involves a "sea" of delocalized valence electrons shared by all atoms in the metal. Each atom donates its valence electrons to a common electron cloud. The bond is <b>non-directional</b>.</P>
          <KeyConcept label="Electron Sea Model">
            Positive ion cores sit in a sea of delocalized electrons. The non-directional nature allows atoms to slide past each other, explaining ductility and malleability. The free electrons give high electrical and thermal conductivity.
          </KeyConcept>
        </Section>

        <Section title="Ionic Bonding">
          <P><b>Ionic bonds</b> form by electron transfer from an electropositive atom (metal) to an electronegative atom (nonmetal), creating cation-anion pairs. The bond is the Coulomb attraction between ions.</P>
          <Eq>{"E = -\\frac{e^2}{4\\pi \\varepsilon_0 r}"}</Eq>
          <P>Ionic bonds are non-directional (Coulomb force is spherically symmetric). This gives rise to close-packed structures. NaCl is the archetypal ionic crystal: Na donates one electron to Cl.</P>
          <KeyConcept label="Ionic Bond Properties">
            High melting points (strong Coulomb interaction), electrically insulating as solids (ions locked in place), conductive when molten or dissolved (ions mobile). Brittle: displacing ions brings like charges together, causing fracture.
          </KeyConcept>
        </Section>

        <Section title="Van der Waals Bonding">
          <P><b>Van der Waals bonds</b> (London dispersion forces) arise from temporary fluctuating dipoles that induce dipoles in neighboring atoms. Even neutral, non-polar atoms experience this weak attraction.</P>
          <KeyConcept label="London Dispersion Forces">
            The weakest type of bond (0.01-0.1 eV). Always present but usually masked by stronger bonds. Dominant in noble gas crystals (Ar, Ne) and between polymer chains. Low melting points.
          </KeyConcept>
        </Section>

        <Section title="Hydrogen Bonding">
          <P><b>Hydrogen bonds</b> form when hydrogen is covalently bonded to a highly electronegative atom (O, N, F). The hydrogen becomes a partial positive charge that attracts a lone pair on a neighboring molecule.</P>
          <P>Hydrogen bonding is critical in water (ice structure, anomalous density), biological molecules (DNA base pairing, protein folding), and many polymers. Bond energy is about 0.1-0.5 eV, stronger than van der Waals but weaker than covalent.</P>
        </Section>

        <Section title="Mixed Bonding and Electronegativity">
          <P>Most real bonds have <b>mixed character</b>. The degree of ionic vs. covalent character is determined by the <b>electronegativity difference</b> between the bonding atoms. A large difference (e.g., Na-Cl) means mostly ionic. A small difference (e.g., Si-Si) means covalent.</P>
        </Section>

        <Section title="Comparison of Bond Types">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Covalent</th>
                  <th>Metallic</th>
                  <th>Ionic</th>
                  <th>Van der Waals</th>
                  <th>Hydrogen</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Bond Energy</td>
                  <td>2-7 eV</td>
                  <td>1-5 eV</td>
                  <td>3-8 eV</td>
                  <td>0.01-0.1 eV</td>
                  <td>0.1-0.5 eV</td>
                </tr>
                <tr>
                  <td>Melting Point</td>
                  <td>High</td>
                  <td>Moderate-High</td>
                  <td>High</td>
                  <td>Very Low</td>
                  <td>Low</td>
                </tr>
                <tr>
                  <td>Directional?</td>
                  <td>Yes</td>
                  <td>No</td>
                  <td>No</td>
                  <td>No</td>
                  <td>Yes</td>
                </tr>
                <tr>
                  <td>Conductivity</td>
                  <td>Insulator/Semi</td>
                  <td>Conductor</td>
                  <td>Insulator (solid)</td>
                  <td>Insulator</td>
                  <td>Insulator</td>
                </tr>
                <tr>
                  <td>Examples</td>
                  <td>Diamond, Si</td>
                  <td>Cu, Fe, Al</td>
                  <td>NaCl, MgO</td>
                  <td>Ar, CH4</td>
                  <td>H2O, Ice</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    ),
  },
  {
    id: "crystal-structures",
    tab: "Crystal Structures",
    title: "3. Crystal Structures",
    subtitle: "Lattices, unit cells, Bravais lattices, and diamond structure",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Crystalline vs. Amorphous">
          <P><b>Crystalline</b> materials have long-range periodic order: atoms arranged in a repeating 3D pattern. <b>Amorphous</b> materials (glasses) have only short-range order with no long-range periodicity.</P>
          <KeyConcept label="Crystal = Lattice + Basis">
            A crystal structure is described by a mathematical lattice (set of periodically arranged points) plus a basis (group of atoms associated with each lattice point). The lattice defines the periodicity; the basis defines what is repeated.
          </KeyConcept>
        </Section>

        <Section title="Unit Cells and Lattice Vectors">
          <P>The unit cell is the smallest repeating unit that, when translated by the lattice vectors, fills all of space. It is defined by lattice parameters <M>{"a, b, c"}</M> (lengths) and <M>{"\\alpha, \\beta, \\gamma"}</M> (angles).</P>
          <Eq>{"\\vec{R} = h\\vec{a} + k\\vec{b} + l\\vec{c}"}</Eq>
          <P>where <M>{"h, k, l"}</M> are integers. Any translation by <M>{"\\vec{R}"}</M> maps the lattice onto itself.</P>
          <KeyConcept label="Primitive Unit Cell">
            A primitive unit cell contains exactly one lattice point. It is the smallest possible unit cell. The Wigner-Seitz cell is a special primitive cell constructed by drawing perpendicular bisectors to all nearest-neighbor lattice points and taking the enclosed region.
          </KeyConcept>
        </Section>

        <Section title="2D Bravais Lattices">
          <P>In two dimensions, there are exactly <b>5 Bravais lattice types</b>:</P>
          <ul className="info-list">
            <li><b>Square</b>: a = b, gamma = 90 deg</li>
            <li><b>Rectangular</b>: a != b, gamma = 90 deg</li>
            <li><b>Centered Rectangular</b>: rectangular with extra point at center</li>
            <li><b>Hexagonal</b>: a = b, gamma = 120 deg</li>
            <li><b>Oblique</b>: a != b, gamma != 90 deg (most general)</li>
          </ul>
        </Section>

        <Section title="3D Bravais Lattices: 7 Crystal Systems">
          <P>In three dimensions, there are <b>14 Bravais lattices</b> grouped into <b>7 crystal systems</b>:</P>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Crystal System</th>
                  <th>Lattice Parameters</th>
                  <th>Bravais Types</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Cubic</td><td>a = b = c, all angles 90 deg</td><td>SC, BCC, FCC</td></tr>
                <tr><td>Tetragonal</td><td>a = b != c, all angles 90 deg</td><td>Simple, Body-centered</td></tr>
                <tr><td>Orthorhombic</td><td>a != b != c, all angles 90 deg</td><td>S, Base, Body, Face</td></tr>
                <tr><td>Hexagonal</td><td>a = b != c, gamma = 120 deg</td><td>Simple</td></tr>
                <tr><td>Rhombohedral</td><td>a = b = c, alpha = beta = gamma != 90 deg</td><td>Simple</td></tr>
                <tr><td>Monoclinic</td><td>a != b != c, beta != 90 deg</td><td>Simple, Base</td></tr>
                <tr><td>Triclinic</td><td>a != b != c, all angles differ</td><td>Simple</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Cubic Structures: SC, BCC, FCC">
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Simple Cubic (SC)</h4>
              <figure style={{ textAlign: "center", margin: "8px 0" }}>
                <img src="/images/crystal-sc.png" alt="Simple cubic unit cell with 8 corner atoms" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 6 }} />
              </figure>
              <P>Atoms at cube corners only. Coordination number = 6. Atomic packing fraction (APF) = 0.52. Rare in nature (only Po).</P>
            </div>
            <div className="compare-card">
              <h4>Body-Centered Cubic (BCC)</h4>
              <figure style={{ textAlign: "center", margin: "8px 0" }}>
                <img src="/images/crystal-bcc.png" alt="BCC unit cell with 8 corner atoms and 1 body-center atom" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 6 }} />
              </figure>
              <P>Atoms at corners + 1 atom at body center. Coordination number = 8. APF = 0.68. Examples: Fe (alpha), W, Cr, Mo.</P>
            </div>
            <div className="compare-card">
              <h4>Face-Centered Cubic (FCC)</h4>
              <figure style={{ textAlign: "center", margin: "8px 0" }}>
                <img src="/images/crystal-fcc.png" alt="FCC unit cell with 8 corner atoms and 6 face-center atoms" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 6 }} />
              </figure>
              <P>Atoms at corners + atoms at each face center. Coordination number = 12. APF = 0.74 (close-packed). Examples: Cu, Al, Au, Ag, Ni.</P>
            </div>
            <div className="compare-card">
              <h4>Diamond Structure</h4>
              <figure style={{ textAlign: "center", margin: "8px 0" }}>
                <img src="/images/crystal-diamond.png" alt="Diamond cubic unit cell with corner, face-center, and interior tetrahedral atoms" style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 6 }} />
              </figure>
              <P>FCC lattice with a 2-atom basis: one atom at (0,0,0) and another at (a/4, a/4, a/4). Each atom is tetrahedrally bonded to 4 neighbors. Examples: C (diamond), Si, Ge. Coordination number = 4, APF = 0.34.</P>
            </div>
          </div>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px", marginTop: 12 }}>
            <img src="/images/wiki-diamond-exploded.svg" alt="Decomposition of diamond cubic: two interpenetrating FCC lattices combine into diamond structure, shown as individual tetrahedra (1), assembled unit cell (2), and 3x3x3 lattice (3)" style={{ maxWidth: "100%", maxHeight: 500, borderRadius: 6, background: "white", padding: 8 }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Diamond cubic decomposition: (1) individual tetrahedral building blocks from two offset FCC sub-lattices, (2) assembled unit cell, (3) extended 3x3x3 lattice. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0, Cmglee</span></figcaption>
          </figure>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
            {[
              { src: "/images/wiki-sc.svg", label: "SC", alt: "Simple cubic ball-and-stick schematic with lattice parameter a labeled" },
              { src: "/images/wiki-bcc.svg", label: "BCC", alt: "BCC ball-and-stick schematic with lattice parameter a labeled" },
              { src: "/images/wiki-fcc.svg", label: "FCC", alt: "FCC ball-and-stick schematic with lattice parameter a labeled" },
            ].map(({ src, label, alt }) => (
              <figure key={label} style={{ textAlign: "center", flex: "1 1 140px", maxWidth: 200 }}>
                <img src={src} alt={alt} style={{ width: "100%", borderRadius: 6, background: "white", padding: 8 }} />
                <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 4 }}>{label}</figcaption>
              </figure>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: 10, color: G.txt, opacity: 0.5, marginTop: 4, fontFamily: "'IBM Plex Mono'" }}>Schematic ball-and-stick models with lattice parameter a. Source: Wikimedia Commons, CC BY-SA 3.0</div>
        </Section>

        <Section title="Atom Sharing Between Unit Cells">
          <P>Atoms at corners, faces, and edges of a unit cell are shared with neighboring cells. Understanding this sharing is essential for counting atoms per unit cell correctly.</P>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", margin: "12px 0" }}>
            <figure style={{ textAlign: "center", flex: "1 1 280px", maxWidth: 400 }}>
              <img src="/images/sharing-corner.png" alt="8 unit cells sharing a single corner atom, each getting 1/8" style={{ width: "100%", borderRadius: 6, border: `1px solid ${G.ax}` }} />
              <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 6 }}>A corner atom sits where 8 unit cells meet. Each cell claims 1/8 of the atom.</figcaption>
            </figure>
            <figure style={{ textAlign: "center", flex: "1 1 280px", maxWidth: 400 }}>
              <img src="/images/sharing-face.png" alt="2 unit cells sharing a face atom, each getting 1/2" style={{ width: "100%", borderRadius: 6, border: `1px solid ${G.ax}` }} />
              <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 6 }}>A face atom is shared by 2 adjacent cells. Each cell claims 1/2 of the atom.</figcaption>
            </figure>
          </div>
          <figure style={{ textAlign: "center", margin: "16px 0" }}>
            <img src="/images/sharing-summary.png" alt="Side-by-side atom counting for SC, BCC, and FCC unit cells" style={{ maxWidth: "100%", borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 6 }}>Atom counting summary: corner atoms contribute 1/8 each, face atoms 1/2 each, body-center atoms 1 each.</figcaption>
          </figure>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px", marginTop: 12 }}>
            <img src="/images/wiki-fcc-counting.png" alt="Space-filling model of FCC unit cell showing corner atoms cut to 1/8 and face atoms cut to 1/2" style={{ maxWidth: "100%", maxHeight: 380, borderRadius: 6, background: "white", padding: 8 }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>FCC space-filling model: corner atoms (1/8 each) and face atoms (1/2 each) are physically cut at the unit cell boundary, showing exactly how much of each atom belongs to one cell. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0, Cdang</span></figcaption>
          </figure>
        </Section>

        <Section title="Atomic Packing Fraction">
          <Eq>{"\\text{APF} = \\frac{\\text{Volume of atoms in unit cell}}{\\text{Volume of unit cell}}"}</Eq>
          <P>For FCC: 4 atoms per unit cell, atom radius <M>{"r = a\\sqrt{2}/4"}</M>, so APF = 0.74. For BCC: 2 atoms, <M>{"r = a\\sqrt{3}/4"}</M>, APF = 0.68. For SC: 1 atom, <M>{"r = a/2"}</M>, APF = 0.52.</P>
        </Section>

        <Section title="Interactive Structure Comparison">
          <P>Select a structure to see its atom count, coordination number, packing fraction, and how atoms are shared between unit cells:</P>
          <CrystalStructureCompare />
        </Section>

        <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
          <img src="/images/nacl-unit-cell.png" alt="Ball-and-stick model of NaCl unit cell showing alternating sodium and chlorine ions in a face-centered cubic arrangement" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
          <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>NaCl (rock salt) unit cell: alternating Na+ and Cl- ions in an FCC arrangement with coordination number 6. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, Public Domain</span></figcaption>
        </figure>
      </div>
    ),
  },
  {
    id: "miller-indices",
    tab: "Miller Indices",
    title: "4. Miller Indices and X-Ray Diffraction",
    subtitle: "Crystal planes, directions, and Bragg's law",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Crystal Directions">
          <P>A crystal direction is denoted <M>{"[uvw]"}</M>, representing the direction <M>{"u\\vec{a} + v\\vec{b} + w\\vec{c}"}</M>. Indices are reduced to the smallest integer set. Negative indices use an overbar: <M>{"[\\bar{1}10]"}</M>.</P>
          <P>A family of equivalent directions (related by crystal symmetry) is denoted <M>{"\\langle uvw \\rangle"}</M>. For example, in a cubic crystal, <M>{"\\langle 100 \\rangle"}</M> includes <M>{"[100]"}</M>, <M>{"[010]"}</M>, <M>{"[001]"}</M>, and their negatives.</P>
        </Section>

        <Section title="Crystal Planes (Miller Indices)">
          <P>To find the Miller indices <M>{"(hkl)"}</M> of a plane:</P>
          <ul className="info-list">
            <li>Find the plane's intercepts with the axes in units of a, b, c</li>
            <li>Take reciprocals of the intercepts</li>
            <li>Reduce to smallest integers</li>
          </ul>
          <P>A family of equivalent planes is denoted <M>{"\\{hkl\\}"}</M>. A plane parallel to an axis has that index = 0 (intercept at infinity, reciprocal = 0).</P>
          <KeyConcept label="Examples of Important Planes">
            (100): intercepts (1, inf, inf). Cuts x-axis at a. (110): intercepts (1,1,inf). Diagonal plane. (111): intercepts (1,1,1). Body diagonal plane. For cubic crystals, (111) planes are the most densely packed in FCC.
          </KeyConcept>
        </Section>

        <Section title="Interplanar Spacing">
          <P>For cubic crystals, the distance between adjacent (hkl) planes is:</P>
          <Eq>{"d_{hkl} = \\frac{a}{\\sqrt{h^2 + k^2 + l^2}}"}</Eq>
          <P>where <M>{"a"}</M> is the lattice parameter (cube edge length). Higher-index planes have smaller spacing.</P>
        </Section>

        <Section title="Bragg's Diffraction Law">
          <P>When X-rays of wavelength <M>{"\\lambda"}</M> strike crystal planes at angle <M>{"\\theta"}</M>, constructive interference occurs when:</P>
          <Eq>{"2d\\sin\\theta = n\\lambda"}</Eq>
          <P>where <M>{"n"}</M> is an integer (order of diffraction) and <M>{"d"}</M> is the interplanar spacing. This is <b>Bragg's law</b>, the basis for X-ray diffraction (XRD) structure determination.</P>
          <KeyConcept label="X-Ray Diffraction">
            XRD is the primary experimental technique for determining crystal structure. A monochromatic X-ray beam diffracts from crystal planes. By measuring diffraction angles, we determine d-spacings and hence the crystal structure and lattice parameter.
          </KeyConcept>
          <BraggDiffractionAnimation />
        </Section>

        <Section title="Bragg's Law Calculator">
          <P>Enter a lattice parameter, Miller indices, and X-ray wavelength to compute the diffraction angle. Try changing (hkl) to see how higher-index planes give larger diffraction angles (smaller d-spacing).</P>
          <BraggCalculator />
        </Section>

        <Section title="Systematic Absences">
          <P>Not all (hkl) reflections appear for every crystal structure. Selection rules arise from the multi-atom basis:</P>
          <ul className="info-list">
            <li><b>BCC</b>: reflections only when h + k + l = even</li>
            <li><b>FCC</b>: reflections only when h, k, l are all odd or all even</li>
            <li><b>SC</b>: all (hkl) reflections allowed</li>
          </ul>
          <P>These systematic absences help distinguish BCC from FCC from SC structures experimentally.</P>
        </Section>

        <Section title="Powder Diffraction">
          <P>In <b>powder diffraction</b>, a polycrystalline sample (many small randomly oriented crystallites) is exposed to monochromatic X-rays. Because all orientations are present, each set of (hkl) planes produces a cone of diffracted beams, forming rings on a detector. The angular positions of these rings give the d-spacings, identifying the crystal structure.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "defects",
    tab: "Crystal Defects",
    title: "5. Crystal Defects",
    subtitle: "Point, line, and planar defects and their effects",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Why Defects Matter">
          <P>No real crystal is perfect. Defects profoundly affect mechanical, electrical, optical, and thermal properties. Semiconductor devices would not function without carefully controlled defects (dopants). Understanding defects is essential for materials engineering.</P>
        </Section>

        <Section title="Point Defects">
          <P>Point defects are localized disruptions at individual lattice sites:</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Vacancy</h4>
              <P>A missing atom from a lattice site. The equilibrium concentration follows:</P>
              <Eq>{"n_v = N \\exp\\!\\left(-\\frac{E_v}{k_B T}\\right)"}</Eq>
              <P>where <M>{"E_v"}</M> is the vacancy formation energy, <M>{"k_B"}</M> is Boltzmann's constant, and <M>{"T"}</M> is temperature.</P>
            </div>
            <div className="compare-card">
              <h4>Interstitial</h4>
              <P>An extra atom squeezed into a non-lattice site between normal atoms. Can be a self-interstitial (same species) or a foreign interstitial (different species, e.g., small atoms like C in Fe).</P>
            </div>
            <div className="compare-card">
              <h4>Substitutional Impurity</h4>
              <P>A foreign atom occupying a regular lattice site, replacing the host atom. Size similarity (within ~15%) favors substitution (Hume-Rothery rules).</P>
            </div>
            <div className="compare-card">
              <h4>Frenkel and Schottky Defects</h4>
              <P><b>Frenkel defect</b>: an ion displaced from its site to a nearby interstitial position, creating a vacancy-interstitial pair. <b>Schottky defect</b> (ionic crystals): a cation vacancy + anion vacancy pair, maintaining charge neutrality.</P>
            </div>
          </div>
        </Section>

        <Section title="Line Defects (Dislocations)">
          <P>Dislocations are one-dimensional defects that run through the crystal. They are responsible for plastic deformation occurring at stresses far below the theoretical shear strength.</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Edge Dislocation</h4>
              <P>An extra half-plane of atoms inserted into the crystal. The dislocation line runs along the edge of this half-plane. The <b>Burgers vector</b> <M>{"\\vec{b}"}</M> is perpendicular to the dislocation line.</P>
            </div>
            <div className="compare-card">
              <h4>Screw Dislocation</h4>
              <P>Atoms are displaced in a helical pattern around the dislocation line. The <b>Burgers vector</b> <M>{"\\vec{b}"}</M> is parallel to the dislocation line.</P>
            </div>
          </div>
          <KeyConcept label="Burgers Vector">
            The Burgers vector <M>{"\\vec{b}"}</M> characterizes the magnitude and direction of lattice distortion caused by a dislocation. Construct a Burgers circuit: trace a closed loop in a perfect crystal, then trace the same path around the dislocation. The closure failure is the Burgers vector.
          </KeyConcept>

          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src="/images/tem-dislocations.jpg" alt="Transmission electron microscopy micrograph showing dislocations and precipitates in austenitic stainless steel" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>TEM micrograph of dislocations and precipitates in stainless steel. Line defects appear as dark curved lines. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 2.5</span></figcaption>
          </figure>
        </Section>

        <Section title="Planar Defects">
          <P>Planar defects are two-dimensional boundaries within the crystal:</P>
          <ul className="info-list">
            <li><b>Grain boundaries</b>: interfaces between crystallites (grains) with different orientations in a polycrystalline material. Impede dislocation motion, strengthening the material (Hall-Petch effect).</li>
            <li><b>Twin boundaries</b>: a mirror-reflection relationship between the crystal on each side. Atoms on one side are mirror images of the other.</li>
            <li><b>Stacking faults</b>: errors in the layer stacking sequence. For FCC (normal: ABCABC...), a fault might be ABCBCABC... (missing A layer) or ABCBAB... (wrong order).</li>
          </ul>
        </Section>

        <Section title="Surface Defects and Properties">
          <P>The surface of a crystal is itself a planar defect: atoms at the surface have fewer neighbors and unsatisfied ("dangling") bonds. This gives rise to surface energy, surface reconstruction, and enhanced chemical reactivity at surfaces.</P>
        </Section>

        <Section title="Stoichiometry and Nonstoichiometric Compounds">
          <P>A <b>stoichiometric</b> compound has the exact ratio of atoms given by its chemical formula (e.g., NaCl is exactly 1:1). <b>Nonstoichiometric</b> compounds deviate from exact ratios due to defects.</P>
          <P>Example: iron oxide can be <M>{"\\text{Fe}_{1-x}\\text{O}"}</M> where <M>{"x \\approx 0.05"}</M>, meaning some Fe sites are vacant. Charge neutrality is maintained by some Fe ions being Fe3+ instead of Fe2+.</P>
        </Section>

        <Section title="Effects of Defects on Properties">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Effect of Defects</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Mechanical Strength</td><td>Dislocations enable plastic deformation; grain boundaries impede dislocation motion (strengthening)</td></tr>
                <tr><td>Electrical Conductivity</td><td>Substitutional dopants (B, P in Si) create carriers; vacancies scatter electrons</td></tr>
                <tr><td>Diffusion</td><td>Vacancies provide pathways for atomic diffusion; rate increases with vacancy concentration</td></tr>
                <tr><td>Optical Properties</td><td>Color centers (trapped electrons at vacancies) give color to otherwise transparent crystals</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Thermal Vibrations and Point Defects Visualization">
          <P>This animation shows a 2D square lattice where atoms vibrate around their equilibrium positions. Adjust the temperature to see how vibration amplitude increases. Note the vacancy (dashed outline) and interstitial (small red atom) defects.</P>
          <ThermalVibrationAnimation />
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
        <Section title="1. Interatomic Potential Energy (NaCl)">
          <InteratomicPotentialEnergy params={gp.interatomicPE} mid="gp1" />
        </Section>
        <Section title="2. Interatomic Force F(r)">
          <InteratomicForce params={gp.interatomicForce} mid="gp2" />
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
  const [model, setModel] = useState(MODELS[0].model);
  const [effort, setEffort] = useState("medium");
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

  const toggleExpand = useCallback(() => {
    setChatSize(null);
    setExpanded(e => !e);
  }, []);

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
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/bonding_crystals.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep thread responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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

      const reqBody = {
        sessionId: tab.sessionId,
        message: messageText,
        model: model,
        effort: effort,
      };
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/bonding_crystals.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/bonding_crystals.jsx now.`;
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
                      Chat #{s.chatNum} ({s.messageCount} msgs) {s.isolated ? "ISO" : "MEM"}
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
                {sessionStatus === "ready" && "Session active. Ask about bonding, crystal structures, or defects. Click or highlight content to attach as context."}
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
          <h1>Bonding, Crystal Structures, and Defects</h1>
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
