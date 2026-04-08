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
  "free-electron": `Topic: Free Electron Model. Students have already learned Fermi-Dirac statistics and density of states in the Band Theory unit. This section builds on that foundation. Covers: electrons in metal treated as free particles with E = p^2/(2m_e), Fermi sphere in momentum space, only electrons near E_F contribute to conduction. New concepts: Fermi velocity v_F = sqrt(2E_F/m_e) (typically ~10^6 m/s for metals), mean free path l = v_F * tau. Visual diagram shows Fermi sphere shift under applied electric field (sphere shifts in -k direction, opposite to E), producing asymmetric momentum distribution and net drift current.`,
  "drude-model": `Topic: Drude Model and Conductivity. Covers: classical Drude model derivation. Drift velocity v_{dx} = (eE_x/m_e)*tau = mu*E_x. Electron mobility mu = e*tau/m_e. Current density J_x = en*v_{dx} = sigma*E_x. Conductivity sigma = ne^2*tau/m_e = ne*mu. Ohm's law: I = V/R, R = rho*L/A. Band model approach: sigma = (1/3)*e^2*v_F^2*tau*g(E_F) gives same result. Mean free time tau ~ 10^{-14} s for Cu at 300K. Resistivity rho = 1/sigma.`,
  "contacts": `Topic: Metal-Metal Contacts. Covers: work function Phi (energy from Fermi level to vacuum), contact potential between two metals. Example: Pt (Phi=5.36 eV) and Mo (Phi=4.20 eV). Contact potential Delta_V = (Phi_1 - Phi_2)/e = 1.16 V. Electrons flow from lower work function to higher until Fermi levels align. No net current flows in a closed circuit of two metals despite contact potential at each junction (contact potentials oppose each other).`,
  "seebeck": `Topic: Seebeck Effect and Thermocouples. Covers: temperature gradient causes electron diffusion from hot to cold end, creating voltage. Seebeck coefficient S = dV/dT (units: uV/K). Two contributions: (1) electron diffusion (positive S, dominates at high T), (2) phonon drag (negative contribution at low T for some metals). Cu: S = +1.94 uV/K at 27C, with S = aT + b/T (a=5.8e-3 uV/K^2, b=76.4 uV). Al: S = -1.7 uV/K. Thermocouple voltage V_{AB} = integral(S_A - S_B)dT from T_0 to T.`,
  "em-waves": `Topic: EM Waves in Media. Covers: Maxwell's equations (4 equations: Gauss, Gauss for B, Faraday, Ampere), wave equation in vacuum: nabla^2 E - (1/c_0^2)(d^2E/dt^2) = 0 where c_0 = 1/sqrt(eps_0*mu_0) = 3e8 m/s. In dielectric: phase velocity v = c_0/n where refractive index n = sqrt(eps_r). Polarization P = chi*eps_0*E, eps_r = 1 + chi. D = eps_0*E + P. Wave equation in dielectric: nabla^2 E - (1/c^2)(d^2E/dt^2) = 0 with c = c_0/n.`,
  "fresnel": `Topic: Dispersion and Fresnel Equations. Covers: refractive index varies with wavelength (dispersion). Sellmeier equation: n^2(lambda) = 1 + sum(B_i*lambda^2/(lambda^2 - C_i)) with typically 3 terms. Materials available: BK7 glass, fused silica, diamond, water, sapphire. Group velocity v_g = c/N_g where N_g = n - lambda*(dn/dlambda). Fresnel equations for s and p polarization: R_s = ((n_1*cos(theta_i) - n_2*cos(theta_t))/(n_1*cos(theta_i) + n_2*cos(theta_t)))^2, R_p = ((n_2*cos(theta_i) - n_1*cos(theta_t))/(n_2*cos(theta_i) + n_1*cos(theta_t)))^2. Interactive graph with adjustable n1, n2 and s/p polarization toggles. Brewster angle: tan(theta_B) = n_2/n_1. Normal incidence reflectance: R(0) = ((n1-n2)/(n1+n2))^2. Total internal reflection when theta_i > theta_c = arcsin(n_2/n_1). Snell's law: n_1*sin(theta_i) = n_2*sin(theta_t).`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo, Winter 2026. This unit spans Lectures 12-14, covering metallic conduction (free electron model, Drude model, band model), metal contacts and the Seebeck effect, and optical properties of materials (EM waves, refractive index, dispersion, Fresnel equations). The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

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
  seebeckCoeff: { showDiffusion: true, showPhononDrag: true },
  refractiveIndex: { material: "bk7", B1: 1.03961212, C1: 0.00600069867, B2: 0.231792344, C2: 0.0200179144, B3: 1.01046945, C3: 103.560653 },
  fresnelReflection: { n1: 1.0, n2: 1.5, showBrewster: true, showRs: true, showRp: true },
};

const SELLMEIER_MATERIALS = {
  bk7:     { label: "BK7 Glass",     B1: 1.03961212, C1: 0.00600069867, B2: 0.231792344, C2: 0.0200179144, B3: 1.01046945, C3: 103.560653 },
  fused:   { label: "Fused Silica",  B1: 0.6961663,  C1: 0.0046791,    B2: 0.4079426,  C2: 0.0135121,    B3: 0.8974794,  C3: 97.934 },
  diamond: { label: "Diamond",       B1: 4.3356,     C1: 0.01060,      B2: 0.3306,     C2: 0.01750,      B3: 0.0,        C3: 1.0 },
  water:   { label: "Water (25C)",   B1: 0.75831,    C1: 0.01007,      B2: 0.08495,    C2: 8.91377,      B3: 0.0,        C3: 1.0 },
  sapphire:{ label: "Sapphire",      B1: 1.4313493,  C1: 0.0052799261, B2: 0.65054713, C2: 0.0142382647, B3: 5.3414021,  C3: 325.01783 },
};

// ─── Graph Components ───

