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
  "polarization": `Topic: Electric Polarization and Displacement. Covers: Electric polarization P (dipole moment per unit volume), electric displacement D = eps_0 * E + P, relative permittivity eps_r = 1 + chi_e, dielectric susceptibility chi_e, P = chi_e * eps_0 * E, D = eps_r * eps_0 * E, local field E_loc vs applied field E, Clausius-Mossotti relation: (eps_r - 1)/(eps_r + 2) = N * alpha_e / (3 * eps_0). Variables: P = polarization (C/m^2), D = displacement field (C/m^2), E = electric field (V/m), eps_0 = 8.854e-12 F/m, eps_r = relative permittivity (dimensionless), chi_e = electric susceptibility (dimensionless), alpha_e = electronic polarizability (F*m^2), N = number density of molecules (m^-3). Student should understand the relationship between microscopic polarizability and macroscopic permittivity.`,
  "mechanisms": `Topic: Polarization Mechanisms. Covers four types: (1) Electronic polarization alpha_e: displacement of electron cloud relative to nucleus under E field, present in all materials, very fast response ~10^15 Hz. (2) Ionic polarization alpha_i: displacement of cation and anion sublattices in ionic crystals, characteristic frequency ~10^12-10^13 Hz. (3) Orientational (dipolar) polarization alpha_d: alignment of permanent dipole moments against thermal randomization, Langevin function L(x) = coth(x) - 1/x, for small fields alpha_d = p^2/(3kT) where p is permanent dipole moment, characteristic frequency ~10^9-10^10 Hz. (4) Interfacial (space charge, Maxwell-Wagner) polarization: charge accumulation at interfaces in heterogeneous materials, slowest mechanism ~10^-3 to 10^3 Hz. Total polarizability alpha_total = alpha_e + alpha_i + alpha_d.`,
  "frequency": `Topic: Frequency Dependence of Dielectric Properties. Covers: Complex relative permittivity eps_r(omega) = eps_r'(omega) - j*eps_r''(omega). eps_r' is the real part (energy storage), eps_r'' is the imaginary part (energy loss). Debye relaxation model: eps_r(omega) = eps_r_inf + (eps_r_s - eps_r_inf)/(1 + j*omega*tau), where eps_r_s is static permittivity, eps_r_inf is high-frequency permittivity, tau is relaxation time. Loss tangent tan(delta) = eps_r''/eps_r' measures ratio of energy dissipated to energy stored per cycle. Cole-Cole plot: semicircular arc in eps_r'' vs eps_r' plane with center at ((eps_r_s + eps_r_inf)/2, 0) and radius (eps_r_s - eps_r_inf)/2. As frequency increases, mechanisms drop out: interfacial (~10^3 Hz), dipolar (~10^9 Hz), ionic (~10^12 Hz), electronic (~10^15 Hz), causing stepwise decrease in eps_r'.`,
  "gauss-law": `Topic: Gauss's Law in Dielectrics and Capacitors. Covers: Gauss's law for D: div(D) = rho_free (only free charges as sources). Boundary conditions at dielectric interfaces: D_n1 = D_n2 (normal D continuous when no free surface charge), E_t1 = E_t2 (tangential E continuous). Parallel plate capacitor with dielectric: C = eps_r * eps_0 * A / d, where A = plate area, d = separation. Energy stored: U = (1/2)*C*V^2 = (1/2)*eps_r*eps_0*E^2*Volume. Dielectric breakdown: material fails when E exceeds breakdown field E_br. Material comparison: polymers (eps_r = 2-4, low loss), ceramics like BaTiO3 (eps_r = 1000-10000, ferroelectric), SiO2 (eps_r = 3.9, used in ICs), high-k dielectrics for CMOS scaling.`,
  "piezoelectricity": `Topic: Piezoelectricity. Covers: Direct piezoelectric effect: mechanical stress produces electric polarization/voltage (T -> P, used in sensors). Converse piezoelectric effect: applied electric field produces mechanical strain (E -> S, used in actuators). Piezoelectric coefficient d: P = d*T (direct), S = d*E (converse), units C/N or m/V. Crystal symmetry requirement: material must lack a center of symmetry (non-centrosymmetric) to be piezoelectric; 20 of 32 crystal classes are piezoelectric. Quartz (SiO2): trigonal crystal, d11 ~ 2.3 pC/N, very stable frequency. Quartz oscillators: resonant frequency f = v/(2L) where v is acoustic velocity in crystal and L is thickness, used for precise timing (watches, electronics). Applications: pressure sensors, accelerometers, ultrasound transducers, SAW filters, energy harvesting. PZT (lead zirconate titanate) has much larger d ~ 300-600 pC/N, used in actuators and high-power ultrasound.`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials) at the University of Waterloo, Winter 2026. The dielectric materials and piezoelectricity unit covers Kasap Ch. 7 (sections 7.1-7.5, 7.7-7.8), spanning Lectures 15-16. Topics include: electric polarization, displacement field, polarization mechanisms (electronic, ionic, orientational, interfacial), frequency dependence of permittivity, Debye relaxation, loss tangent, Cole-Cole plots, Gauss's law in dielectrics, boundary conditions, capacitors with dielectrics, dielectric breakdown, piezoelectricity (direct and converse effects), quartz oscillators, and applications. The student wants to LEARN the concepts and equations to solve problems independently. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

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
  dielectricVsFrequency: { showElectronic: true, showIonic: true, showOrientational: true },
  lossTangent: { f_peak_Hz: 1e9, peakHeight: 0.1 },
  polarizationMechanisms: { showAll: true },
};

// ─── Graph Components ───