function SeebeckCoefficient({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.seebeckCoeff, ...params };
  const w = 480, h = 280, ox = 55, oy = 220, xEnd = 450, yTop = 25;
  const Tmax = 700, Smin = 0, Smax = 5;
  const scaleX = (xEnd - ox) / Tmax;
  const scaleY = (oy - yTop) / (Smax - Smin);
  const toX = (T) => ox + T * scaleX;
  const toY = (S) => oy - (S - Smin) * scaleY;

  // Cu Seebeck: S = aT + b/T with phonon drag dip at low T
  const a = 5.8e-3; // uV/K^2
  const b = 76.4;   // uV
  const computeS = (T) => {
    if (T < 5) return 0;
    const diffusion = a * T;
    const phononDrag = b / T;
    return diffusion + phononDrag;
  };

  // Build copper diffusion-only curve (linear portion: S ~ aT)
  let diffPath = "";
  for (let T = 70; T <= Tmax; T += 2) {
    const S = a * T;
    const x = toX(T), y = toY(S);
    diffPath += (T === 70 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
  }

  // Build full copper curve including phonon drag
  let fullPath = "";
  for (let T = 70; T <= Tmax; T += 2) {
    const S = computeS(T);
    const x = toX(T), y = toY(S);
    fullPath += (T === 70 ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Seebeck coefficient versus temperature for copper</title>
        <defs>
          <marker id={`ah-seeb${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Seebeck Coefficient vs Temperature (Copper)</text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={xEnd + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-seeb${mid})`}/>
        <line x1={ox} y1={oy + 10} x2={ox} y2={yTop - 5} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-seeb${mid})`}/>
        {/* X ticks */}
        {[100, 200, 300, 400, 500, 600, 700].map(T => (
          <g key={T}>
            <line x1={toX(T)} y1={oy} x2={toX(T)} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={toX(T)} y={oy + 15} fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{T}</text>
          </g>
        ))}
        {/* Y ticks */}
        {[0, 1, 2, 3, 4, 5].map(S => (
          <g key={S}>
            <line x1={ox - 4} y1={toY(S)} x2={ox} y2={toY(S)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={toY(S) + 3} fill={G.txt} fontSize="9" textAnchor="end" fontFamily="'IBM Plex Mono'">{S}</text>
          </g>
        ))}
        {/* Axis labels */}
        <text x={xEnd + 5} y={oy + 25} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">T (K)</text>
        <text x={12} y={yTop - 2} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">S (uV/K)</text>
        {/* Curves */}
        {p.showDiffusion && <path d={diffPath} fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="6,3"/>}
        {p.showPhononDrag && <path d={fullPath} fill="none" stroke={G.gold} strokeWidth="2"/>}
        {/* Region labels */}
        {p.showPhononDrag && <text x={toX(80)} y={toY(computeS(80)) - 8} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Phonon drag</text>}
        {p.showDiffusion && <text x={toX(550)} y={toY(a * 550) - 8} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Diffusion only</text>}
        {p.showPhononDrag && <text x={toX(500)} y={toY(computeS(500)) + 14} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Full (Cu)</text>}
        {/* Room temp marker */}
        <line x1={toX(300)} y1={oy} x2={toX(300)} y2={toY(computeS(300))} stroke={G.grn} strokeWidth="0.8" strokeDasharray="3,3"/>
        <circle cx={toX(300)} cy={toY(computeS(300))} r="2.5" fill={G.grn}/>
        <text x={toX(300) + 4} y={toY(computeS(300)) - 5} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'">300K: {computeS(300).toFixed(1)} uV/K (fit)</text>
      </svg>
    </div>
  );
}

function RefractiveIndexDispersion({ params, mid = "", interactive = false }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.refractiveIndex, ...params };
  const [selMat, setSelMat] = useState(p.material || "bk7");
  const mat = interactive ? (SELLMEIER_MATERIALS[selMat] || SELLMEIER_MATERIALS.bk7) : p;

  const w = 480, h = 280, ox = 55, oy = 230, xEnd = 450, yTop = 25;
  const lamMin = 200, lamMax = 2000;

  // Auto-scale n range based on material
  const sellmeier = (lamNm, m) => {
    const lam = lamNm / 1000;
    const lam2 = lam * lam;
    const n2 = 1 + (m.B1 * lam2 / (lam2 - m.C1)) + (m.B2 * lam2 / (lam2 - m.C2)) + ((m.B3 || 0) * lam2 / (lam2 - (m.C3 || 1)));
    return n2 > 0 ? Math.sqrt(n2) : 1;
  };

  // Compute n range for current material
  const nSamples = [];
  for (let lam = 300; lam <= 1800; lam += 50) {
    const n = sellmeier(lam, mat);
    if (n > 1 && n < 5) nSamples.push(n);
  }
  const nDataMin = nSamples.length > 0 ? Math.min(...nSamples) : 1.3;
  const nDataMax = nSamples.length > 0 ? Math.max(...nSamples) : 1.8;
  const nPad = Math.max(0.05, (nDataMax - nDataMin) * 0.15);
  const nMin = Math.floor((nDataMin - nPad) * 10) / 10;
  const nMax = Math.ceil((nDataMax + nPad) * 10) / 10;

  const scaleX = (xEnd - ox) / (lamMax - lamMin);
  const scaleY = (oy - yTop) / (nMax - nMin);
  const toX = (lam) => ox + (lam - lamMin) * scaleX;
  const toY = (n) => oy - (n - nMin) * scaleY;

  const sellCurve = (lamNm) => sellmeier(lamNm, mat);

  let curvePath = "";
  let first = true;
  for (let lam = lamMin; lam <= lamMax; lam += 5) {
    const n = sellCurve(lam);
    if (n < nMin || n > nMax + 0.1) continue;
    const x = toX(lam), y = toY(Math.min(n, nMax));
    curvePath += (first ? "M" : " L") + x.toFixed(1) + "," + y.toFixed(1);
    first = false;
  }

  // Compute n at 589nm (sodium D line) for reference
  const nD = sellCurve(589);

  // Build Y ticks dynamically
  const yTickStep = nMax - nMin > 0.5 ? 0.2 : 0.1;
  const yTicks = [];
  for (let v = Math.ceil(nMin / yTickStep) * yTickStep; v <= nMax; v += yTickStep) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  const matLabel = interactive ? (SELLMEIER_MATERIALS[selMat]?.label || selMat) : "Sellmeier fit";

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      {interactive && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: G.txt, fontFamily: "'IBM Plex Mono'" }}>Material:</span>
          {Object.entries(SELLMEIER_MATERIALS).map(([key, m]) => (
            <button key={key} onClick={() => setSelMat(key)} style={{
              padding: "3px 8px", border: `1px solid ${key === selMat ? G.gold : G.ax}`, borderRadius: 4,
              background: key === selMat ? G.gold : "transparent", color: key === selMat ? G.bg : G.txt,
              fontSize: 10, fontFamily: "'IBM Plex Mono'", cursor: "pointer", fontWeight: key === selMat ? 600 : 400,
            }}>{m.label}</button>
          ))}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Refractive index dispersion from Sellmeier equation</title>
        <defs>
          <marker id={`ah-ri${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">{`Refractive Index vs Wavelength (${matLabel})`}</text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={xEnd + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-ri${mid})`}/>
        <line x1={ox} y1={oy + 5} x2={ox} y2={yTop - 5} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-ri${mid})`}/>
        {/* X ticks */}
        {[400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000].map(lam => (
          <g key={lam}>
            <line x1={toX(lam)} y1={oy} x2={toX(lam)} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={toX(lam)} y={oy + 15} fill={G.txt} fontSize="8" textAnchor="middle" fontFamily="'IBM Plex Mono'">{lam}</text>
          </g>
        ))}
        {/* Y ticks */}
        {yTicks.map(n => (
          <g key={n}>
            <line x1={ox - 4} y1={toY(n)} x2={ox} y2={toY(n)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={toY(n) + 3} fill={G.txt} fontSize="9" textAnchor="end" fontFamily="'IBM Plex Mono'">{n.toFixed(n >= 10 ? 1 : 2)}</text>
          </g>
        ))}
        {/* Axis labels */}
        <text x={xEnd + 5} y={oy + 25} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">{"\u03BB (nm)"}</text>
        <text x={12} y={yTop - 2} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">n</text>
        {/* Curve */}
        <path d={curvePath} fill="none" stroke={G.gold} strokeWidth="2"/>
        {/* Visible spectrum shading */}
        <rect x={toX(380)} y={yTop} width={toX(750) - toX(380)} height={oy - yTop} fill={G.blue} opacity="0.04"/>
        <text x={(toX(380) + toX(750)) / 2} y={yTop + 12} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">Visible</text>
        {/* Sodium D-line reference */}
        {nD >= nMin && nD <= nMax && (
          <>
            <line x1={toX(589)} y1={oy} x2={toX(589)} y2={toY(nD)} stroke={G.grn} strokeWidth="0.8" strokeDasharray="3,3"/>
            <circle cx={toX(589)} cy={toY(nD)} r="2.5" fill={G.grn}/>
            <text x={toX(589) + 5} y={toY(nD) - 5} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'">n_D={nD.toFixed(3)}</text>
          </>
        )}
        {/* Label */}
        <text x={toX(1400)} y={toY(sellCurve(1400)) - 10} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{matLabel}</text>
      </svg>
    </div>
  );
}

function FresnelReflection({ params, mid = "", interactive = false }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.fresnelReflection, ...params };
  const [localN1, setLocalN1] = useState(p.n1);
  const [localN2, setLocalN2] = useState(p.n2);
  const [showRs, setShowRs] = useState(p.showRs !== false);
  const [showRp, setShowRp] = useState(p.showRp !== false);

  const n1 = interactive ? localN1 : p.n1;
  const n2 = interactive ? localN2 : p.n2;

  const w = 480, h = 280, ox = 55, oy = 240, xEnd = 450, yTop = 25;
  const thetaMax = 90;
  const scaleX = (xEnd - ox) / thetaMax;
  const scaleY = (oy - yTop) / 1.0;
  const toX = (deg) => ox + deg * scaleX;
  const toY = (R) => oy - R * scaleY;
  const toRad = (deg) => deg * Math.PI / 180;

  const brewsterDeg = Math.atan(n2 / n1) * 180 / Math.PI;
  const hasTIR = n1 > n2;
  const criticalDeg = hasTIR ? Math.asin(n2 / n1) * 180 / Math.PI : 90;

  // Normal incidence reflectance
  const R0 = Math.pow((n1 - n2) / (n1 + n2), 2);

  // Build Rs and Rp paths
  let rsPath = "", rpPath = "";
  for (let deg = 0; deg <= thetaMax; deg += 0.5) {
    const thetaI = toRad(deg);
    const sinThetaT = (n1 / n2) * Math.sin(thetaI);
    let Rs, Rp;
    if (Math.abs(sinThetaT) >= 1) {
      Rs = 1; Rp = 1;
    } else {
      const cosThetaI = Math.cos(thetaI);
      const cosThetaT = Math.sqrt(1 - sinThetaT * sinThetaT);
      const rs = (n1 * cosThetaI - n2 * cosThetaT) / (n1 * cosThetaI + n2 * cosThetaT);
      const rp = (n2 * cosThetaI - n1 * cosThetaT) / (n2 * cosThetaI + n1 * cosThetaT);
      Rs = rs * rs;
      Rp = rp * rp;
    }
    const x = toX(deg);
    rsPath += (deg === 0 ? "M" : " L") + x.toFixed(1) + "," + toY(Math.min(Rs, 1)).toFixed(1);
    rpPath += (deg === 0 ? "M" : " L") + x.toFixed(1) + "," + toY(Math.min(Rp, 1)).toFixed(1);
  }

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      {interactive && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontSize: 11, color: G.txt, fontFamily: "'IBM Plex Mono'", display: "flex", alignItems: "center", gap: 4 }}>
            n1: <input type="range" min="1.0" max="2.5" step="0.05" value={localN1} onChange={e => setLocalN1(parseFloat(e.target.value))} style={{ width: 80 }} />
            <span style={{ width: 32, textAlign: "right" }}>{localN1.toFixed(2)}</span>
          </label>
          <label style={{ fontSize: 11, color: G.txt, fontFamily: "'IBM Plex Mono'", display: "flex", alignItems: "center", gap: 4 }}>
            n2: <input type="range" min="1.0" max="2.5" step="0.05" value={localN2} onChange={e => setLocalN2(parseFloat(e.target.value))} style={{ width: 80 }} />
            <span style={{ width: 32, textAlign: "right" }}>{localN2.toFixed(2)}</span>
          </label>
          <button onClick={() => setShowRs(v => !v)} style={{
            padding: "2px 8px", border: `1px solid ${showRs ? G.blue : G.ax}`, borderRadius: 4,
            background: showRs ? G.blue : "transparent", color: showRs ? G.bg : G.txt,
            fontSize: 10, fontFamily: "'IBM Plex Mono'", cursor: "pointer",
          }}>Rs</button>
          <button onClick={() => setShowRp(v => !v)} style={{
            padding: "2px 8px", border: `1px solid ${showRp ? G.red : G.ax}`, borderRadius: 4,
            background: showRp ? G.red : "transparent", color: showRp ? G.bg : G.txt,
            fontSize: 10, fontFamily: "'IBM Plex Mono'", cursor: "pointer",
          }}>Rp</button>
          <span style={{ fontSize: 10, color: G.grn, fontFamily: "'IBM Plex Mono'" }}>
            {`R(0)=${(R0 * 100).toFixed(1)}%`}
            {!hasTIR && ` | \u03B8_B=${brewsterDeg.toFixed(1)}\u00B0`}
            {hasTIR && ` | \u03B8_c=${criticalDeg.toFixed(1)}\u00B0`}
          </span>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Fresnel reflection coefficients versus angle of incidence</title>
        <defs>
          <marker id={`ah-fres${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {`Fresnel Reflection (n\u2081=${n1.toFixed(2)}, n\u2082=${n2.toFixed(2)})`}
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={xEnd + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-fres${mid})`}/>
        <line x1={ox} y1={oy + 5} x2={ox} y2={yTop - 5} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-fres${mid})`}/>
        {/* X ticks */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map(deg => (
          <g key={deg}>
            <line x1={toX(deg)} y1={oy} x2={toX(deg)} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={toX(deg)} y={oy + 15} fill={G.txt} fontSize="8" textAnchor="middle" fontFamily="'IBM Plex Mono'">{deg}</text>
          </g>
        ))}
        {/* Y ticks */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(R => (
          <g key={R}>
            <line x1={ox - 4} y1={toY(R)} x2={ox} y2={toY(R)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={toY(R) + 3} fill={G.txt} fontSize="9" textAnchor="end" fontFamily="'IBM Plex Mono'">{R.toFixed(1)}</text>
          </g>
        ))}
        {/* Axis labels */}
        <text x={xEnd + 5} y={oy + 25} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">{"\u03B8_i (deg)"}</text>
        <text x={12} y={yTop - 2} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'">R</text>
        {/* Curves */}
        {showRs && <path d={rsPath} fill="none" stroke={G.blue} strokeWidth="2"/>}
        {showRp && <path d={rpPath} fill="none" stroke={G.red} strokeWidth="2"/>}
        {/* Brewster angle marker */}
        {p.showBrewster && !hasTIR && showRp && (
          <>
            <line x1={toX(brewsterDeg)} y1={oy} x2={toX(brewsterDeg)} y2={yTop + 10} stroke={G.grn} strokeWidth="1" strokeDasharray="4,3"/>
            <circle cx={toX(brewsterDeg)} cy={toY(0)} r="3" fill={G.grn}/>
            <text x={toX(brewsterDeg) + 4} y={yTop + 20} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">
              {`\u03B8_B=${brewsterDeg.toFixed(1)}\u00B0`}
            </text>
          </>
        )}
        {/* TIR critical angle marker */}
        {hasTIR && (
          <>
            <line x1={toX(criticalDeg)} y1={oy} x2={toX(criticalDeg)} y2={yTop + 10} stroke={G.red} strokeWidth="1" strokeDasharray="4,3"/>
            <text x={toX(criticalDeg) + 4} y={yTop + 30} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">
              {`\u03B8_c=${criticalDeg.toFixed(1)}\u00B0`}
            </text>
            <rect x={toX(criticalDeg)} y={yTop} width={xEnd - toX(criticalDeg)} height={oy - yTop} fill={G.red} opacity="0.04"/>
            <text x={(toX(criticalDeg) + xEnd) / 2} y={yTop + 15} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">TIR</text>
          </>
        )}
        {/* Legend */}
        {showRs && <>
          <line x1={ox + 10} y1={yTop + 8} x2={ox + 30} y2={yTop + 8} stroke={G.blue} strokeWidth="2"/>
          <text x={ox + 34} y={yTop + 12} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Rs (s-pol)</text>
        </>}
        {showRp && <>
          <line x1={ox + 110} y1={yTop + 8} x2={ox + 130} y2={yTop + 8} stroke={G.red} strokeWidth="2"/>
          <text x={ox + 134} y={yTop + 12} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">Rp (p-pol)</text>
        </>}
      </svg>
    </div>
  );
}

// ─── Thermocouple Circuit Diagram ───

function ThermocoupleCircuit({ mid = "" }) {
  const w = 420, h = 200;
  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Thermocouple circuit with hot and cold junctions</title>
        <text x={w/2} y="16" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Thermocouple Circuit</text>
        {/* Metal A (top wire) */}
        <path d="M80,70 L210,70 L210,50 L210,70 L340,70" fill="none" stroke={G.blue} strokeWidth="2.5"/>
        <text x={160} y="62" fill={G.blue} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Metal A</text>
        {/* Metal B (bottom wire) */}
        <path d="M80,130 L160,130 L160,160 L160,130 L260,130 L260,160 L260,130 L340,130" fill="none" stroke={G.red} strokeWidth="2.5"/>
        <text x={210} y="155" fill={G.red} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Metal B</text>
        {/* Left junction (hot) */}
        <line x1={80} y1={70} x2={80} y2={130} stroke={G.gold} strokeWidth="2"/>
        <circle cx={80} cy={100} r="6" fill={G.gold} opacity="0.3" stroke={G.gold} strokeWidth="1.5"/>
        <circle cx={80} cy={100} r="3" fill={G.gold}/>
        <text x={28} y={104} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">T</text>
        <text x={28} y={118} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">(hot)</text>
        {/* Right junction (cold / reference) */}
        <line x1={340} y1={70} x2={340} y2={130} stroke={G.ax} strokeWidth="2"/>
        <circle cx={340} cy={100} r="6" fill={G.ax} opacity="0.2" stroke={G.ax} strokeWidth="1.5"/>
        <circle cx={340} cy={100} r="3" fill={G.ax}/>
        <text x={388} y={96} fill={G.ax} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">T_0</text>
        <text x={388} y={112} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">(ref)</text>
        {/* Voltmeter at bottom center */}
        <circle cx={210} cy={130} r="12" fill="none" stroke={G.grn} strokeWidth="1.5"/>
        <text x={210} y={134} fill={G.grn} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="700">V</text>
        {/* Voltage label */}
        <text x={210} y={188} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"V_AB = \u222B(S_A - S_B)dT"}
        </text>
      </svg>
    </div>
  );
}

// ─── Momentum Distribution Shift Diagram ───

function MomentumShiftDiagram({ mid = "" }) {
  const w = 460, h = 180;
  const cx1 = 130, cx2 = 340, cy = 95, r = 50;
  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Fermi sphere momentum shift under applied electric field</title>
        <text x={w/2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Fermi Sphere Shift Under Electric Field</text>
        {/* No field */}
        <circle cx={cx1} cy={cy} r={r} fill={G.blue} opacity="0.12" stroke={G.blue} strokeWidth="1.5"/>
        <line x1={cx1 - r - 15} y1={cy} x2={cx1 + r + 15} y2={cy} stroke={G.ax} strokeWidth="0.5"/>
        <line x1={cx1} y1={cy - r - 15} x2={cx1} y2={cy + r + 15} stroke={G.ax} strokeWidth="0.5"/>
        <circle cx={cx1} cy={cy} r="2" fill={G.gold}/>
        <text x={cx1} y={cy + r + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">No field (E=0)</text>
        <text x={cx1} y={cy - r - 8} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">p_av = 0</text>
        {/* Arrow between */}
        <line x1={200} y1={cy} x2={260} y2={cy} stroke={G.gold} strokeWidth="1.5" markerEnd={`url(#ah-mom${mid})`}/>
        <text x={230} y={cy - 10} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Apply E_x</text>
        {/* With field - shifted */}
        <defs>
          <marker id={`ah-mom${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.gold} strokeWidth="1"/>
          </marker>
        </defs>
        <circle cx={cx2} cy={cy} r={r} fill={G.blue} opacity="0.06" stroke={G.ax} strokeWidth="0.8" strokeDasharray="3,3"/>
        <circle cx={cx2 - 12} cy={cy} r={r} fill={G.blue} opacity="0.12" stroke={G.blue} strokeWidth="1.5"/>
        <line x1={cx2 - r - 20} y1={cy} x2={cx2 + r + 15} y2={cy} stroke={G.ax} strokeWidth="0.5"/>
        <line x1={cx2} y1={cy - r - 15} x2={cx2} y2={cy + r + 15} stroke={G.ax} strokeWidth="0.5"/>
        <circle cx={cx2 - 12} cy={cy} r="2" fill={G.gold}/>
        {/* Drift electrons label (left side — electrons shift opposite to E) */}
        <line x1={cx2 - r - 12} y1={cy - 20} x2={cx2 - r - 12} y2={cy + 20} stroke={G.red} strokeWidth="2"/>
        <text x={cx2 - r - 16} y={cy - 4} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">drift</text>
        <text x={cx2 - r - 16} y={cy + 8} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">electrons</text>
        <text x={cx2 - 6} y={cy + r + 28} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">With field (E_x)</text>
        <text x={cx2 - 6} y={cy - r - 8} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"p_av \u2260 0 \u2192 net J_x"}</text>
      </svg>
    </div>
  );
}

// ─── Electron Drift Animation (Drude Model) ───

function ElectronDriftAnimation({ mid = "" }) {
  const w = 500, h = 250;
  const numElectrons = 18;
  const electronR = 4;
  const pad = 10;
  const thermalSpeed = 2.5;
  const driftMag = 0.35;
  const scatterInterval = 60; // frames between random scatters

  const [playing, setPlaying] = useState(false);
  const [fieldOn, setFieldOn] = useState(false);
  const electronsRef = useRef(null);
  const frameRef = useRef(0);
  const animFrameRef = useRef(null);

  // Initialize electrons
  if (!electronsRef.current) {
    const arr = [];
    for (let i = 0; i < numElectrons; i++) {
      const angle = Math.random() * 2 * Math.PI;
      arr.push({
        x: pad + Math.random() * (w - 2 * pad),
        y: pad + Math.random() * (h - 2 * pad),
        vx: thermalSpeed * Math.cos(angle),
        vy: thermalSpeed * Math.sin(angle),
        scatterAt: Math.floor(Math.random() * scatterInterval),
      });
    }
    electronsRef.current = arr;
  }

  const [dots, setDots] = useState(() =>
    electronsRef.current.map(e => ({ x: e.x, y: e.y, vx: e.vx, vy: e.vy }))
  );

  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const step = () => {
      frameRef.current++;
      const els = electronsRef.current;
      for (let i = 0; i < els.length; i++) {
        const e = els[i];
        // Scatter: randomize thermal direction
        if (frameRef.current % scatterInterval === e.scatterAt) {
          const angle = Math.random() * 2 * Math.PI;
          e.vx = thermalSpeed * Math.cos(angle);
          e.vy = thermalSpeed * Math.sin(angle);
        }
        // Apply drift when field is on
        let dvx = e.vx, dvy = e.vy;
        if (fieldOn) {
          dvx -= driftMag;
        }
        e.x += dvx;
        e.y += dvy;
        // Bounce off walls
        if (e.x < pad) { e.x = pad; e.vx = Math.abs(e.vx); }
        if (e.x > w - pad) { e.x = w - pad; e.vx = -Math.abs(e.vx); }
        if (e.y < pad) { e.y = pad; e.vy = Math.abs(e.vy); }
        if (e.y > h - pad) { e.y = h - pad; e.vy = -Math.abs(e.vy); }
      }
      setDots(els.map(e => ({ x: e.x, y: e.y, vx: e.vx, vy: e.vy })));
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [playing, fieldOn]);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto", background: G.bg, borderRadius: 6, border: `1px solid ${G.ax}` }}>
        <title>Animated electron drift with random scattering in an electric field</title>
        <text x={w / 2} y="16" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Electron Drift in Applied Field</text>
        {/* Metal box */}
        <rect x={pad} y={pad} width={w - 2 * pad} height={h - 2 * pad} fill="none" stroke={G.ax} strokeWidth="1.5" rx="3"/>
        {/* E-field arrow */}
        {fieldOn && <>
          <defs><marker id={`eDriftArrow-${mid}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0,0 8,3 0,6" fill={G.red}/>
          </marker></defs>
          <line x1={pad + 6} y1={h / 2} x2={pad + 50} y2={h / 2} stroke={G.red} strokeWidth="2" markerEnd={`url(#eDriftArrow-${mid})`}/>
          <text x={pad + 30} y={h / 2 - 8} fill={G.red} fontSize="12" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="700">E</text>
        </>}
        {/* Electrons */}
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={electronR} fill={G.blue} opacity="0.85"/>
            {fieldOn && <line x1={d.x} y1={d.y} x2={d.x - 8} y2={d.y} stroke={G.grn} strokeWidth="1.2" markerEnd={`url(#eDriftArrow-${mid})`}/>}
          </g>
        ))}
        {/* Status label */}
        <text x={w - pad - 4} y={h - pad - 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">
          {fieldOn ? "E-field ON: net electron drift to the left (opposite E)" : "E-field OFF: random thermal motion, no net drift"}
        </text>
      </svg>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 8 }}>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setFieldOn(f => !f); }} style={fieldOn ? { background: G.gold, color: "#13151c" } : {}}>
          {fieldOn ? "E-field ON" : "Apply E-field"}
        </button>
      </div>
    </div>
  );
}