function DielectricVsFrequency({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.dielectricVsFrequency, ...params };
  const w = 520, h = 300, ox = 60, oy = 250, plotW = 430, plotH = 210;

  // Log frequency axis: 0 to 18 (10^0 to 10^18 Hz)
  const fToX = (logF) => ox + (logF / 18) * plotW;
  const epsToY = (eps, maxEps) => oy - (eps / maxEps) * plotH;
  const maxEps = 12;
  const maxEpsImag = 3;

  // Build eps_r' (real part) - stepwise decrease as mechanisms drop out
  const buildEpsReal = () => {
    const pts = [];
    for (let logF = 0; logF <= 18; logF += 0.05) {
      let eps = 1; // vacuum baseline
      // Electronic: drops out ~10^15
      if (p.showElectronic) {
        eps += 1.5 / (1 + Math.pow(10, 2 * (logF - 15)));
      }
      // Ionic: drops out ~10^12
      if (p.showIonic) {
        eps += 2.0 / (1 + Math.pow(10, 2 * (logF - 12.5)));
      }
      // Orientational: drops out ~10^9
      if (p.showOrientational) {
        eps += 4.0 / (1 + Math.pow(10, 2 * (logF - 9.5)));
      }
      // Interfacial: drops out ~10^3
      eps += 2.5 / (1 + Math.pow(10, 2 * (logF - 3)));
      pts.push({ x: fToX(logF), y: epsToY(eps, maxEps) });
    }
    return pts;
  };

  // Build eps_r'' (imaginary part) - peaks at each transition
  const buildEpsImag = () => {
    const pts = [];
    for (let logF = 0; logF <= 18; logF += 0.05) {
      let eps = 0;
      // Interfacial peak ~10^3
      eps += 1.2 * Math.exp(-Math.pow(logF - 3, 2) / 0.8);
      // Orientational peak ~10^9
      if (p.showOrientational) {
        eps += 2.0 * Math.exp(-Math.pow(logF - 9.5, 2) / 0.8);
      }
      // Ionic peak ~10^12
      if (p.showIonic) {
        eps += 1.0 * Math.exp(-Math.pow(logF - 12.5, 2) / 0.6);
      }
      // Electronic peak ~10^15
      if (p.showElectronic) {
        eps += 0.6 * Math.exp(-Math.pow(logF - 15, 2) / 0.5);
      }
      pts.push({ x: fToX(logF), y: oy - (eps / maxEpsImag) * plotH });
    }
    return pts;
  };

  const realPts = buildEpsReal();
  const imagPts = buildEpsImag();

  const pathReal = realPts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const pathImag = imagPts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  // Tick marks for log frequency
  const freqTicks = [0, 3, 6, 9, 12, 15, 18];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Dielectric constant and loss versus frequency</title>
        <defs>
          <marker id={`ah-dvf-${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Dielectric Permittivity vs Frequency
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-dvf-${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 15} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-dvf-${mid})`}/>
        {/* X-axis labels */}
        {freqTicks.map(logF => (
          <g key={logF}>
            <line x1={fToX(logF)} y1={oy} x2={fToX(logF)} y2={oy + 5} stroke={G.ax} strokeWidth="1"/>
            <text x={fToX(logF)} y={oy + 16} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
              {logF === 0 ? "1" : `10^${logF}`}
            </text>
          </g>
        ))}
        <text x={ox + plotW / 2} y={oy + 30} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Frequency (Hz)
        </text>
        {/* Y-axis labels */}
        {[0, 3, 6, 9, 12].map(v => (
          <g key={v}>
            <line x1={ox - 4} y1={epsToY(v, maxEps)} x2={ox} y2={epsToY(v, maxEps)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={epsToY(v, maxEps) + 3} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <text x={15} y={oy - plotH / 2} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${oy - plotH / 2})`}>
          Permittivity
        </text>
        {/* Region labels */}
        <text x={fToX(1.5)} y={epsToY(10.5, maxEps)} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">
          Interfacial
        </text>
        {p.showOrientational && (
          <text x={fToX(6)} y={epsToY(8.5, maxEps)} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">
            Dipolar
          </text>
        )}
        {p.showIonic && (
          <text x={fToX(11)} y={epsToY(5, maxEps)} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">
            Ionic
          </text>
        )}
        {p.showElectronic && (
          <text x={fToX(14)} y={epsToY(3, maxEps)} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">
            Electronic
          </text>
        )}
        {/* Real part curve */}
        <path d={pathReal} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Imaginary part curve */}
        <path d={pathImag} fill="none" stroke={G.red} strokeWidth="1.5" strokeDasharray="6,3"/>
        {/* Legend */}
        <line x1={ox + plotW - 130} y1={30} x2={ox + plotW - 110} y2={30} stroke={G.gold} strokeWidth="2.5"/>
        <text x={ox + plotW - 105} y={33} fill={G.ltxt} fontSize="9" fontFamily="'IBM Plex Mono'">{"eps_r' (real)"}</text>
        <line x1={ox + plotW - 130} y1={44} x2={ox + plotW - 110} y2={44} stroke={G.red} strokeWidth="1.5" strokeDasharray="6,3"/>
        <text x={ox + plotW - 105} y={47} fill={G.ltxt} fontSize="9" fontFamily="'IBM Plex Mono'">{"eps_r'' (imag)"}</text>
      </svg>
    </div>
  );
}

function PolarizationMechanisms({ params, mid = "" }) {
  const w = 520, h = 280, ox = 10, barH = 40, gap = 12;
  const barW = 440;
  const startX = 60;

  const mechanisms = [
    { name: "Electronic", freq: "UV (~10^15 Hz)", color: G.blue, range: [13, 16], mag: 0.35, desc: "Electron cloud displacement" },
    { name: "Ionic", freq: "IR (~10^12 Hz)", color: G.grn, range: [10, 14], mag: 0.55, desc: "Ion sublattice shift" },
    { name: "Orientational", freq: "MW (~10^9 Hz)", color: G.gold, range: [6, 11], mag: 0.8, desc: "Permanent dipole alignment" },
    { name: "Interfacial", freq: "LF (~10^3 Hz)", color: G.red, range: [0, 5], mag: 1.0, desc: "Charge at interfaces" },
  ];

  const logToX = (logF) => startX + (logF / 18) * barW;
  const freqTicks = [0, 3, 6, 9, 12, 15, 18];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`-30 0 ${w + 30} ${h}`} style={{ width: "100%", maxWidth: w + 30, display: "block", margin: "0 auto" }}>
        <title>Polarization mechanisms with their frequency response ranges</title>
        <text x={w / 2} y="16" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Polarization Mechanisms and Frequency Ranges
        </text>
        {mechanisms.map((m, i) => {
          const y0 = 30 + i * (barH + gap);
          const x1 = logToX(m.range[0]);
          const x2 = logToX(m.range[1]);
          return (
            <g key={m.name}>
              <rect x={x1} y={y0} width={x2 - x1} height={barH} rx="4" fill={m.color} opacity="0.15" stroke={m.color} strokeWidth="1"/>
              <rect x={x1} y={y0} width={(x2 - x1) * m.mag} height={barH} rx="4" fill={m.color} opacity="0.3"/>
              <text x={x1 - 4} y={y0 + barH / 2 + 4} fill={m.color} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end" fontWeight="600">
                {m.name}
              </text>
              <text x={(x1 + x2) / 2} y={y0 + 15} fill={G.ltxt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
                {m.desc}
              </text>
              <text x={(x1 + x2) / 2} y={y0 + 30} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">
                {m.freq}
              </text>
            </g>
          );
        })}
        {/* Frequency axis at bottom */}
        <line x1={startX} y1={h - 30} x2={startX + barW} y2={h - 30} stroke={G.ax} strokeWidth="1"/>
        {freqTicks.map(logF => (
          <g key={logF}>
            <line x1={logToX(logF)} y1={h - 33} x2={logToX(logF)} y2={h - 27} stroke={G.ax} strokeWidth="1"/>
            <text x={logToX(logF)} y={h - 16} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">
              {`10^${logF}`}
            </text>
          </g>
        ))}
        <text x={startX + barW / 2} y={h - 3} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Frequency (Hz)
        </text>
      </svg>
    </div>
  );
}

function LossTangent({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.lossTangent, ...params };
  const w = 480, h = 260, ox = 55, oy = 220, plotW = 400, plotH = 180;
  const logFpeak = Math.log10(p.f_peak_Hz);

  const fToX = (logF) => ox + ((logF - 6) / 9) * plotW; // Show 10^6 to 10^15
  const tanToY = (val) => oy - (val / (p.peakHeight * 1.5)) * plotH;

  // Build loss tangent curve
  const pts = [];
  for (let logF = 6; logF <= 15; logF += 0.04) {
    const tanD = p.peakHeight * Math.exp(-Math.pow(logF - logFpeak, 2) / 0.6);
    pts.push({ x: fToX(logF), y: tanToY(tanD) });
  }
  const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  const freqTicks = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  // Peak point
  const peakX = fToX(logFpeak);
  const peakY = tanToY(p.peakHeight);

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Loss tangent versus frequency with adjustable peak</title>
        <defs>
          <marker id={`ah-lt-${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Loss Tangent vs Frequency
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-lt-${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 15} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-lt-${mid})`}/>
        {/* X-axis */}
        {freqTicks.map(logF => (
          <g key={logF}>
            <line x1={fToX(logF)} y1={oy} x2={fToX(logF)} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={fToX(logF)} y={oy + 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">
              {`10^${logF}`}
            </text>
          </g>
        ))}
        <text x={ox + plotW / 2} y={oy + 30} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Frequency (Hz)
        </text>
        {/* Y-axis */}
        <text x={15} y={oy - plotH / 2} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${oy - plotH / 2})`}>
          {"tan(delta)"}
        </text>
        {[0, 0.05, 0.1, 0.15].map(v => (
          <g key={v}>
            <line x1={ox - 4} y1={tanToY(v)} x2={ox} y2={tanToY(v)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={tanToY(v) + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">
              {v.toFixed(2)}
            </text>
          </g>
        ))}
        {/* Curve */}
        <path d={path} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Peak marker */}
        <circle cx={peakX} cy={peakY} r="4" fill={G.red}/>
        <line x1={peakX} y1={peakY + 6} x2={peakX} y2={oy} stroke={G.red} strokeWidth="1" strokeDasharray="4,3"/>
        <text x={peakX + 6} y={peakY - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">
          {`f_peak = ${p.f_peak_Hz.toExponential(0)} Hz`}
        </text>
        <text x={peakX + 6} y={peakY + 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">
          {`tan(d) = ${p.peakHeight}`}
        </text>
      </svg>
    </div>
  );
}

function ColeCole({ mid = "" }) {
  const w = 480, h = 300, ox = 55, oy = 240, plotW = 380, plotH = 180;
  // Debye semicircle: eps_rs = 10, eps_rinf = 2
  const epsS = 10, epsInf = 2;
  const cx = (epsS + epsInf) / 2; // center x = 6
  const radius = (epsS - epsInf) / 2; // radius = 4

  const epsToX = (epsR) => ox + ((epsR - 0) / 12) * plotW;
  const epsImagToY = (epsImag) => oy - (epsImag / 5) * plotH;

  // Build semicircle points (top half, since eps_r'' > 0)
  const pts = [];
  for (let theta = 0; theta <= Math.PI; theta += 0.02) {
    const epsReal = cx + radius * Math.cos(theta);
    const epsImag = radius * Math.sin(theta);
    pts.push({ x: epsToX(epsReal), y: epsImagToY(epsImag) });
  }
  const path = pts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  // Key points
  const peakX = epsToX(cx);
  const peakY = epsImagToY(radius);
  const staticX = epsToX(epsS);   // right intercept (low freq)
  const infX = epsToX(epsInf);    // left intercept (high freq)

  const xTicks = [0, 2, 4, 6, 8, 10, 12];
  const yTicks = [0, 1, 2, 3, 4, 5];

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Cole-Cole plot of complex permittivity</title>
        <defs>
          <marker id={`ah-cc-${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Cole-Cole Plot (Debye Relaxation)
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-cc-${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 15} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ah-cc-${mid})`}/>
        {/* X-axis ticks */}
        {xTicks.map(v => (
          <g key={v}>
            <line x1={epsToX(v)} y1={oy} x2={epsToX(v)} y2={oy + 4} stroke={G.ax} strokeWidth="1"/>
            <text x={epsToX(v)} y={oy + 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{v}</text>
          </g>
        ))}
        <text x={ox + plotW / 2} y={oy + 30} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"eps_r' (real)"}
        </text>
        {/* Y-axis ticks */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={ox - 4} y1={epsImagToY(v)} x2={ox} y2={epsImagToY(v)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={epsImagToY(v) + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={15} y={oy - plotH / 2} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${oy - plotH / 2})`}>
          {"eps_r'' (imag)"}
        </text>
        {/* Semicircle */}
        <path d={path} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        {/* Key annotations */}
        <circle cx={staticX} cy={oy} r="4" fill={G.blue}/>
        <text x={staticX} y={oy + 24} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"eps_rs"}</text>
        <circle cx={infX} cy={oy} r="4" fill={G.grn}/>
        <text x={infX} y={oy + 24} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{"eps_rinf"}</text>
        <circle cx={peakX} cy={peakY} r="4" fill={G.red}/>
        <text x={peakX + 8} y={peakY - 8} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">{"omega = 1/tau"}</text>
        {/* Center point */}
        <circle cx={epsToX(cx)} cy={oy} r="2" fill={G.txt}/>
        <line x1={epsToX(cx)} y1={oy} x2={peakX} y2={peakY} stroke={G.txt} strokeWidth="1" strokeDasharray="4,3" opacity="0.5"/>
        {/* Direction arrow at midpoint */}
        <text x={pts[Math.floor(pts.length * 0.25)].x - 14} y={pts[Math.floor(pts.length * 0.25)].y - 4} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" opacity="0.7">
          {"omega ->"}
        </text>
        {/* Legend */}
        <text x={ox + plotW - 60} y={oy - plotH + 10} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end" opacity="0.7">
          {"eps_rs = 10, eps_rinf = 2"}
        </text>
      </svg>
    </div>
  );
}

// ─── Interactive Animations ───

function PolarizationMechanismAnimation() {
  const [mechanism, setMechanism] = useState("electronic");
  const [freqLevel, setFreqLevel] = useState(0); // 0=Low, 1=Medium, 2=High
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const animRef = useRef(null);
  const lastRef = useRef(0);

  const freqLabels = ["Low", "Medium", "High"];
  const w = 500, h = 250;

  useEffect(() => {
    if (!playing) { if (animRef.current) cancelAnimationFrame(animRef.current); return; }
    const step = (ts) => {
      if (!lastRef.current) lastRef.current = ts;
      const dt = (ts - lastRef.current) / 1000;
      lastRef.current = ts;
      setTime(t => t + dt);
      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [playing]);

  // Frequency multiplier: Low=1, Medium=4, High=12
  const freqMult = [1, 4, 12][freqLevel];
  // Whether each mechanism can respond at current frequency
  const electronicResponds = true; // always responds
  const ionicResponds = freqLevel < 2; // frozen at High
  const orientationalResponds = freqLevel < 1; // frozen at Medium and High

  const renderElectronic = () => {
    const cx = 250, cy = 125;
    const displacement = electronicResponds ? Math.sin(time * freqMult * 2) * 18 : 0;
    return (
      <g>
        <text x={cx} y={28} fill={G.ltxt} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Electronic Polarization</text>
        {/* Nucleus */}
        <circle cx={cx} cy={cy} r="12" fill={G.gold} opacity="0.9"/>
        <text x={cx} y={cy + 4} fill="#000" fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">+</text>
        {/* Electron cloud */}
        <circle cx={cx + displacement} cy={cy} r="36" fill={G.blue} opacity="0.15" stroke={G.blue} strokeWidth="1.5" strokeDasharray="4,2"/>
        <text x={cx + displacement} y={cy - 40} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">e- cloud</text>
        {/* Dipole arrow when displaced */}
        {Math.abs(displacement) > 2 && (
          <line x1={cx} y1={cy + 50} x2={cx + displacement * 0.8} y2={cy + 50} stroke={G.red} strokeWidth="2" markerEnd="url(#anim-arrow)"/>
        )}
        {Math.abs(displacement) > 2 && (
          <text x={cx + displacement * 0.4} y={cy + 65} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">p</text>
        )}
        {/* E-field arrow */}
        <line x1={80} y1={200} x2={170} y2={200} stroke={G.gold} strokeWidth="2" markerEnd="url(#anim-arrow-gold)"/>
        <text x={130} y={220} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">E field</text>
        {/* Status */}
        <text x={cx} y={h - 10} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {playing ? "Responds at all frequencies" : "(paused)"}
        </text>
      </g>
    );
  };

  const renderIonic = () => {
    const cx = 250, cy = 125;
    const displacement = ionicResponds ? Math.sin(time * freqMult * 2) * 22 : 0;
    return (
      <g>
        <text x={cx} y={28} fill={G.ltxt} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Ionic Polarization</text>
        {/* Cation */}
        <circle cx={cx - 30 + displacement} cy={cy} r="16" fill={G.red} opacity="0.7"/>
        <text x={cx - 30 + displacement} y={cy + 5} fill="#fff" fontSize="12" fontFamily="'IBM Plex Mono'" textAnchor="middle">+</text>
        {/* Anion */}
        <circle cx={cx + 30 - displacement} cy={cy} r="20" fill={G.blue} opacity="0.7"/>
        <text x={cx + 30 - displacement} y={cy + 5} fill="#fff" fontSize="12" fontFamily="'IBM Plex Mono'" textAnchor="middle">-</text>
        {/* Spring connecting them */}
        <line x1={cx - 14 + displacement} y1={cy} x2={cx + 10 - displacement} y2={cy} stroke={G.ax} strokeWidth="1.5" strokeDasharray="3,2"/>
        {/* Labels */}
        <text x={cx - 30 + displacement} y={cy - 25} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">Cation</text>
        <text x={cx + 30 - displacement} y={cy - 28} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">Anion</text>
        {/* E-field arrow */}
        <line x1={80} y1={200} x2={170} y2={200} stroke={G.gold} strokeWidth="2" markerEnd="url(#anim-arrow-gold)"/>
        <text x={130} y={220} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">E field</text>
        {/* Status */}
        <text x={cx} y={h - 10} fill={ionicResponds ? G.grn : G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {!playing ? "(paused)" : ionicResponds ? "Ions follow the field" : "Frozen: too slow for this frequency"}
        </text>
      </g>
    );
  };

  const renderOrientational = () => {
    const cx = 250, cy = 120;
    // Angle of dipole: at low freq follows field, at high freq lags/frozen
    const targetAngle = Math.sin(time * freqMult * 2) * 0.8; // radians
    const angle = orientationalResponds ? targetAngle : (ionicResponds ? targetAngle * 0.2 : 0);
    const len = 40;
    const dx = Math.cos(angle) * len;
    const dy = Math.sin(angle) * len;
    return (
      <g>
        <text x={cx} y={28} fill={G.ltxt} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Orientational Polarization</text>
        {/* Dipole body */}
        <line x1={cx - dx} y1={cy - dy} x2={cx + dx} y2={cy + dy} stroke={G.gold} strokeWidth="4" strokeLinecap="round"/>
        {/* + end */}
        <circle cx={cx + dx} cy={cy + dy} r="8" fill={G.red} opacity="0.8"/>
        <text x={cx + dx} y={cy + dy + 4} fill="#fff" fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">+</text>
        {/* - end */}
        <circle cx={cx - dx} cy={cy - dy} r="8" fill={G.blue} opacity="0.8"/>
        <text x={cx - dx} y={cy - dy + 4} fill="#fff" fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">-</text>
        {/* Dipole moment arrow */}
        <line x1={cx} y1={cy + 60} x2={cx + dx * 0.6} y2={cy + 60} stroke={G.red} strokeWidth="2" markerEnd="url(#anim-arrow)"/>
        <text x={cx + dx * 0.3} y={cy + 78} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">p</text>
        {/* E-field arrow */}
        <line x1={80} y1={200} x2={170} y2={200} stroke={G.gold} strokeWidth="2" markerEnd="url(#anim-arrow-gold)"/>
        <text x={130} y={220} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">E field</text>
        {/* Status */}
        <text x={cx} y={h - 10} fill={orientationalResponds ? G.grn : G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {!playing ? "(paused)" : orientationalResponds ? "Dipole follows the field" : ionicResponds ? "Lags: partially follows" : "Frozen: cannot follow field"}
        </text>
      </g>
    );
  };

  const btnStyle = (active) => ({
    padding: "4px 10px", fontSize: "11px", fontFamily: "'IBM Plex Mono'",
    background: active ? G.gold : "transparent", color: active ? "#000" : G.ltxt,
    border: `1px solid ${active ? G.gold : G.ax}`, borderRadius: "4px", cursor: "pointer",
    marginRight: "6px",
  });

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px", alignItems: "center" }}>
        <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono'", color: G.txt, marginRight: "4px" }}>Mechanism:</span>
        {["electronic", "ionic", "orientational"].map(m => (
          <button key={m} style={btnStyle(mechanism === m)} onClick={e => { e.stopPropagation(); setMechanism(m); }}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono'", color: G.txt, marginLeft: "12px", marginRight: "4px" }}>Freq:</span>
        {freqLabels.map((label, i) => (
          <button key={label} style={btnStyle(freqLevel === i)} onClick={e => { e.stopPropagation(); setFreqLevel(i); }}>
            {label}
          </button>
        ))}
        <button className="ctrl-btn" style={{ marginLeft: "12px" }} onClick={e => { e.stopPropagation(); setPlaying(p => !p); if (!playing) lastRef.current = 0; }}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Animated polarization mechanism response to applied field</title>
        <defs>
          <marker id="anim-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke={G.red} strokeWidth="1"/>
          </marker>
          <marker id="anim-arrow-gold" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8" fill="none" stroke={G.gold} strokeWidth="1"/>
          </marker>
        </defs>
        {mechanism === "electronic" && renderElectronic()}
        {mechanism === "ionic" && renderIonic()}
        {mechanism === "orientational" && renderOrientational()}
      </svg>
    </div>
  );
}

function DielectricFrequencySweepAnimation({ params }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.dielectricVsFrequency, ...params };
  const [logFreq, setLogFreq] = useState(0);

  const w = 520, h = 340, ox = 60, oy = 250, plotW = 430, plotH = 210;
  const maxEps = 12;

  const fToX = (logF) => ox + (logF / 18) * plotW;
  const epsToY = (eps) => oy - (eps / maxEps) * plotH;

  // Compute eps_r' at a given log frequency (same formula as DielectricVsFrequency)
  const getEpsReal = (logF) => {
    let eps = 1;
    if (p.showElectronic) eps += 1.5 / (1 + Math.pow(10, 2 * (logF - 15)));
    if (p.showIonic) eps += 2.0 / (1 + Math.pow(10, 2 * (logF - 12.5)));
    if (p.showOrientational) eps += 4.0 / (1 + Math.pow(10, 2 * (logF - 9.5)));
    eps += 2.5 / (1 + Math.pow(10, 2 * (logF - 3)));
    return eps;
  };

  // Build curve path
  const realPts = [];
  for (let lf = 0; lf <= 18; lf += 0.05) {
    realPts.push({ logF: lf, eps: getEpsReal(lf), x: fToX(lf), y: epsToY(getEpsReal(lf)) });
  }
  const pathReal = realPts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");

  // Current dot position
  const currentEps = getEpsReal(logFreq);
  const dotX = fToX(logFreq);
  const dotY = epsToY(currentEps);

  // Mechanism drop-off labels: show when slider is near the drop-off
  const dropOffs = [
    { logF: 9.5, label: "Orientational drops out", show: p.showOrientational },
    { logF: 12.5, label: "Ionic drops out", show: p.showIonic },
    { logF: 15, label: "Electronic drops out", show: p.showElectronic },
  ];

  const freqTicks = [0, 3, 6, 9, 12, 15, 18];

  // Format frequency display
  const formatFreq = (lf) => {
    if (lf === 0) return "1 Hz";
    return `10^${lf.toFixed(1)} Hz`;
  };

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono'", color: G.txt }}>Frequency:</span>
        <input
          type="range" min="0" max="18" step="0.1" value={logFreq}
          onChange={e => setLogFreq(parseFloat(e.target.value))}
          onClick={e => e.stopPropagation()}
          style={{ flex: 1, minWidth: "120px", maxWidth: "260px", accentColor: G.gold }}
        />
        <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono'", color: G.gold, minWidth: "100px" }}>
          {formatFreq(logFreq)}
        </span>
        <span style={{ fontSize: "10px", fontFamily: "'IBM Plex Mono'", color: G.blue }}>
          {"eps_r' = " + currentEps.toFixed(2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Dielectric frequency sweep showing permittivity versus frequency</title>
        <defs>
          <marker id="ah-sweep" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          Frequency Sweep: Mechanism Drop-off Explorer
        </text>
        {/* Axes */}
        <line x1={ox} y1={oy} x2={ox + plotW + 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd="url(#ah-sweep)"/>
        <line x1={ox} y1={oy} x2={ox} y2={oy - plotH - 15} stroke={G.ax} strokeWidth="1" markerEnd="url(#ah-sweep)"/>
        {/* X-axis labels */}
        {freqTicks.map(logF => (
          <g key={logF}>
            <line x1={fToX(logF)} y1={oy} x2={fToX(logF)} y2={oy + 5} stroke={G.ax} strokeWidth="1"/>
            <text x={fToX(logF)} y={oy + 16} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
              {logF === 0 ? "1" : `10^${logF}`}
            </text>
          </g>
        ))}
        <text x={ox + plotW / 2} y={oy + 30} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          Frequency (Hz)
        </text>
        {/* Y-axis labels */}
        {[0, 3, 6, 9, 12].map(v => (
          <g key={v}>
            <line x1={ox - 4} y1={epsToY(v)} x2={ox} y2={epsToY(v)} stroke={G.ax} strokeWidth="1"/>
            <text x={ox - 8} y={epsToY(v) + 3} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <text x={15} y={oy - plotH / 2} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" transform={`rotate(-90,15,${oy - plotH / 2})`}>
          {"eps_r'"}
        </text>
        {/* Curve */}
        <path d={pathReal} fill="none" stroke={G.gold} strokeWidth="2" opacity="0.5"/>
        {/* Highlight curve up to current frequency */}
        {(() => {
          const activePts = realPts.filter(pt => pt.logF <= logFreq + 0.05);
          if (activePts.length < 2) return null;
          const activePath = activePts.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
          return <path d={activePath} fill="none" stroke={G.gold} strokeWidth="2.5"/>;
        })()}
        {/* Dot on curve */}
        <circle cx={dotX} cy={dotY} r="6" fill={G.gold} stroke="#fff" strokeWidth="1.5"/>
        {/* Vertical dashed line from dot to x-axis */}
        <line x1={dotX} y1={dotY + 8} x2={dotX} y2={oy} stroke={G.gold} strokeWidth="1" strokeDasharray="4,3" opacity="0.5"/>
        {/* Drop-off zone highlights */}
        {dropOffs.map(d => {
          if (!d.show) return null;
          const zoneX = fToX(d.logF);
          const nearby = Math.abs(logFreq - d.logF) < 2.5;
          return (
            <g key={d.logF}>
              {/* Vertical marker at drop-off frequency */}
              <line x1={zoneX} y1={oy - plotH} x2={zoneX} y2={oy} stroke={G.red} strokeWidth="1" strokeDasharray="3,4" opacity={nearby ? 0.7 : 0.2}/>
              {/* Label appears when nearby */}
              {nearby && (
                <g>
                  <rect x={zoneX - 65} y={oy - plotH - 2} width="130" height="16" rx="3" fill={G.red} opacity="0.15"/>
                  <text x={zoneX} y={oy - plotH + 10} fill={G.red} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
                    {d.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        {/* Readout box */}
        <rect x={ox + plotW - 150} y={oy - plotH + 5} width="145" height="42" rx="4" fill={G.bg} stroke={G.ax} strokeWidth="1" opacity="0.9"/>
        <text x={ox + plotW - 78} y={oy - plotH + 20} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"f = " + formatFreq(logFreq)}
        </text>
        <text x={ox + plotW - 78} y={oy - plotH + 36} fill={G.blue} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">
          {"eps_r' = " + currentEps.toFixed(2)}
        </text>
      </svg>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "polarization",
    tab: "Polarization",
    title: "1. Electric Polarization and Displacement",
    subtitle: "Macroscopic description of dielectric response",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Electric Polarization">
          <P>When an external electric field <M>{"\\mathbf{E}"}</M> is applied to a dielectric material, the bound charges (electrons, ions, dipoles) are displaced, creating a net <b>electric polarization</b> <M>{"\\mathbf{P}"}</M>, defined as the dipole moment per unit volume.</P>
          <Eq>{"\\mathbf{P} = N \\cdot \\mathbf{p}_{\\text{avg}}"}</Eq>
          <P>where <M>{"N"}</M> is the number density of polarizable entities (atoms, molecules, or ions) and <M>{"\\mathbf{p}_{\\text{avg}}"}</M> is the average induced dipole moment per entity.</P>
          <KeyConcept label="Polarization P">
            The polarization vector P (units: C/m^2) quantifies how much the bound charges in a material are displaced by an external field. It is the macroscopic manifestation of many microscopic induced dipoles.
          </KeyConcept>
        </Section>

        <Section title="Electric Displacement Field D">
          <P>The <b>electric displacement field</b> <M>{"\\mathbf{D}"}</M> is defined to account for both the free-space field and the material's polarization response:</P>
          <Eq>{"\\mathbf{D} = \\varepsilon_0 \\mathbf{E} + \\mathbf{P}"}</Eq>
          <P>For linear, isotropic dielectrics, <M>{"\\mathbf{P}"}</M> is proportional to <M>{"\\mathbf{E}"}</M>:</P>
          <Eq>{"\\mathbf{P} = \\chi_e \\varepsilon_0 \\mathbf{E}"}</Eq>
          <P>where <M>{"\\chi_e"}</M> is the <b>electric susceptibility</b> (dimensionless). Substituting:</P>
          <Eq>{"\\mathbf{D} = \\varepsilon_0 (1 + \\chi_e) \\mathbf{E} = \\varepsilon_r \\varepsilon_0 \\mathbf{E}"}</Eq>
          <KeyConcept label="Relative Permittivity">
            The relative permittivity (dielectric constant) is defined as the ratio of the material's permittivity to free-space permittivity. It measures how much the material amplifies the displacement field compared to vacuum.
          </KeyConcept>
          <Eq>{"\\varepsilon_r = 1 + \\chi_e"}</Eq>
        </Section>

        <Section title="Local Field and Clausius-Mossotti Relation">
          <P>The field actually experienced by an individual molecule inside a dielectric is not the applied field <M>{"\\mathbf{E}"}</M> but a <b>local field</b> <M>{"\\mathbf{E}_{\\text{loc}}"}</M> that includes contributions from surrounding polarized molecules. For a simple cubic arrangement, the Lorentz local field is:</P>
          <Eq>{"E_{\\text{loc}} = E + \\frac{P}{3\\varepsilon_0}"}</Eq>
          <P>The relationship between the macroscopic permittivity <M>{"\\varepsilon_r"}</M> and the microscopic polarizability <M>{"\\alpha_e"}</M> is given by the <b>Clausius-Mossotti relation</b>:</P>
          <Eq>{"\\frac{\\varepsilon_r - 1}{\\varepsilon_r + 2} = \\frac{N \\alpha_e}{3 \\varepsilon_0}"}</Eq>
          <KeyConcept label="Clausius-Mossotti Relation" tested>
            This equation bridges microscopic (atomic polarizability) and macroscopic (dielectric constant) properties. It is valid for non-polar materials with cubic symmetry or isotropic structure. For polar molecules (with permanent dipoles), modifications are needed.
          </KeyConcept>
          <P>The <b>induced dipole moment</b> of a single atom or molecule is:</P>
          <Eq>{"\\mathbf{p} = \\alpha_e \\mathbf{E}_{\\text{loc}}"}</Eq>
          <P>where <M>{"\\alpha_e"}</M> is the <b>electronic polarizability</b> (units: F m^2).</P>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="6" title="Ionic polarizability in KCl (bonus)" points="15 pts">
            <P>KCl (NaCl structure, a = 0.629 nm). Electronic polarizabilities: <M>{"\\alpha_e(K^+) = 0.92 \\times 10^{-40}"}</M> F m<M>{"^2"}</M>, <M>{"\\alpha_e(Cl^-) = 4.0 \\times 10^{-40}"}</M> F m<M>{"^2"}</M>. Dielectric constant at 1 MHz: <M>{"\\varepsilon_r = 4.80"}</M>.</P>
            <P>Find mean ionic polarizability <M>{"\\alpha_i"}</M> and <M>{"\\varepsilon_{rop}"}</M> at optical frequencies.</P>
            <CollapsibleBlock title="Solution">
              <P><b>Step 1: Number density.</b> KCl has the NaCl (rock salt) structure: FCC lattice with 4 K<M>{"^+"}</M>-Cl<M>{"^-"}</M> ion pairs per conventional unit cell (see <b>Bonding and Crystals</b> lesson for FCC packing).</P>
              <Eq>{"N = \\frac{4}{a^3} = \\frac{4}{(0.629 \\times 10^{-9})^3} = 1.607 \\times 10^{28} \\text{ m}^{-3}"}</Eq>
              <P><b>Step 2: Total polarizability via Clausius-Mossotti.</b> At 1 MHz, both electronic and ionic mechanisms are active (ionic resonance is at ~10<M>{"^{12}"}</M> Hz, far above 1 MHz). The Clausius-Mossotti relation (see above in this tab) maps macroscopic <M>{"\\varepsilon_r"}</M> to microscopic polarizability:</P>
              <Eq>{"\\frac{\\varepsilon_r - 1}{\\varepsilon_r + 2} = \\frac{N \\alpha_{\\text{total}}}{3\\varepsilon_0} \\quad\\Longrightarrow\\quad \\alpha_{\\text{total}} = \\frac{3\\varepsilon_0(\\varepsilon_r - 1)}{N(\\varepsilon_r + 2)}"}</Eq>
              <Eq>{"\\alpha_{\\text{total}} = \\frac{3(8.854 \\times 10^{-12})(3.80)}{(1.607 \\times 10^{28})(6.80)} = 9.235 \\times 10^{-40} \\text{ F m}^2"}</Eq>
              <P><b>Step 3: Extract ionic polarizability.</b> Per ion pair, total = electronic (both ions) + ionic:</P>
              <Eq>{"\\alpha_i = \\alpha_{\\text{total}} - \\alpha_e(K^+) - \\alpha_e(Cl^-) = 9.235 - 0.92 - 4.0 = 4.315 \\times 10^{-40} \\text{ F m}^2"}</Eq>
              <P>The ionic contribution (4.32) is comparable to the total electronic (4.92), typical for strongly ionic crystals.</P>
              <P><b>Step 4: Optical permittivity.</b> At optical frequencies (~10<M>{"^{14}"}</M>-10<M>{"^{15}"}</M> Hz), ionic polarization has frozen out. Only electronic contributions survive (see the stepwise drop in the <b>Frequency Dependence</b> tab):</P>
              <Eq>{"\\alpha_{\\text{opt}} = \\alpha_e(K^+) + \\alpha_e(Cl^-) = 4.92 \\times 10^{-40} \\text{ F m}^2"}</Eq>
              <P>Apply Clausius-Mossotti again with electronic polarizability only:</P>
              <Eq>{"\\frac{\\varepsilon_{rop} - 1}{\\varepsilon_{rop} + 2} = \\frac{N \\alpha_{\\text{opt}}}{3\\varepsilon_0} = 0.298 \\quad\\Longrightarrow\\quad \\varepsilon_{rop} = \\frac{1 + 2(0.298)}{1 - 0.298} \\approx 2.27"}</Eq>
              <svg viewBox="0 0 460 200" style={{ width: "100%", maxWidth: 460, display: "block", margin: "14px auto" }}>
                <text x="230" y="15" fill={G.ltxt} fontSize="11" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">Polarizability Breakdown (units: x10^-40 F m^2)</text>
                <text x="120" y="40" fill={G.gold} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">At 1 MHz</text>
                <text x="120" y="52" fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">er = 4.80</text>
                <rect x="80" y={160 - 9.2} width="80" height={9.2} fill={G.blue} opacity={0.8} rx="2" />
                <rect x="80" y={160 - 49.2} width="80" height={40} fill={G.grn} opacity={0.7} rx="2" />
                <rect x="80" y={160 - 92.4} width="80" height={43.2} fill={G.gold} opacity={0.35} rx="2" stroke={G.gold} strokeWidth="1.5" strokeDasharray="5,3" />
                <text x="168" y={160 - 2} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="start">K+ 0.92</text>
                <text x="168" y={160 - 27} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="start">Cl- 4.00</text>
                <text x="168" y={160 - 68} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="start" fontWeight="600">ai = 4.32</text>
                <text x="340" y="40" fill={G.red} fontSize="10" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">At Optical</text>
                <text x="340" y="52" fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace">erop = 2.27</text>
                <rect x="300" y={160 - 9.2} width="80" height={9.2} fill={G.blue} opacity={0.8} rx="2" />
                <rect x="300" y={160 - 49.2} width="80" height={40} fill={G.grn} opacity={0.7} rx="2" />
                <text x="388" y={160 - 2} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="start">K+ 0.92</text>
                <text x="388" y={160 - 27} fill={G.grn} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="start">Cl- 4.00</text>
                <line x1="70" y1="160" x2="420" y2="160" stroke={G.ax} strokeWidth="0.75" />
                <rect x="80" y="175" width="10" height="10" fill={G.blue} opacity={0.8} rx="1" />
                <text x="94" y="184" fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">Electronic (ae)</text>
                <rect x="215" y="175" width="10" height="10" fill={G.grn} opacity={0.7} rx="1" />
                <text x="229" y="184" fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">Electronic (ae)</text>
                <rect x="340" y="175" width="10" height="10" fill={G.gold} opacity={0.35} rx="1" stroke={G.gold} strokeDasharray="2,1" />
                <text x="354" y="184" fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">Ionic (solve for)</text>
              </svg>
              <KeyConcept label="Connections">
                This problem ties together three lesson themes. (1) <b>Clausius-Mossotti</b> (this tab) bridges microscopic polarizability and macroscopic <M>{"\\varepsilon_r"}</M>. (2) <b>Frequency dependence</b> (Tab 3): ionic polarization freezes out above ~10<M>{"^{12}"}</M> Hz, so the optical measurement isolates electronic contributions; the drop from 4.80 to 2.27 is the "step" in the <M>{"\\varepsilon_r'"}</M> vs. frequency graph. (3) <b>Optics</b>: the refractive index <M>{"n = \\sqrt{\\varepsilon_{rop}} \\approx 1.51"}</M> connects dielectric properties to optical behavior (Kasap Ch. 9).
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "mechanisms",
    tab: "Polarization Mechanisms",
    title: "2. Polarization Mechanisms",
    subtitle: "Four types of polarization and their frequency ranges",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Overview">
          <P>The total polarization of a material is the sum of contributions from several distinct mechanisms, each with its own characteristic frequency response:</P>
          <Eq>{"\\alpha_{\\text{total}} = \\alpha_e + \\alpha_i + \\alpha_d"}</Eq>
          <PolarizationMechanisms params={gp.polarizationMechanisms} mid="topic" />
        </Section>

        <Section title="Animated Mechanism Explorer">
          <P>Toggle between the three polarization mechanisms and adjust the frequency to see how each responds. At high frequencies, slower mechanisms freeze out.</P>
          <PolarizationMechanismAnimation />
        </Section>

        <Section title="Electronic Polarization">
          <P><b>Electronic polarization</b> arises from the displacement of the electron cloud relative to the nucleus of an atom under an applied electric field. It is present in all materials and is the fastest mechanism.</P>
          <Eq>{"\\alpha_e = 4\\pi \\varepsilon_0 R^3"}</Eq>
          <P>where <M>{"R"}</M> is the atomic radius. This expression comes from modeling the atom as a uniformly charged sphere. The resonant frequency is in the ultraviolet range (~<M>{"10^{15}"}</M> Hz).</P>
          <KeyConcept label="Electronic Polarizability">
            The polarizability scales with R^3, so larger atoms are more polarizable. This is why materials with heavier atoms (like Ge, Pb compounds) tend to have higher refractive indices and dielectric constants.
          </KeyConcept>
        </Section>

        <Section title="Ionic Polarization">
          <P><b>Ionic polarization</b> occurs in ionic crystals (e.g., NaCl, BaTiO3) where the cation and anion sublattices are displaced relative to each other by the applied field.</P>
          <P>The ionic polarizability depends on the ionic charges, the inter-ionic spacing, and the restoring force constant. It has a characteristic resonance frequency in the infrared range (~<M>{"10^{12}"}</M> to <M>{"10^{13}"}</M> Hz).</P>
          <KeyConcept label="Ionic Polarization">
            Ionic polarization is significant in materials with high ionicity, such as alkali halides and perovskite-structured ceramics. It contributes to the difference between optical and static dielectric constants.
          </KeyConcept>
        </Section>

        <Section title="Orientational (Dipolar) Polarization">
          <P><b>Orientational polarization</b> occurs in materials with permanent electric dipole moments (e.g., H2O, HCl). The applied field tends to align the dipoles, competing against thermal randomization.</P>
          <P>The average polarization is described by the <b>Langevin function</b>:</P>
          <Eq>{"L(x) = \\coth(x) - \\frac{1}{x}, \\quad x = \\frac{pE}{kT}"}</Eq>
          <P>For weak fields (<M>{"pE \\ll kT"}</M>), this simplifies to:</P>
          <Eq>{"\\alpha_d = \\frac{p^2}{3kT}"}</Eq>
          <P>where <M>{"p"}</M> is the permanent dipole moment, <M>{"k"}</M> is Boltzmann's constant, and <M>{"T"}</M> is absolute temperature. The characteristic relaxation frequency is in the microwave range (~<M>{"10^9"}</M> to <M>{"10^{10}"}</M> Hz).</P>
          <KeyConcept label="Temperature Dependence">
            Orientational polarizability decreases with increasing temperature (1/T dependence), since higher thermal energy randomizes dipole orientations more effectively. This is analogous to the Curie law in paramagnetism.
          </KeyConcept>
        </Section>

        <Section title="Interfacial (Space Charge) Polarization">
          <P><b>Interfacial polarization</b> (also called Maxwell-Wagner polarization) arises from the accumulation of charges at interfaces between regions of different conductivity or permittivity within a heterogeneous material.</P>
          <P>This is the slowest mechanism, active only at very low frequencies (below ~<M>{"10^3"}</M> Hz). Examples include grain boundaries in polycrystalline ceramics, polymer-filler composites, and multilayer capacitors.</P>
          <KeyConcept label="Interfacial Polarization">
            Interfacial polarization does not contribute to the atomic/molecular polarizability alpha. It is a macroscopic effect arising from charge migration and accumulation at internal boundaries.
          </KeyConcept>
        </Section>
      </div>
    ),
  },
  {
    id: "frequency",
    tab: "Frequency Dependence",
    title: "3. Frequency Dependence of Permittivity",
    subtitle: "Debye relaxation, loss tangent, Cole-Cole plots",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Complex Permittivity">
          <P>At AC frequencies, the dielectric response is described by a <b>complex relative permittivity</b>:</P>
          <Eq>{"\\varepsilon_r(\\omega) = \\varepsilon_r'(\\omega) - j\\varepsilon_r''(\\omega)"}</Eq>
          <P><M>{"\\varepsilon_r'"}</M> (real part) represents energy storage (capacitive behavior), while <M>{"\\varepsilon_r''"}</M> (imaginary part) represents energy dissipation (loss).</P>
          <DielectricVsFrequency params={gp.dielectricVsFrequency} mid="freq" />
          <P>As frequency increases, each polarization mechanism "drops out" when the field oscillates faster than the mechanism can follow. At each transition, <M>{"\\varepsilon_r'"}</M> decreases in a step, and <M>{"\\varepsilon_r''"}</M> shows a peak (absorption).</P>
          <P>Drag the frequency slider to explore the curve interactively. Labels appear near each mechanism's drop-off frequency.</P>
          <DielectricFrequencySweepAnimation params={gp.dielectricVsFrequency} />
          <CollapsibleBlock title="Wave Attenuation from Complex Permittivity">
            <P>When a plane wave propagates through the medium, the wave vector becomes complex:</P>
            <Eq>{"\\tilde{k} = \\frac{\\omega}{c}\\sqrt{\\varepsilon_r} = k' + ik''"}</Eq>
            <P>The imaginary part <M>{"k''"}</M> causes exponential decay of the field amplitude:</P>
            <Eq>{"E(z) = E_0\\, e^{-k''z}\\, e^{i(k'z - \\omega t)}"}</Eq>
            <P>Power decays as <M>{"e^{-2k''z}"}</M>. A larger <M>{"\\varepsilon_r''"}</M> means a larger <M>{"k''"}</M> and faster attenuation. This is the physical mechanism behind dielectric loss.</P>
          </CollapsibleBlock>
        </Section>

        <Section title="Debye Relaxation Model">
          <P>The <b>Debye model</b> describes the frequency response of a single relaxation mechanism (particularly orientational polarization):</P>
          <Eq>{"\\varepsilon_r(\\omega) = \\varepsilon_{r\\infty} + \\frac{\\varepsilon_{rs} - \\varepsilon_{r\\infty}}{1 + j\\omega\\tau}"}</Eq>
          <P>where <M>{"\\varepsilon_{rs}"}</M> is the static (DC) permittivity, <M>{"\\varepsilon_{r\\infty}"}</M> is the high-frequency permittivity, and <M>{"\\tau"}</M> is the relaxation time. Separating real and imaginary parts:</P>
          <Eq>{"\\varepsilon_r' = \\varepsilon_{r\\infty} + \\frac{\\varepsilon_{rs} - \\varepsilon_{r\\infty}}{1 + \\omega^2 \\tau^2}"}</Eq>
          <Eq>{"\\varepsilon_r'' = \\frac{(\\varepsilon_{rs} - \\varepsilon_{r\\infty})\\omega\\tau}{1 + \\omega^2 \\tau^2}"}</Eq>
          <KeyConcept label="Relaxation Time tau">
            The relaxation time characterizes how quickly the polarization mechanism responds. For orientational polarization, it depends on the viscosity of the medium, molecular size, and temperature. The loss peak occurs at the angular frequency omega = 1/tau.
          </KeyConcept>
        </Section>

        <Section title="Loss Tangent">
          <P>The <b>loss tangent</b> quantifies the ratio of energy dissipated to energy stored per cycle:</P>
          <Eq>{"\\tan \\delta = \\frac{\\varepsilon_r''}{\\varepsilon_r'}"}</Eq>
          <P>The loss angle <M>{"\\delta"}</M> is the angle by which the polarization current leads the ideal 90-degree capacitive current. A low <M>{"\\tan \\delta"}</M> indicates a good insulator with minimal energy loss.</P>
          <LossTangent params={gp.lossTangent} mid="freq" />
          <P>For the Debye model, <M>{"\\varepsilon_r''"}</M> peaks at <M>{"\\omega = 1/\\tau"}</M>. The loss tangent <M>{"\\tan\\delta"}</M> peaks at a slightly higher frequency: <M>{"\\omega_{\\text{peak}} = \\sqrt{\\varepsilon_{rs}/\\varepsilon_{r\\infty}}\\,/\\,\\tau"}</M>.</P>
        </Section>

        <Section title="Cole-Cole Plot">
          <P>A <b>Cole-Cole plot</b> graphs <M>{"\\varepsilon_r''"}</M> vs <M>{"\\varepsilon_r'"}</M> parametrically with frequency. For an ideal Debye relaxation, the result is a perfect semicircle:</P>
          <ColeCole mid="freq" />
          <ul className="info-list">
            <li>Center: at <M>{"((\\varepsilon_{rs} + \\varepsilon_{r\\infty})/2, \\; 0)"}</M> on the real axis</li>
            <li>Radius: <M>{"(\\varepsilon_{rs} - \\varepsilon_{r\\infty})/2"}</M></li>
            <li>Right intercept: <M>{"\\varepsilon_{rs}"}</M> (static limit, low <M>{"\\omega"}</M>)</li>
            <li>Left intercept: <M>{"\\varepsilon_{r\\infty}"}</M> (high-frequency limit, high <M>{"\\omega"}</M>)</li>
            <li>Peak of semicircle: at <M>{"\\omega = 1/\\tau"}</M></li>
          </ul>
          <KeyConcept label="Deviations from Debye Behavior">
            Real materials often show depressed semicircles (center below the real axis), indicating a distribution of relaxation times rather than a single <M>{"\\tau"}</M>. This is modeled by the Cole-Cole equation <M>{"\\varepsilon^* = \\varepsilon_{r\\infty} + (\\varepsilon_{rs} - \\varepsilon_{r\\infty})/(1 + (j\\omega\\tau)^{1-\\alpha})"}</M>, where <M>{"\\alpha = 0"}</M> recovers the ideal Debye semicircle and <M>{"\\alpha \\to 1"}</M> gives the broadest distribution.
          </KeyConcept>
        </Section>

        <Section title="Homework Problems">
          <HWQuestion hw="HW4" number="4" title="Wave attenuation in lossy dielectric" points="15 pts">
            <P>830 nm laser through atmosphere modeled as <M>{"\\varepsilon_r = 1 + i\\,1.14 \\times 10^{-11}"}</M>, thickness 8.5 km. Estimate power fraction delivered.</P>
            <CollapsibleBlock title="Solution">
              <P><b>Step 1: Identify the regime.</b> The imaginary part <M>{"\\varepsilon_r'' = 1.14 \\times 10^{-11}"}</M> is negligible compared to <M>{"\\varepsilon_r' = 1"}</M>. This is a <b>low-loss dielectric</b> (<M>{"\\varepsilon_r'' \\ll \\varepsilon_r'"}</M>), so we use the simplified attenuation formula.</P>
              <P><b>Step 2: Derive the attenuation constant.</b> From the complex wave vector (see "Wave Attenuation from Complex Permittivity" collapsible above), in the low-loss limit:</P>
              <Eq>{"k = \\frac{\\omega}{c}\\sqrt{\\varepsilon_r' - j\\varepsilon_r''} \\;\\approx\\; \\frac{\\omega}{c}\\sqrt{\\varepsilon_r'}\\left(1 - \\frac{j\\varepsilon_r''}{2\\varepsilon_r'}\\right)"}</Eq>
              <P>The imaginary part of <M>{"k"}</M> gives the field attenuation coefficient. Substituting <M>{"\\omega/c = 2\\pi/\\lambda"}</M>:</P>
              <Eq>{"\\alpha = \\text{Im}(k) = \\frac{\\pi \\varepsilon_r''}{\\lambda \\sqrt{\\varepsilon_r'}}"}</Eq>
              <P><b>Step 3: Calculate <M>{"\\alpha"}</M>.</b> With <M>{"\\varepsilon_r' = 1"}</M> (air):</P>
              <Eq>{"\\alpha = \\frac{\\pi \\times 1.14 \\times 10^{-11}}{830 \\times 10^{-9}} = 4.31 \\times 10^{-5} \\text{ Np/m}"}</Eq>
              <P><b>Step 4: Power fraction.</b> The electric field decays as <M>{"e^{-\\alpha z}"}</M>. Power is proportional to <M>{"E^2"}</M>, so it decays as <M>{"e^{-2\\alpha z}"}</M>:</P>
              <Eq>{"\\frac{P_{\\text{out}}}{P_{\\text{in}}} = e^{-2\\alpha z} = e^{-2(4.31 \\times 10^{-5})(8500)} = e^{-0.733} \\approx 0.48"}</Eq>
              <P>About <b>48% of the laser power</b> reaches the target after 8.5 km.</P>
              {(() => {
                const ox = 55, oy = 120, pw = 380, ph = 90;
                const xOf = (z) => ox + (z / 10000) * pw;
                const yOf = (p) => oy - p * ph;
                const curve = [];
                const area = [`M${ox},${oy}`];
                for (let z = 0; z <= 10000; z += 200) {
                  const x = xOf(z).toFixed(1);
                  const y = yOf(Math.exp(-2 * 4.315e-5 * z)).toFixed(1);
                  curve.push(`${z === 0 ? "M" : "L"}${x},${y}`);
                  area.push(`L${x},${y}`);
                }
                area.push(`L${xOf(10000).toFixed(1)},${oy} Z`);
                const zMark = 8500, pMark = Math.exp(-2 * 4.315e-5 * zMark);
                return (
                  <svg viewBox="0 0 480 155" style={{ width: "100%", maxWidth: 480, display: "block", margin: "14px auto" }}>
                    <text x="240" y="14" fill={G.ltxt} fontSize="11" textAnchor="middle" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">Power Transmission Through Atmosphere</text>
                    <path d={area.join(" ")} fill={G.gold} opacity={0.08} />
                    <path d={curve.join(" ")} fill="none" stroke={G.gold} strokeWidth="2" />
                    <line x1={ox} y1={oy} x2={ox + pw} y2={oy} stroke={G.ax} strokeWidth="1" />
                    <line x1={ox} y1={oy} x2={ox} y2={oy - ph - 5} stroke={G.ax} strokeWidth="1" />
                    {[0, 2, 4, 6, 8, 10].map(km => (
                      <g key={km}>
                        <line x1={xOf(km * 1000)} y1={oy} x2={xOf(km * 1000)} y2={oy + 4} stroke={G.ax} strokeWidth="0.75" />
                        <text x={xOf(km * 1000)} y={oy + 14} fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">{km}</text>
                      </g>
                    ))}
                    <text x={ox + pw / 2} y={oy + 26} fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'">Distance z (km)</text>
                    {[0, 0.25, 0.5, 0.75, 1.0].map(p => (
                      <g key={p}>
                        <line x1={ox - 4} y1={yOf(p)} x2={ox} y2={yOf(p)} stroke={G.ax} strokeWidth="0.75" />
                        <text x={ox - 8} y={yOf(p) + 3} fill={G.txt} fontSize="8" textAnchor="end" fontFamily="'IBM Plex Mono'">{p.toFixed(2)}</text>
                      </g>
                    ))}
                    <text x={ox - 30} y={oy - ph / 2} fill={G.txt} fontSize="9" textAnchor="middle" fontFamily="'IBM Plex Mono'" transform={`rotate(-90,${ox - 30},${oy - ph / 2})`}>P / P0</text>
                    <line x1={xOf(zMark)} y1={oy} x2={xOf(zMark)} y2={yOf(pMark)} stroke={G.red} strokeWidth="1" strokeDasharray="4,3" />
                    <line x1={ox} y1={yOf(pMark)} x2={xOf(zMark)} y2={yOf(pMark)} stroke={G.red} strokeWidth="1" strokeDasharray="4,3" />
                    <circle cx={xOf(zMark)} cy={yOf(pMark)} r="3.5" fill={G.red} />
                    <text x={xOf(zMark) + 6} y={yOf(pMark) - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" fontWeight="600">0.48 at 8.5 km</text>
                  </svg>
                );
              })()}
              <KeyConcept label="Connections">
                Even with <M>{"\\varepsilon_r'' \\approx 10^{-11}"}</M> (loss tangent <M>{"\\tan\\delta \\approx 10^{-11}"}</M>), half the power is lost over 8.5 km. This illustrates why long-distance fiber optics demand ultra-low-loss materials. The derivation uses the <b>low-loss approximation</b> of the complex wave vector discussed in the collapsible section above. Key subtlety: <M>{"\\alpha"}</M> is the <b>field</b> attenuation constant; the power attenuation constant is <M>{"2\\alpha"}</M> because power goes as <M>{"E^2"}</M>. This connects to the <b>Polarization Mechanisms</b> tab: at 830 nm (3.6 x 10<M>{"^{14}"}</M> Hz), only electronic polarization is active; the tiny <M>{"\\varepsilon_r''"}</M> comes from residual electronic absorption, not orientational or ionic mechanisms.
              </KeyConcept>
            </CollapsibleBlock>
          </HWQuestion>
        </Section>
      </div>
    ),
  },
  {
    id: "gauss-law",
    tab: "Gauss's Law and Capacitors",
    title: "4. Gauss's Law in Dielectrics and Capacitors",
    subtitle: "Boundary conditions, capacitance, breakdown, material comparison",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Gauss's Law for D">
          <P>In the presence of dielectric materials, <b>Gauss's law</b> is most conveniently written in terms of <M>{"\\mathbf{D}"}</M>, which has only free charges as its source:</P>
          <Eq>{"\\nabla \\cdot \\mathbf{D} = \\rho_{\\text{free}}"}</Eq>
          <P>In integral form:</P>
          <Eq>{"\\oint \\mathbf{D} \\cdot d\\mathbf{A} = Q_{\\text{free, enclosed}}"}</Eq>
          <P>This is powerful because we do not need to know the bound charge distribution explicitly; it is already captured in <M>{"\\varepsilon_r"}</M>.</P>
        </Section>

        <Section title="Boundary Conditions">
          <P>At the interface between two dielectric media (with no free surface charge):</P>
          <ul className="info-list">
            <li><b>Normal component of D is continuous</b>: <M>{"D_{n1} = D_{n2}"}</M></li>
            <li><b>Tangential component of E is continuous</b>: <M>{"E_{t1} = E_{t2}"}</M></li>
          </ul>
          <P>If there is a free surface charge density <M>{"\\sigma_f"}</M> at the interface:</P>
          <Eq>{"D_{n1} - D_{n2} = \\sigma_f"}</Eq>
          <KeyConcept label="Boundary Conditions">
            These conditions are direct consequences of Gauss's law for D and the fact that curl(E) = 0 for electrostatics. They are essential for solving problems involving layered dielectrics, dielectric coatings, and capacitor design.
          </KeyConcept>
        </Section>

        <Section title="Parallel Plate Capacitor with Dielectric">
          <P>Inserting a dielectric material between the plates of a parallel plate capacitor increases the capacitance by a factor of <M>{"\\varepsilon_r"}</M>:</P>
          <Eq>{"C = \\frac{\\varepsilon_r \\varepsilon_0 A}{d}"}</Eq>
          <P>where <M>{"A"}</M> is the plate area and <M>{"d"}</M> is the plate separation. The energy stored is:</P>
          <Eq>{"U = \\frac{1}{2} C V^2 = \\frac{1}{2} \\varepsilon_r \\varepsilon_0 E^2 \\cdot (\\text{Volume})"}</Eq>
          <P>The <b>energy density</b> in the dielectric is:</P>
          <Eq>{"u = \\frac{1}{2} \\varepsilon_r \\varepsilon_0 E^2 = \\frac{1}{2} \\mathbf{D} \\cdot \\mathbf{E}"}</Eq>
        </Section>

        <Section title="Dielectric Breakdown">
          <P>When the electric field exceeds a critical value <M>{"E_{\\text{br}}"}</M> (the <b>breakdown field</b> or dielectric strength), the material ceases to be an insulator. The mechanism depends on the material:</P>
          <ul className="info-list">
            <li><b>Electronic breakdown</b>: high-energy electrons ionize atoms, creating an avalanche</li>
            <li><b>Thermal breakdown</b>: dielectric losses cause heating, reducing resistivity, leading to runaway</li>
            <li><b>Electromechanical breakdown</b>: electrostatic pressure compresses the dielectric</li>
          </ul>
          <KeyConcept label="Dielectric Strength">
            Dielectric strength depends on material thickness (thinner samples often have higher E_br due to fewer defects), temperature, and frequency. It is a critical design parameter for capacitors and insulation in high-voltage applications.
          </KeyConcept>
        </Section>

        <Section title="Material Comparison">
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th><M>{"\\varepsilon_r"}</M></th>
                  <th><M>{"E_{\\text{br}}"}</M> (MV/m)</th>
                  <th>Applications</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Air</td><td>1.0006</td><td>3</td><td>Standard reference</td></tr>
                <tr><td>SiO2</td><td>3.9</td><td>500-700</td><td>IC gate oxide</td></tr>
                <tr><td>Polyethylene</td><td>2.3</td><td>50-300</td><td>Cable insulation</td></tr>
                <tr><td>PVDF</td><td>6-12</td><td>~80</td><td>Piezo films, sensors, energy harvesting</td></tr>
                <tr><td>Mica</td><td>5.4-8.7</td><td>40-200</td><td>Precision capacitors</td></tr>
                <tr><td>Al2O3</td><td>9.0</td><td>13-17</td><td>Substrates, spark plugs</td></tr>
                <tr><td>BaTiO3</td><td>1000-10000</td><td>~2-5</td><td>MLCCs, ferroelectric RAM</td></tr>
                <tr><td>HfO2 (high-k)</td><td>16-25</td><td>~500</td><td>Advanced CMOS gate oxide</td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept label="High-k Dielectrics">
            In modern CMOS technology, SiO2 gate oxides became too thin to prevent tunneling leakage. High-k dielectrics (like HfO2) provide the same capacitance with a physically thicker layer, reducing leakage while maintaining electrostatic control.
          </KeyConcept>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "mlcc_cross_section.jpg"} alt="Microscope cross-section of a multilayer ceramic capacitor showing alternating electrode layers and ceramic dielectric" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>MLCC cross-section (630V, 0.1uF): alternating metal electrode layers separated by ceramic dielectric, illustrating the parallel-plate capacitor principle at microscale. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 4.0</span></figcaption>
          </figure>
        </Section>
      </div>
    ),
  },
  {
    id: "piezoelectricity",
    tab: "Piezoelectricity",
    title: "5. Piezoelectricity",
    subtitle: "Direct and converse effects, quartz oscillators, applications",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="The Piezoelectric Effect">
          <P><b>Piezoelectricity</b> is the ability of certain crystalline materials to develop an electric polarization (and hence a voltage) when subjected to mechanical stress, and conversely, to deform mechanically when an electric field is applied.</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Direct Effect (Sensor)</h4>
              <P>Mechanical stress produces electric polarization:</P>
              <Eq>{"P = d \\cdot T"}</Eq>
              <P>where <M>{"d"}</M> is the piezoelectric coefficient (C/N) and <M>{"T"}</M> is the applied stress (Pa).</P>
            </div>
            <div className="compare-card">
              <h4>Converse Effect (Actuator)</h4>
              <P>Applied electric field produces mechanical strain:</P>
              <Eq>{"S = d \\cdot E"}</Eq>
              <P>where <M>{"d"}</M> is the same piezoelectric coefficient (m/V) and <M>{"E"}</M> is the applied field (V/m).</P>
            </div>
          </div>
          <KeyConcept label="Piezoelectric Coefficient d">
            The same coefficient d governs both direct and converse effects (thermodynamic reciprocity). Typical values: quartz d11 ~ 2.3 pC/N; PZT d33 ~ 300-600 pC/N. The subscripts refer to crystallographic directions (tensor notation).
          </KeyConcept>
        </Section>

        <Section title="Crystal Symmetry Requirement">
          <P>A crystal can be piezoelectric only if it <b>lacks a center of symmetry</b> (non-centrosymmetric). Of the 32 crystal point groups:</P>
          <ul className="info-list">
            <li>21 are non-centrosymmetric</li>
            <li>20 of those exhibit piezoelectricity (cubic class 432 is non-centrosymmetric but not piezoelectric due to other symmetry elements)</li>
            <li>10 of those are also pyroelectric (have a spontaneous polarization that changes with temperature)</li>
            <li>A subset of pyroelectrics are <b>ferroelectric</b>: spontaneous polarization can be reversed by an applied field</li>
          </ul>
          <KeyConcept label="Symmetry Hierarchy">
            All ferroelectrics are pyroelectric, and all pyroelectrics are piezoelectric, but the converse is not true. Quartz is piezoelectric but NOT pyroelectric or ferroelectric. BaTiO3 is all three.
          </KeyConcept>
        </Section>

        <Section title="Quartz Crystal Structure and Properties">
          <P><b>Quartz (SiO2)</b> is the most widely used piezoelectric material for precision frequency control. Key properties:</P>
          <ul className="info-list">
            <li>Trigonal crystal system (point group 32)</li>
            <li>Extremely high mechanical quality factor Q (~10^5 to 10^6)</li>
            <li>Excellent temperature stability (AT-cut has near-zero temperature coefficient near room temperature)</li>
            <li>Relatively small piezoelectric coefficient d11 ~ 2.3 pC/N</li>
            <li>Very stable and reproducible resonance frequency</li>
          </ul>
        </Section>

        <Section title="Quartz Oscillators">
          <P>A quartz crystal resonator operates at its <b>mechanical resonant frequency</b>, determined by its physical dimensions and the speed of sound in the crystal:</P>
          <Eq>{"f = \\frac{v}{2L}"}</Eq>
          <P>where <M>{"v"}</M> is the acoustic velocity in the crystal (direction-dependent) and <M>{"L"}</M> is the crystal thickness (for thickness-shear mode). A standard 32.768 kHz watch crystal uses a tuning-fork geometry.</P>
          <P>The <b>quality factor</b> Q determines how sharp the resonance is:</P>
          <Eq>{"Q = \\frac{f_{\\text{res}}}{\\Delta f}"}</Eq>
          <P>where <M>{"\\Delta f"}</M> is the bandwidth at half-power. High Q means very narrow bandwidth and precise frequency selection.</P>
          <KeyConcept label="Frequency Stability">
            Quartz oscillators achieve frequency stability of parts per million (ppm) or better. The AT-cut crystal orientation minimizes the frequency-temperature coefficient near 25 degrees C, making it ideal for electronic timing applications.
          </KeyConcept>
          <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
            <img src={IMG + "crystal_oscillator_internals.jpg"} alt="Internal components of a crystal oscillator at 16.257 MHz, showing the quartz crystal disc and circuit board" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
            <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Inside a Kyocera crystal oscillator: the quartz disc vibrates at a precise piezoelectric resonance frequency (16.257 MHz). <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 3.0</span></figcaption>
          </figure>
        </Section>

        <Section title="Applications">
          <P>Piezoelectric materials have diverse applications across many fields:</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Sensors</h4>
              <ul className="info-list">
                <li>Pressure sensors (direct effect)</li>
                <li>Accelerometers (vibration/shock)</li>
                <li>Force/load cells</li>
                <li>Microphones (audio transducers)</li>
              </ul>
            </div>
            <div className="compare-card">
              <h4>Actuators</h4>
              <ul className="info-list">
                <li>Piezo stacks (nanometer positioning)</li>
                <li>Inkjet printer heads</li>
                <li>Ultrasonic transducers (medical, sonar)</li>
                <li>Fuel injectors (diesel engines)</li>
              </ul>
            </div>
            <div className="compare-card">
              <h4>Frequency Control</h4>
              <ul className="info-list">
                <li>Quartz oscillators (watches, clocks)</li>
                <li>SAW (surface acoustic wave) filters</li>
                <li>RF bandpass filters</li>
                <li>Reference oscillators for PLLs</li>
              </ul>
            </div>
            <div className="compare-card">
              <h4>Energy Harvesting</h4>
              <ul className="info-list">
                <li>Vibration energy harvesters</li>
                <li>Piezoelectric floor tiles</li>
                <li>Self-powered wireless sensors</li>
                <li>MEMS power generators</li>
              </ul>
            </div>
          </div>
        </Section>
      </div>
    ),
  },
  // REQUIRED: last entry is always the graph-preview tab
  {
    id: "graph-preview",
    tab: "Key Variables/Equations/Graphs",
    title: "All Graphs",
    subtitle: "Screenshot this tab and send to the chatbot for visual review",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Variable Reference">
          <div className="data-table" style={{ fontSize: "12px" }}>
            <table>
              <thead><tr><th>Symbol</th><th>Name</th><th>Units</th></tr></thead>
              <tbody>
                <tr><td><M>{"\\mathbf{P}"}</M></td><td>Electric polarization (dipole moment / volume)</td><td>C/m<M>{"^2"}</M></td></tr>
                <tr><td><M>{"\\mathbf{D}"}</M></td><td>Electric displacement field</td><td>C/m<M>{"^2"}</M></td></tr>
                <tr><td><M>{"\\mathbf{E}"}</M></td><td>Electric field</td><td>V/m</td></tr>
                <tr><td><M>{"\\varepsilon_0"}</M></td><td>Permittivity of free space (8.854 x 10<M>{"^{-12}"}</M>)</td><td>F/m</td></tr>
                <tr><td><M>{"\\varepsilon_r"}</M></td><td>Relative permittivity (dielectric constant)</td><td>--</td></tr>
                <tr><td><M>{"\\chi_e"}</M></td><td>Electric susceptibility</td><td>--</td></tr>
                <tr><td><M>{"\\alpha_e,\\;\\alpha_i,\\;\\alpha_d"}</M></td><td>Electronic / ionic / orientational polarizability</td><td>F m<M>{"^2"}</M></td></tr>
                <tr><td><M>{"N"}</M></td><td>Number density of polarizable entities</td><td>m<M>{"^{-3}"}</M></td></tr>
                <tr><td><M>{"\\mathbf{p}"}</M></td><td>Electric dipole moment</td><td>C m</td></tr>
                <tr><td><M>{"E_{\\text{loc}}"}</M></td><td>Local field (Lorentz)</td><td>V/m</td></tr>
                <tr><td><M>{"\\varepsilon_r',\\;\\varepsilon_r''"}</M></td><td>Real (storage) / imaginary (loss) permittivity</td><td>--</td></tr>
                <tr><td><M>{"\\varepsilon_{rs},\\;\\varepsilon_{r\\infty}"}</M></td><td>Static (DC) / high-frequency permittivity</td><td>--</td></tr>
                <tr><td><M>{"\\tau"}</M></td><td>Relaxation time</td><td>s</td></tr>
                <tr><td><M>{"\\tan\\delta"}</M></td><td>Loss tangent (<M>{"\\varepsilon_r''/\\varepsilon_r'"}</M>)</td><td>--</td></tr>
                <tr><td><M>{"C"}</M></td><td>Capacitance</td><td>F</td></tr>
                <tr><td><M>{"E_{\\text{br}}"}</M></td><td>Dielectric breakdown field</td><td>V/m</td></tr>
                <tr><td><M>{"d"}</M></td><td>Piezoelectric coefficient</td><td>C/N = m/V</td></tr>
                <tr><td><M>{"T,\\;S"}</M></td><td>Mechanical stress / strain</td><td>Pa / --</td></tr>
                <tr><td><M>{"Q"}</M></td><td>Quality factor (<M>{"f_{\\text{res}}/\\Delta f"}</M>)</td><td>--</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Key Equations">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            <div>
              <P><b>Displacement field</b></P>
              <Eq>{"\\mathbf{D} = \\varepsilon_0 \\mathbf{E} + \\mathbf{P} = \\varepsilon_r \\varepsilon_0 \\mathbf{E}"}</Eq>
            </div>
            <div>
              <P><b>Susceptibility</b></P>
              <Eq>{"\\varepsilon_r = 1 + \\chi_e \\quad P = \\chi_e \\varepsilon_0 E"}</Eq>
            </div>
            <div>
              <P><b>Clausius-Mossotti</b></P>
              <Eq>{"\\frac{\\varepsilon_r - 1}{\\varepsilon_r + 2} = \\frac{N\\alpha_e}{3\\varepsilon_0}"}</Eq>
            </div>
            <div>
              <P><b>Debye relaxation</b></P>
              <Eq>{"\\varepsilon_r(\\omega) = \\varepsilon_{r\\infty} + \\frac{\\varepsilon_{rs} - \\varepsilon_{r\\infty}}{1 + j\\omega\\tau}"}</Eq>
            </div>
            <div>
              <P><b>Loss tangent</b></P>
              <Eq>{"\\tan\\delta = \\frac{\\varepsilon_r''}{\\varepsilon_r'}"}</Eq>
            </div>
            <div>
              <P><b>Capacitance</b></P>
              <Eq>{"C = \\frac{\\varepsilon_r \\varepsilon_0 A}{d}"}</Eq>
            </div>
            <div>
              <P><b>Piezoelectric (direct / converse)</b></P>
              <Eq>{"P = d \\cdot T \\qquad S = d \\cdot E"}</Eq>
            </div>
            <div>
              <P><b>Quartz resonator</b></P>
              <Eq>{"f = \\frac{v}{2L}"}</Eq>
            </div>
            <div>
              <P><b>Orientational polarizability</b></P>
              <Eq>{"\\alpha_d = \\frac{p^2}{3kT}"}</Eq>
            </div>
            <div>
              <P><b>Lorentz local field</b></P>
              <Eq>{"E_{\\text{loc}} = E + \\frac{P}{3\\varepsilon_0}"}</Eq>
            </div>
          </div>
        </Section>
        <Section title="1. Dielectric Permittivity vs Frequency">
          <DielectricVsFrequency params={gp.dielectricVsFrequency} mid="gp1" />
        </Section>
        <Section title="2. Polarization Mechanisms and Frequency Ranges">
          <PolarizationMechanisms params={gp.polarizationMechanisms} mid="gp2" />
        </Section>
        <Section title="3. Loss Tangent vs Frequency">
          <LossTangent params={gp.lossTangent} mid="gp3" />
        </Section>
        <Section title="4. Cole-Cole Plot">
          <ColeCole mid="gp4" />
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

    // Auto-detect EE notation
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

// ─── Chatbot Component (copy verbatim, update buildSystemPrompt) ───

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
    return `You are a concise tutor for ECE 109 (Principles of Electronic Materials) at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Labeled axes, clear annotations. -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/dielectrics.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/dielectrics.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/dielectrics.jsx now.`;
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
                {sessionStatus === "ready" && "Session active. Ask about dielectric materials, polarization, piezoelectricity, or tell me to edit the graphs. Click or highlight content to attach as context."}
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

// ─── Main App (copy verbatim, update header) ───

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
          <h1>Dielectric Materials and Piezoelectricity</h1>
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