// ─── Refraction Ray Diagram (Dispersion/Fresnel) ───

function RefractionRayDiagram({ mid = "" }) {
  const w = 500, h = 400;
  const interfaceY = h / 2;

  const [thetaI, setThetaI] = useState(30);
  const [n1, setN1] = useState(1.0);
  const [n2, setN2] = useState(1.5);
  const [playing, setPlaying] = useState(false);
  const photonPosRef = useRef(0);
  const animFrameRef = useRef(null);
  const [photonT, setPhotonT] = useState(0);

  const thetaIRad = (thetaI * Math.PI) / 180;
  const sinThetaT = (n1 / n2) * Math.sin(thetaIRad);
  const isTIR = Math.abs(sinThetaT) > 1;
  const thetaTRad = isTIR ? 0 : Math.asin(sinThetaT);
  const criticalAngle = n1 > n2 ? Math.asin(n2 / n1) * (180 / Math.PI) : null;

  // Ray geometry
  const hitX = w / 2;
  const rayLen = 160;
  // Incident ray: comes from top-left
  const incStartX = hitX - rayLen * Math.sin(thetaIRad);
  const incStartY = interfaceY - rayLen * Math.cos(thetaIRad);
  // Reflected ray: goes to top-right
  const refEndX = hitX + rayLen * Math.sin(thetaIRad);
  const refEndY = interfaceY - rayLen * Math.cos(thetaIRad);
  // Refracted ray: goes to bottom-right (or nowhere if TIR)
  const transEndX = isTIR ? hitX : hitX + rayLen * Math.sin(thetaTRad);
  const transEndY = isTIR ? interfaceY : interfaceY + rayLen * Math.cos(thetaTRad);

  // Photon animation
  useEffect(() => {
    if (!playing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }
    const step = () => {
      photonPosRef.current = (photonPosRef.current + 0.008) % 1;
      setPhotonT(photonPosRef.current);
      animFrameRef.current = requestAnimationFrame(step);
    };
    animFrameRef.current = requestAnimationFrame(step);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [playing]);

  // Compute photon dot positions along rays
  const photonDots = [];
  const numPhotons = 3;
  for (let i = 0; i < numPhotons; i++) {
    const t = (photonT + i / numPhotons) % 1;
    if (t < 0.5) {
      // On incident ray
      const frac = t / 0.5;
      photonDots.push({
        x: incStartX + frac * (hitX - incStartX),
        y: incStartY + frac * (interfaceY - incStartY),
        type: "inc",
      });
    } else {
      const frac = (t - 0.5) / 0.5;
      // Reflected photon
      photonDots.push({
        x: hitX + frac * (refEndX - hitX),
        y: interfaceY + frac * (refEndY - interfaceY),
        type: "ref",
      });
      // Refracted photon (if not TIR)
      if (!isTIR) {
        photonDots.push({
          x: hitX + frac * (transEndX - hitX),
          y: interfaceY + frac * (transEndY - interfaceY),
          type: "trans",
        });
      }
    }
  }

  // Arc for angle display
  const arcPath = (cx, cy, r, startAngle, endAngle, ccw) => {
    const s = ccw ? endAngle : startAngle;
    const e = ccw ? startAngle : endAngle;
    const x1 = cx + r * Math.sin(s);
    const y1 = cy - r * Math.cos(s);
    const x2 = cx + r * Math.sin(e);
    const y2 = cy - r * Math.cos(e);
    const large = Math.abs(e - s) > Math.PI ? 1 : 0;
    return `M${x1},${y1} A${r},${r} 0 ${large} ${ccw ? 0 : 1} ${x2},${y2}`;
  };

  const thetaTDeg = isTIR ? "-" : (thetaTRad * 180 / Math.PI).toFixed(1);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto", background: G.bg, borderRadius: 6, border: `1px solid ${G.ax}` }}>
        <title>Refraction ray diagram with Snell's law and total internal reflection</title>
        <text x={w / 2} y="18" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Snell's Law and Total Internal Reflection</text>
        {/* Media backgrounds */}
        <rect x="0" y="0" width={w} height={interfaceY} fill={G.blue} opacity="0.06"/>
        <rect x="0" y={interfaceY} width={w} height={interfaceY} fill={G.grn} opacity="0.06"/>
        {/* Interface line */}
        <line x1="0" y1={interfaceY} x2={w} y2={interfaceY} stroke={G.ax} strokeWidth="1.5"/>
        {/* Normal (dashed) */}
        <line x1={hitX} y1={interfaceY - 170} x2={hitX} y2={interfaceY + 170} stroke={G.ax} strokeWidth="1" strokeDasharray="4,4"/>
        {/* Media labels */}
        <text x={20} y={interfaceY - 8} fill={G.blue} fontSize="10" fontFamily="'IBM Plex Mono'">n1 = {n1.toFixed(2)}</text>
        <text x={20} y={interfaceY + 16} fill={G.grn} fontSize="10" fontFamily="'IBM Plex Mono'">n2 = {n2.toFixed(2)}</text>
        {/* Incident ray */}
        <line x1={incStartX} y1={incStartY} x2={hitX} y2={interfaceY} stroke={G.gold} strokeWidth="2"/>
        {/* Reflected ray */}
        <line x1={hitX} y1={interfaceY} x2={refEndX} y2={refEndY} stroke={G.blue} strokeWidth="1.8" strokeDasharray={isTIR ? "none" : "none"} opacity={isTIR ? 1 : 0.7}/>
        {/* Refracted ray */}
        {!isTIR && <line x1={hitX} y1={interfaceY} x2={transEndX} y2={transEndY} stroke={G.grn} strokeWidth="1.8"/>}
        {/* Angle arcs */}
        {thetaI > 2 && <path d={arcPath(hitX, interfaceY, 30, 0, thetaIRad, false)} fill="none" stroke={G.gold} strokeWidth="1"/>}
        {thetaI > 2 && <path d={arcPath(hitX, interfaceY, 34, 0, thetaIRad, true)} fill="none" stroke={G.blue} strokeWidth="1"/>}
        {!isTIR && thetaI > 2 && <path d={arcPath(hitX, interfaceY + 0.5, 30, 0, thetaTRad, false)} fill="none" stroke={G.grn} strokeWidth="1" transform={`scale(1,-1) translate(0,${-2 * interfaceY})`}/>}
        {/* Angle labels */}
        <text x={hitX + 38} y={interfaceY - 14} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">{thetaI}deg</text>
        <text x={hitX - 58} y={interfaceY - 14} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">{thetaI}deg</text>
        {!isTIR && <text x={hitX + 38} y={interfaceY + 22} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">{thetaTDeg}deg</text>}
        {/* TIR label */}
        {isTIR && <text x={hitX} y={interfaceY + 40} fill={G.red} fontSize="13" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="700">Total Internal Reflection</text>}
        {criticalAngle !== null && <text x={w - 10} y={30} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">Critical angle: {criticalAngle.toFixed(1)}deg</text>}
        {/* Photon dots */}
        {photonDots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={p.type === "inc" ? G.gold : p.type === "ref" ? G.blue : G.grn} opacity="0.9"/>
        ))}
        {/* Ray labels */}
        <text x={incStartX - 4} y={incStartY - 4} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">Incident</text>
        <text x={refEndX + 4} y={refEndY - 4} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Reflected</text>
        {!isTIR && <text x={transEndX + 4} y={transEndY + 4} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">Refracted</text>}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: G.ltxt }}>
            Angle: {thetaI}deg
            <input type="range" min="0" max="89" step="1" value={thetaI} onChange={e => { e.stopPropagation(); setThetaI(+e.target.value); }} onClick={e => e.stopPropagation()} style={{ marginLeft: 4, width: 100 }}/>
          </label>
          <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: G.ltxt }}>
            n1: {n1.toFixed(2)}
            <input type="range" min="1.0" max="2.5" step="0.05" value={n1} onChange={e => { e.stopPropagation(); setN1(+e.target.value); }} onClick={e => e.stopPropagation()} style={{ marginLeft: 4, width: 80 }}/>
          </label>
          <label style={{ fontFamily: "'IBM Plex Mono'", fontSize: 11, color: G.ltxt }}>
            n2: {n2.toFixed(2)}
            <input type="range" min="1.0" max="2.5" step="0.05" value={n2} onChange={e => { e.stopPropagation(); setN2(+e.target.value); }} onClick={e => e.stopPropagation()} style={{ marginLeft: 4, width: 80 }}/>
          </label>
        </div>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
      </div>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "free-electron",
    tab: "Free Electron Model",
    title: "1. Free Electron Model",
    subtitle: "Electrons as free particles, Fermi energy, density of states",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Electrons in a Metal">
          <P>In the <b>free electron model</b>, conduction electrons in a metal are treated as free particles. Their energy is purely kinetic:</P>
          <Eq>{"E = \\frac{p^2}{2m_e} = \\frac{\\hbar^2 k^2}{2m_e^*}"}</Eq>
          <P>where <M>{"p"}</M> is electron momentum, <M>{"m_e"}</M> is electron mass, <M>{"\\hbar"}</M> is the reduced Planck constant, and <M>{"k"}</M> is the wave vector. In a crystal, the effective mass <M>{"m_e^*"}</M> replaces <M>{"m_e"}</M> to account for lattice interactions.</P>
          <KeyConcept label="Effective Mass">
            The effective mass <M>{"m_e^*"}</M> captures the effect of the crystal lattice on electron dynamics: <M>{"\\frac{1}{m_e^*} = \\frac{1}{\\hbar^2}\\frac{\\partial^2 E}{\\partial k^2}"}</M>. A smaller curvature in the E-k diagram means a larger effective mass. For Cu, <M>{"m_e^*/m_e \\approx 1.3"}</M>.
          </KeyConcept>
        </Section>

        <Section title="Fermi Sphere and Momentum States">
          <P>At <M>{"T = 0"}</M> K, electrons fill all available states from the bottom of the band up to the <b>Fermi energy</b> <M>{"E_{FO}"}</M>. In momentum space, the occupied states form a <b>Fermi sphere</b> with average momentum <M>{"p_{\\text{av}} = 0"}</M> (no net current).</P>
          <P>When an external electric field <M>{"E_x"}</M> is applied, the Fermi sphere shifts. Electron <i>a</i> at the Fermi level moving in the +x direction gains momentum and becomes a <b>drift electron</b>. The momentum distribution becomes asymmetric, producing net current.</P>
          <MomentumShiftDiagram mid="t" />
          <KeyConcept label="Key Insight">
            Only electrons near the Fermi surface can respond to applied fields; those deep in the Fermi sea have no available empty states nearby to scatter into.
          </KeyConcept>
        </Section>

        <Section title="Recap: Density of States and Fermi-Dirac Statistics">
          <P>From the Band Theory unit, recall the key results for free electrons in a metal:</P>
          <Eq>{"g(E) = (8\\pi \\sqrt{2})\\left(\\frac{m_e}{h^2}\\right)^{3/2} E^{1/2}, \\quad f(E) = \\frac{1}{1 + e^{(E - E_F)/kT}}, \\quad E_{FO} = \\left(\\frac{h^2}{8m_e}\\right)\\left(\\frac{3n}{\\pi}\\right)^{2/3}"}</Eq>
          <P>The electron concentration is <M>{"n = \\int f(E)\\,g(E)\\,dE"}</M>. At finite temperature, <M>{"E_F(T) = E_{FO}[1 - (\\pi^2/12)(kT/E_{FO})^2]"}</M>.</P>
        </Section>

        <Section title="Fermi Velocity and Mean Free Path">
          <P>Electrons at the Fermi level have the <b>Fermi velocity</b>:</P>
          <Eq>{"v_F = \\sqrt{\\frac{2E_F}{m_e}}"}</Eq>
          <P>For Cu (<M>{"E_F = 7.0"}</M> eV), <M>{"v_F \\approx 1.57 \\times 10^6"}</M> m/s. The <b>mean free path</b> between scattering events is:</P>
          <Eq>{"l = v_F \\cdot \\tau"}</Eq>
          <KeyConcept label="Why Only Electrons Near E_F Matter" tested>
            Only electrons within <M>{"\\sim kT"}</M> of <M>{"E_F"}</M> can be scattered into empty states and contribute to transport. Electrons deep in the Fermi sea have no empty states nearby and are effectively frozen.
          </KeyConcept>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="1a" title="Electrons in gold" points="15 pts">
            <P>Gold: M = 196.97 g/mol, density 19300 kg/m<M>{"^3"}</M>, valency 1, resistivity 22 n<M>{"\\Omega"}</M> m.</P>
            <P>Calculate Fermi energy at 0 K and mean free path of conduction electrons.</P>
            <CollapsibleBlock title="Solution">
              <P><M>{"n = Z \\times d \\times N_A/M = 5.9 \\times 10^{28}"}</M> m<M>{"^{-3}"}</M></P>
              <P><M>{"E_{FO} = (h^2/8m_e)(3n/\\pi)^{2/3} = 5.53"}</M> eV</P>
              <P><M>{"v_F = \\sqrt{2E_F/m_e} = 1.39 \\times 10^6"}</M> m/s</P>
              <P>From Drude: <M>{"\\tau = m_e/(ne^2\\rho) = 2.73 \\times 10^{-14}"}</M> s</P>
              <P><M>{"l = v_F\\tau = 38.1"}</M> nm</P>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW4" number="1c" title="2D goldene monolayer" points="15 pts">
            <P>A free-standing monolayer of gold atoms ("goldene") has <M>{"E_F \\approx 0.5"}</M> eV at 0 K. Estimate the 2D density of states and states per unit volume near <M>{"E_F"}</M>. Monolayer thickness <M>{"d \\approx 0.288"}</M> nm.</P>
            <CollapsibleBlock title="Solution">
              <P>2D DOS (per unit area): <M>{"g_A = 4\\pi m_e/h^2 = 4.18 \\times 10^{18}"}</M> eV<M>{"^{-1}"}</M>m<M>{"^{-2}"}</M></P>
              <P>Per unit volume: <M>{"g_V = g_A/d = 1.45 \\times 10^{28}"}</M> eV<M>{"^{-1}"}</M>m<M>{"^{-3}"}</M></P>
              <P>Number of states up to <M>{"E_F"}</M>: <M>{"S_V = 4\\pi m_e E_F/(h^2 d) = 7.23 \\times 10^{27}"}</M> m<M>{"^{-3}"}</M></P>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "drude-model",
    tab: "Drude Model",
    title: "2. Drude Model and Conductivity",
    subtitle: "Drift velocity, mobility, Ohm's law, band model",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Classical Drude Model">
          <P>The <b>Drude model</b> treats conduction electrons classically. Under an applied electric field <M>{"E_x"}</M>, electrons accelerate between scattering events. The <b>drift velocity</b> is the average velocity of all electrons:</P>
          <Eq>{"v_{dx} = \\frac{1}{N}[v_{x1} + v_{x2} + \\cdots + v_{xN}]"}</Eq>
          <P>Between collisions, an electron accelerates for a mean free time <M>{"\\tau"}</M>:</P>
          <Eq>{"v_{dx} = \\int_0^\\tau a\\,dt \\approx a\\tau = \\frac{F}{m_e}\\tau = \\frac{eE_x}{m_e}\\tau = \\mu E_x"}</Eq>
          <KeyConcept label="Electron Mobility" tested>
            <M>{"\\mu = \\frac{e\\tau}{m_e}"}</M> is the electron mobility (units: m^2/(V*s)). It measures how easily electrons drift in response to an electric field.
          </KeyConcept>
        </Section>

        <Section title="Current Density and Conductivity">
          <P>The current density relates drift velocity to charge flow:</P>
          <Eq>{"J_x = env_{dx} = en\\mu E_x = \\sigma E_x"}</Eq>
          <P>where <M>{"n"}</M> is the free electron concentration. The <b>conductivity</b> is:</P>
          <Eq>{"\\sigma = \\frac{ne^2\\tau}{m_e} = ne\\mu"}</Eq>
          <P>And the <b>resistivity</b> is <M>{"\\rho = 1/\\sigma"}</M>.</P>
        </Section>

        <Section title="Ohm's Law Derivation">
          <P>Starting from <M>{"J_x = \\sigma E_x"}</M> and applying it to a conductor of length <M>{"\\Delta x"}</M> and cross-section <M>{"A"}</M>:</P>
          <Eq>{"I = J_x A = \\frac{V}{R}, \\quad R = \\rho\\frac{\\Delta x}{A}"}</Eq>
          <P>This is <b>Ohm's law</b>, derived from the microscopic Drude model.</P>
        </Section>

        <Section title="Band Model of Conduction">
          <P>The quantum mechanical (band model) approach considers only electrons near <M>{"E_F"}</M>. The energy gained by drift electrons is:</P>
          <Eq>{"\\Delta E = \\frac{p_x}{m_e^*}\\Delta p_x = \\frac{m_e^* v_F}{m_e^*}(\\tau e E_x) = ev_F \\tau E_x"}</Eq>
          <P>The current density from electrons in the energy range <M>{"\\Delta E"}</M> near <M>{"E_F"}</M>:</P>
          <Eq>{"J_x = e[g(E_F)\\Delta E]v_F = e^2 v_F^2 \\tau g(E_F) E_x"}</Eq>
          <P>Including the 1/3 factor for the three-dimensional average:</P>
          <Eq>{"\\sigma = \\frac{1}{3}e^2 v_F^2 \\tau \\, g(E_F)"}</Eq>
          <KeyConcept label="Drude = Band Model Result">
            When the free electron model density of states <M>{"g(E_F)"}</M> and Fermi energy <M>{"E_{FO}"}</M> are substituted, the band model gives the same result as the classical Drude model: <M>{"\\sigma = ne^2\\tau/m_e"}</M>.
          </KeyConcept>
        </Section>

        <Section title="Interactive: Electron Drift">
          <P>Watch how conduction electrons behave with and without an applied electric field. Without the field, electrons move randomly (thermal velocity) with zero average drift. Toggle the field to see a net drift velocity emerge.</P>
          <ElectronDriftAnimation mid="t" />
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="1b" title="Red adamantium resistivity" points="15 pts">
            <P>Red adamantium: <M>{"E_F = 28.0"}</M> eV at room temperature, drift mobility <M>{"\\mu = 4.1"}</M> cm<M>{"^2"}</M>V<M>{"^{-1}"}</M>s<M>{"^{-1}"}</M>. Estimate resistivity.</P>
            <CollapsibleBlock title="Solution">
              <P>Since <M>{"E_F \\approx E_{FO}"}</M> at room temperature: <M>{"n = (\\pi/3)(8m_eE_{FO}/h^2)^{3/2} = 6.74 \\times 10^{29}"}</M> m<M>{"^{-3}"}</M></P>
              <P><M>{"\\rho = 1/(ne\\mu) = 1/((6.74 \\times 10^{29})(1.6 \\times 10^{-19})(4.1 \\times 10^{-4})) = 2.26 \\times 10^{-8}\\;\\Omega"}</M>m</P>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "contacts",
    tab: "Metal Contacts",
    title: "3. Metal-Metal Contacts",
    subtitle: "Work function, contact potential, Fermi level alignment",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Work Function">
          <P>The <b>work function</b> <M>{"\\Phi"}</M> is the minimum energy required to remove an electron from the Fermi level to the vacuum level. For photoemission from a metal, the photon must have energy <M>{"hf \\gt \\Phi"}</M>.</P>
          <P>The emitted electron's kinetic energy is:</P>
          <Eq>{"KE = hf - \\Phi"}</Eq>
          <div className="data-table">
            <table>
              <thead><tr><th>Metal</th><th>Ag</th><th>Au</th><th>Cu</th><th>Mo</th><th>Pt</th><th>Al</th></tr></thead>
              <tbody><tr><td><M>{"\\Phi"}</M> (eV)</td><td>4.26</td><td>5.10</td><td>4.65</td><td>4.20</td><td>5.36</td><td>4.28</td></tr></tbody>
            </table>
          </div>
        </Section>

        <Section title="Contact Potential">
          <P>When two metals with different work functions are brought into contact, electrons flow from the metal with <b>lower</b> <M>{"\\Phi"}</M> (higher Fermi level) to the one with <b>higher</b> <M>{"\\Phi"}</M> (lower Fermi level) until the Fermi levels align.</P>
          <P>Example: Pt (<M>{"\\Phi = 5.36"}</M> eV) and Mo (<M>{"\\Phi = 4.20"}</M> eV):</P>
          <Eq>{"\\Phi_{Pt} - \\Phi_{Mo} = 1.16\\text{ eV} = e\\Delta V"}</Eq>
          <P>The contact potential difference is <M>{"\\Delta V = 1.16"}</M> V. Electrons transfer from Mo to Pt, leaving Mo positively charged and Pt negatively charged at the interface.</P>
          <KeyConcept label="Closed Circuit, No Current">
            In a closed circuit made of two different metals, there is a contact potential at each junction. However, these contact potentials <b>oppose each other</b>, so <b>no net current flows</b> in the circuit at uniform temperature.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "seebeck",
    tab: "Seebeck Effect",
    title: "4. Seebeck Effect and Thermocouples",
    subtitle: "Temperature gradients, Seebeck coefficient, thermocouple voltage",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="The Seebeck Effect">
          <P>When a temperature gradient exists across a conductor, more energetic electrons at the hot end diffuse toward the cold end, creating a <b>voltage difference</b>. The <b>Seebeck coefficient</b> quantifies this:</P>
          <Eq>{"S = \\frac{dV}{dT}"}</Eq>
          <P>Units: uV/K. Positive <M>{"S"}</M> means the cold end is positive (electrons diffuse from hot to cold). Negative <M>{"S"}</M> (as in Al) arises when the energy dependence of the electron mean free path near <M>{"E_F"}</M> reverses the usual polarity, a band structure effect related to the Fermi surface geometry.</P>
        </Section>

        <Section title="Two Contributions to S">
          <P><b>Electron diffusion</b>: Hot electrons have more kinetic energy and diffuse to the cold end, producing a positive contribution to <M>{"S"}</M> that increases linearly with temperature.</P>
          <P><b>Phonon drag</b>: Lattice vibrations (phonons) travel from hot to cold and drag electrons along. This contribution dominates at low temperatures and enhances <M>{"|S|"}</M>, but the sign of <M>{"S"}</M> at room temperature is determined primarily by the band structure near <M>{"E_F"}</M>.</P>
          <P>For copper, the empirical Seebeck coefficient follows:</P>
          <Eq>{"S = aT + \\frac{b}{T}"}</Eq>
          <P>where <M>{"a = 5.8 \\times 10^{-3}"}</M> uV/K<M>{"^2"}</M> and <M>{"b \\approx 76.4"}</M> uV, valid for <M>{"T = 70{-}900"}</M> K.</P>
          <SeebeckCoefficient params={gp.seebeckCoeff} mid="t" />
          <div className="data-table">
            <table>
              <thead><tr><th>Metal</th><th>S at 300K (uV/K)</th><th><M>{"E_F"}</M> (eV)</th></tr></thead>
              <tbody>
                <tr><td>Al</td><td>-1.7</td><td>11.7</td></tr>
                <tr><td>Au</td><td>+1.94</td><td>5.53</td></tr>
                <tr><td>Cu</td><td>+1.94</td><td>7.00</td></tr>
              </tbody>
            </table>
          </div>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "thermoelectric_seebeck_module.jpg"} alt="Thermoelectric Seebeck power module showing the hot side ceramic plate with electrical leads" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Thermoelectric generator (TEG) module: converts temperature differences directly to voltage via the Seebeck effect. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0</span></figcaption>
          </figure>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "peltier_element.jpg"} alt="Peltier thermoelectric cooler showing ice formation on the cold side with a copper heat sink beneath" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Peltier cooler in operation: ice forms on the cold side (-8C) while the hot side reaches +30C. The reverse Seebeck (Peltier) effect. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0</span></figcaption>
          </figure>
        </Section>

        <Section title="Thermocouple">
          <P>A <b>thermocouple</b> uses two different metals (A, B) joined at two junctions at different temperatures. The measured voltage is:</P>
          <Eq>{"V_{AB} = \\int_{T_0}^{T} (S_A - S_B)\\,dT = \\int_{T_0}^{T} S_{AB}\\,dT"}</Eq>
          <ThermocoupleCircuit mid="t" />
          <P>This voltage depends on the <b>difference</b> in Seebeck coefficients and the temperature difference, enabling precise temperature measurement.</P>
          <KeyConcept label="Thermocouple Principle">
            A single metal in a closed circuit at uniform temperature produces no net voltage (contact potentials cancel). But with a temperature gradient across two different metals, the Seebeck voltages do NOT cancel, producing a measurable EMF.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "em-waves",
    tab: "EM Waves in Media",
    title: "5. EM Waves in Dielectric Media",
    subtitle: "Maxwell's equations, wave equation, refractive index",
    content: (gp) => (
      <div className="lesson-body">
        <P style={{ opacity: 0.7, fontStyle: "italic", marginBottom: 16 }}>The remainder of this lesson covers the optical properties of materials, which are also governed by the interaction of EM fields with electrons in solids.</P>
        <Section title="Maxwell's Equations">
          <P>The four Maxwell's equations govern all electromagnetic phenomena:</P>
          <Eq>{"\\nabla \\cdot \\vec{D} = \\rho \\qquad \\text{(Gauss's law)}"}</Eq>
          <Eq>{"\\nabla \\cdot \\vec{B} = 0 \\qquad \\text{(Gauss's law for magnetism)}"}</Eq>
          <Eq>{"\\nabla \\times \\vec{E} = -\\frac{\\partial \\vec{B}}{\\partial t} \\qquad \\text{(Faraday's law)}"}</Eq>
          <Eq>{"\\nabla \\times \\vec{H} = \\vec{J} + \\frac{\\partial \\vec{D}}{\\partial t} \\qquad \\text{(Ampere's law)}"}</Eq>
          <P>where <M>{"\\vec{D}"}</M> is the electric displacement, <M>{"\\vec{B}"}</M> is the magnetic flux density, <M>{"\\vec{E}"}</M> and <M>{"\\vec{H}"}</M> are the electric and magnetic field vectors.</P>
        </Section>

        <Section title="Wave Equation in Vacuum">
          <P>In free space (<M>{"\\rho = 0"}</M>, <M>{"\\vec{J} = 0"}</M>), combining Faraday's and Ampere's laws gives the <b>wave equation</b>:</P>
          <Eq>{"\\nabla^2 \\mathbf{E} - \\frac{1}{c_0^2}\\frac{\\partial^2 \\mathbf{E}}{\\partial t^2} = 0"}</Eq>
          <P>where the speed of light in vacuum is:</P>
          <Eq>{"c_0 = \\frac{1}{\\sqrt{\\varepsilon_0 \\mu_0}} \\approx 3.0 \\times 10^8 \\text{ m/s}"}</Eq>
          <P>with <M>{"\\varepsilon_0 \\approx 8.85 \\times 10^{-12}"}</M> F/m and <M>{"\\mu_0 = 4\\pi \\times 10^{-7}"}</M> N/A<M>{"^2"}</M>.</P>
        </Section>

        <Section title="Wave Equation in Dielectric Media">
          <P>In a uniform, non-magnetic, isotropic dielectric with no free charges or currents, the polarization is <M>{"\\vec{P} = \\chi \\varepsilon_0 \\vec{E}"}</M> and the displacement is:</P>
          <Eq>{"\\vec{D} = \\varepsilon_0 \\vec{E} + \\vec{P} = \\varepsilon_0(1 + \\chi)\\vec{E} = \\varepsilon_0 \\varepsilon_r \\vec{E}"}</Eq>
          <P>The wave equation becomes:</P>
          <Eq>{"\\nabla^2 \\mathbf{E} - \\frac{1}{c^2}\\frac{\\partial^2 \\mathbf{E}}{\\partial t^2} = 0"}</Eq>
          <P>where the <b>phase velocity</b> in the medium is:</P>
          <Eq>{"c = \\frac{c_0}{n}, \\qquad n = \\sqrt{\\varepsilon_r}"}</Eq>
          <KeyConcept label="Refractive Index">
            The refractive index <M>{"n = \\sqrt{\\varepsilon_r}"}</M> relates the speed of light in vacuum to the phase velocity in the medium. For glass, <M>{"n \\approx 1.5"}</M>; for diamond, <M>{"n \\approx 2.42"}</M>.
          </KeyConcept>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="2" title="Optical conveyor belt (tractor beam)" points="20 pts">
            <P>Two counter-propagating beams of slightly different frequencies form a moving standing wave. For <M>{"\\lambda = 1064"}</M> nm, find the speed of movement of the antinodes per MHz of frequency detuning.</P>
            <CollapsibleBlock title="Solution">
              <P>The total field: <M>{"E_{total} = 2E_0\\cos((k - \\pi\\sigma/c)z - \\pi\\sigma t)"}</M> where <M>{"\\sigma"}</M> is the detuning.</P>
              <P>Phase velocity of antinodes: <M>{"v = \\pi\\sigma/(k - \\pi\\sigma/c) \\approx \\pi\\sigma/k"}</M> for small <M>{"\\sigma"}</M>.</P>
              <P>With <M>{"k = 2\\pi/\\lambda"}</M> and <M>{"\\sigma = 1"}</M> MHz: <M>{"v = \\lambda\\sigma/2 = 1064 \\times 10^{-9} \\times 10^6/2 = 532"}</M> mm/s per MHz.</P>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW4" number="4" title="Powering Hubble" points="15 pts">
            <P>830 nm laser through atmosphere (8.5 km, <M>{"\\varepsilon_r = 1 + i\\,1.14 \\times 10^{-11}"}</M>). What fraction of power reaches the Hubble mirror?</P>
            <CollapsibleBlock title="Solution">
              <P>Attenuation constant: <M>{"\\alpha = \\pi\\varepsilon''/\\lambda\\varepsilon' = \\pi \\times 1.14 \\times 10^{-11}/(830 \\times 10^{-9}) = 4.47 \\times 10^{-5}"}</M> Np/m</P>
              <P>Power fraction: <M>{"e^{-2\\alpha z} = e^{-2 \\times 4.47 \\times 10^{-5} \\times 8500} = 0.47"}</M>. About 47% of the power reaches Hubble.</P>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "fresnel",
    tab: "Dispersion and Fresnel",
    title: "6. Dispersion and Fresnel Equations",
    subtitle: "Sellmeier equation, group velocity, reflection, Brewster's angle, TIR",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Dispersion: n vs Wavelength">
          <P>The refractive index varies with wavelength. This <b>dispersion</b> is described by the <b>Sellmeier equation</b>:</P>
          <Eq>{"n^2(\\lambda) = 1 + \\sum_i \\frac{B_i \\lambda^2}{\\lambda^2 - C_i}"}</Eq>
          <P>where <M>{"B_i"}</M> and <M>{"C_i"}</M> are material-specific constants. The refractive index decreases with increasing wavelength in normal dispersion (away from absorption bands).</P>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "dispersive_prism.jpg"} alt="Glass prism refracting white light into a visible spectrum showing dispersion" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Optical dispersion: a glass prism separates white light into its component wavelengths due to wavelength-dependent refractive index. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0</span></figcaption>
          </figure>
          <RefractiveIndexDispersion params={gp.refractiveIndex} mid="t" interactive />
        </Section>

        <Section title="Group Velocity">
          <P>A pulse of light (wave packet) travels at the <b>group velocity</b>:</P>
          <Eq>{"v_g = \\frac{c}{N_g}, \\qquad N_g = n - \\lambda\\frac{dn}{d\\lambda}"}</Eq>
          <P>where <M>{"N_g"}</M> is the <b>group index</b>. In regions of normal dispersion (<M>{"dn/d\\lambda \\lt 0"}</M>), the group index <M>{"N_g \\gt n"}</M>, so the group velocity is slower than the phase velocity.</P>
        </Section>

        <Section title="Snell's Law">
          <P>At an interface between two media, the angles of incidence and refraction are related by:</P>
          <Eq>{"n_1 \\sin\\theta_i = n_2 \\sin\\theta_t"}</Eq>
          <P>Since <M>{"n = c_0/v"}</M>, the refractive index encodes the phase velocity in each medium. Substituting gives an equivalent form:</P>
          <Eq>{"\\frac{\\sin\\theta_i}{v_1} = \\frac{\\sin\\theta_t}{v_2}"}</Eq>
          <P>Light bends <b>toward</b> the normal when entering a slower (denser) medium (<M>{"n_2 \\gt n_1"}</M>), and <b>away</b> from it when entering a faster medium.</P>
        </Section>

        <Section title="Fresnel Equations">
          <P>When light hits an interface between two media, the <b>Fresnel equations</b> give the reflected fraction for s-polarized and p-polarized light (with <M>{"\\theta_t"}</M> found from Snell's law):</P>
          <Eq>{"R_s = \\left(\\frac{n_1 \\cos\\theta_i - n_2 \\cos\\theta_t}{n_1 \\cos\\theta_i + n_2 \\cos\\theta_t}\\right)^2"}</Eq>
          <Eq>{"R_p = \\left(\\frac{n_2 \\cos\\theta_i - n_1 \\cos\\theta_t}{n_2 \\cos\\theta_i + n_1 \\cos\\theta_t}\\right)^2"}</Eq>
          <FresnelReflection params={gp.fresnelReflection} mid="t" interactive />
        </Section>

        <Section title="Brewster's Angle">
          <P>At <b>Brewster's angle</b>, the p-polarized reflectance drops to zero:</P>
          <Eq>{"\\tan\\theta_B = \\frac{n_2}{n_1}"}</Eq>
          <P>For air-glass (<M>{"n_1 = 1.0"}</M>, <M>{"n_2 = 1.5"}</M>): <M>{"\\theta_B = \\arctan(1.5) \\approx 56.3^\\circ"}</M>. At this angle, only s-polarized light is reflected, so the reflected beam is completely polarized.</P>
        </Section>

        <Section title="Total Internal Reflection">
          <P>When light travels from a denser medium to a less dense one (<M>{"n_1 \\gt n_2"}</M>), there exists a <b>critical angle</b> beyond which all light is reflected:</P>
          <Eq>{"\\theta_c = \\arcsin\\left(\\frac{n_2}{n_1}\\right)"}</Eq>
          <P>For glass-air (<M>{"n_1 = 1.5"}</M>, <M>{"n_2 = 1.0"}</M>): <M>{"\\theta_c = \\arcsin(2/3) \\approx 41.8^\\circ"}</M>. This is the principle behind optical fibers.</P>
          <KeyConcept label="Absorption Mechanisms">
            Light can be absorbed in a material through several mechanisms: (1) lattice absorption by phonons (infrared), (2) band-to-band electronic transitions (UV/visible, requiring photon energy exceeding the band gap), and (3) free carrier absorption in metals and doped semiconductors.
          </KeyConcept>
        </Section>

        <Section title="Interactive: Snell's Law Ray Diagram">
          <P>Adjust the angle of incidence and refractive indices to see reflection and refraction in real time. When the incident angle exceeds the critical angle (with n1 greater than n2), total internal reflection occurs.</P>
          <RefractionRayDiagram mid="t" />
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="3" title="Polarization games" points="30 pts">
            <P>(a) Write the Jones matrix for an ideal x-polarizer, then for a realistic one with losses <M>{"\\alpha"}</M> and <M>{"\\beta"}</M>. [10 pts]</P>
            <P>(b) Explain why polarized sunglasses suppress glare from water/road surfaces. What polarization do they block? [20 pts]</P>
            <CollapsibleBlock title="Solution">
              <P><b>(a)</b> Ideal: <M>{"T = \\begin{pmatrix} 1 & 0 \\\\ 0 & 0 \\end{pmatrix}"}</M>. Realistic: <M>{"T = \\begin{pmatrix} 1-\\alpha & 0 \\\\ 0 & \\beta \\end{pmatrix}"}</M></P>
              <P><b>(b)</b> Sunlight reflecting off a horizontal surface (water, road) at shallow angles (~45-60 degrees, near Brewster angle <M>{"\\theta_B = \\arctan(n_{water}/n_{air}) \\approx 53^\\circ"}</M>) is predominantly s-polarized (horizontal E-field).</P>
              <P>Polarized sunglasses contain a vertical polarizer that absorbs horizontally polarized light, thus suppressing the glare while transmitting vertically polarized light.</P>
            </CollapsibleBlock>
          </HWQuestion>

          <HWQuestion hw="HW4" number="5" title="Optical fiber" points="20 pts">
            <P>Fiber: core <M>{"n_1 = 1.4510"}</M>, cladding <M>{"n_2 = 1.4477"}</M>, both at 1550 nm.</P>
            <P>(a) Maximum angle a ray can make with the fiber axis while propagating via TIR?</P>
            <P>(b) Maximum acceptance angle at the fiber input face?</P>
            <CollapsibleBlock title="Solution">
              <P><b>(a)</b> Critical angle: <M>{"\\theta_c = \\arcsin(n_2/n_1) = \\arcsin(1.4477/1.4510) = 86.13^\\circ"}</M></P>
              <P>Max angle with fiber axis: <M>{"90^\\circ - 86.13^\\circ = 3.87^\\circ"}</M></P>
              <P><b>(b)</b> By Snell's law at the air-core interface: <M>{"\\sin(\\theta_{in,max}) = (n_1/n_{air})\\sin(3.87^\\circ) = 1.451 \\times 0.0675 = 0.098"}</M></P>
              <P><M>{"\\theta_{in,max} = 5.62^\\circ"}</M></P>
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
        <Section title="1. Fermi Sphere Momentum Shift">
          <MomentumShiftDiagram mid="p0" />
        </Section>
        <Section title="2. Seebeck Coefficient vs Temperature">
          <SeebeckCoefficient params={gp.seebeckCoeff} mid="p1" />
        </Section>
        <Section title="3. Thermocouple Circuit">
          <ThermocoupleCircuit mid="p3b" />
        </Section>
        <Section title="4. Refractive Index Dispersion">
          <RefractiveIndexDispersion params={gp.refractiveIndex} mid="p2" interactive />
        </Section>
        <Section title="5. Fresnel Reflection">
          <FresnelReflection params={gp.fresnelReflection} mid="p3" interactive />
        </Section>
        <Section title="6. Electron Drift Animation">
          <ElectronDriftAnimation mid="p4" />
        </Section>
        <Section title="7. Refraction Ray Diagram">
          <RefractionRayDiagram mid="p5" />
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

/* --- Context Menu --- */
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

// ─── Chatbot Component (copy verbatim, updated system prompt) ───

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
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials for Engineering) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations. -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/conduction_optics.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep thread responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/conduction_optics.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/conduction_optics.jsx now.`;
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
                {sessionStatus === "ready" && "Session active. Ask about metallic conduction, Seebeck effect, or optical properties. Click or highlight content to attach as context."}
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
          <h1>Metallic Conduction and Optical Properties</h1>
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
