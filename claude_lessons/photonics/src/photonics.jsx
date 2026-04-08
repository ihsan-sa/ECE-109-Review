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
  "laser-fundamentals": `Topic: Laser Fundamentals. Covers: stimulated vs spontaneous emission, Einstein A and B coefficients (B_{12} = B_{21}, A_{21}/B_{21} = 8*pi*h*f^3/c^3), population inversion (N_2 > N_1), gain medium, Fabry-Perot cavity with mirrors R_1, R_2, threshold condition: R_1*R_2*exp(2*(g_th - alpha_i)*L) = 1, laser rate equations: dN/dt = J/(e*d) - N/tau - v_g*g*S, dS/dt = Gamma*v_g*g*S - S/tau_p + Gamma*beta*N/tau_r, longitudinal mode spacing Delta_lambda = lambda^2/(2*n*L).`,
  "semiconductor-lasers": `Topic: Semiconductor Lasers. Covers: direct vs indirect bandgap (GaAs E_g=1.42eV, InP E_g=1.35eV, Si is indirect), double heterostructure (AlGaAs/GaAs/AlGaAs for carrier + optical confinement), quantum well lasers (2D step DOS, lower threshold), separate confinement heterostructure (SCH), threshold current density J_th, differential quantum efficiency eta_d = eta_i * alpha_m/(alpha_m + alpha_i), slope efficiency eta_s = eta_d * hf/e [W/A], L-I curve (linear above threshold), VCSEL vs edge-emitting geometry.`,
  "qd-lasers": `Topic: Quantum Dot Lasers. Covers: quantum confinement progression 3D->2D->1D->0D (bulk, QW, QWire, QD), QD DOS as delta functions (atom-like), InAs/GaAs self-assembled QDs via Stranski-Krastanov growth (wetting layer + islands, size ~5nm height x 20nm base), inhomogeneous broadening from size distribution, advantages: ultra-low threshold, high T_0 > 200K vs ~50K for QW, broad gain bandwidth, reduced alpha_H factor, QD lasers on Si for O-band 1310nm data center applications, epitaxial growth on Si via buffer layers.`,
  "silicon-photonics": `Topic: Silicon Photonics. Covers: CMOS fab compatibility, Si transparent at 1.3/1.55um telecom wavelengths, high index n=3.48 for strong confinement, SOI platform (Si on SiO2, n_core=3.48, n_clad=1.44), waveguide types (strip ~450x220nm, rib, slot), propagation loss ~1-2 dB/cm, grating couplers (periodic perturbation, angle/wavelength selective) vs edge couplers (broadband mode size converter), ring resonators (transmission T, FSR = lambda^2/(n_g*2*pi*R), quality factor Q), Mach-Zehnder interferometer.`,
  "modulators": `Topic: Optical Modulators. Covers: Pockels effect in LiNbO3 (Delta_n = -n^3*r*E/2), plasma dispersion in Si (free carrier effect for Delta_n), MZ modulator (push-pull, V_pi*L figure of merit, traveling wave electrode), ring modulator (resonance shift Delta_lambda = lambda*Delta_n/n_g, compact but narrow bandwidth), electro-absorption modulator (Franz-Keldysh in bulk, QCSE in MQW), bandwidth limits (RC, transit time), modulation formats (OOK, PAM-4, coherent QPSK/16QAM).`,
  "photodetectors": `Topic: Photodetectors. Covers: PIN photodiode (reverse bias, depletion absorption, e-h pair sweep), responsivity R = eta*e/(h*f) [A/W], quantum efficiency eta, bandwidth (transit time tau_tr = w/v_sat, RC time tau_RC), bandwidth-efficiency tradeoff, APD (impact ionization, multiplication M, excess noise factor F(M)), Ge-on-Si PDs (Ge absorbs at 1550nm, R ~ 1 A/W), UTC photodiode (only electrons transit, faster).`,
  "integration": `Topic: Photonic Integration. Covers: photonic integrated circuits (PICs), III-V on Si approaches: hybrid bonding, heterogeneous integration, monolithic epitaxy (threading dislocations challenge), InP PIC platform (laser + SOA + modulator + detector monolithic), transceiver architecture (TX: laser->modulator->MUX, RX: DEMUX->PD->TIA), applications: 400G/800G data center interconnects, coherent long-haul (DP-QPSK/16QAM), LiDAR (FMCW on-chip beam steering), biosensing (ring resonator shift), co-packaged optics (CPO).`,
  "graph-preview": `Graph Preview tab. Shows all lesson graphs for visual inspection. The user can screenshot this tab and send it to the chatbot for review and corrections.`,
};

const LESSON_CONTEXT = `This is ECE 109 (Principles of Electronic Materials for Engineering) supplementary material on photonics at the University of Waterloo, Winter 2026. This lesson covers laser physics, semiconductor lasers, quantum dot lasers, silicon photonics, optical modulators, photodetectors, and photonic integration. Primary textbook: Kasap Ch. 3.10-3.12, supplemented by Coldren "Diode Lasers and Photonic ICs", Saleh & Teich "Fundamentals of Photonics", and Soref/Reed for SiPh. The student wants to LEARN the concepts and equations to build intuition for photonic devices and systems. NEVER solve homework problems or give numerical answers. Instead, explain concepts, clarify equations, help with derivation steps, and point out common mistakes.`;

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
  laserLICurve: { Ith_mA: 10, slopeEfficiency: 0.3, showSpontaneous: true },
  gainSpectrum: { showBulk: true, showQW: true, showQD: true },
  ringResonator: { radius_um: 5, ng: 4.2, neff: 2.4, coupling: 0.15, loss_dB_cm: 2 },
  mzModulator: { Vpi: 3.5, insertionLoss_dB: 4, extinctionRatio_dB: 25 },
};

// ─── Graph Components ───

function LaserLICurve({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.laserLICurve, ...params };
  const w = 480, h = 280, ox = 60, oy = 240;
  const maxI = p.Ith_mA * 4;
  const maxP = p.slopeEfficiency * (maxI - p.Ith_mA) * 1.2;
  const scX = (w - ox - 20) / maxI;
  const scY = (oy - 30) / maxP;

  let spontPath = "";
  let stimPath = "";
  const stepI = maxI / 300;

  for (let i = 0; i <= maxI; i += stepI) {
    const x = ox + i * scX;
    if (i <= p.Ith_mA) {
      const pSpon = 0.001 * p.slopeEfficiency * Math.pow(i / p.Ith_mA, 3) * p.Ith_mA;
      const y = oy - pSpon * scY;
      spontPath += spontPath ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    }
    if (i >= p.Ith_mA) {
      const pStim = p.slopeEfficiency * (i - p.Ith_mA);
      const y = oy - pStim * scY;
      stimPath += stimPath ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    }
  }

  const ithX = ox + p.Ith_mA * scX;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Laser L-I curve showing threshold current and slope efficiency</title>
        <defs>
          <marker id={`ahLI${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Laser L-I Characteristic</text>
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahLI${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahLI${mid})`}/>
        <text x={w - 10} y={oy + 18} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">I (mA)</text>
        <text x={ox - 8} y={24} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">P (mW)</text>
        {p.showSpontaneous && <path d={spontPath} fill="none" stroke={G.blue} strokeWidth="1.5" strokeDasharray="4,3"/>}
        <path d={stimPath} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        <line x1={ithX} y1={oy} x2={ithX} y2={30} stroke={G.red} strokeWidth="1" strokeDasharray="4,3"/>
        <text x={ithX} y={oy + 16} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">I_th</text>
        {[0, 1, 2, 3, 4].map(k => {
          const val = k * p.Ith_mA;
          if (val > maxI) return null;
          const xp = ox + val * scX;
          return <g key={k}><line x1={xp} y1={oy} x2={xp} y2={oy + 4} stroke={G.ax} strokeWidth="1"/><text x={xp} y={oy + 14} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{val}</text></g>;
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f, k) => {
          const val = f * maxP;
          const yp = oy - val * scY;
          if (yp < 25) return null;
          return <g key={k}><line x1={ox - 4} y1={yp} x2={ox} y2={yp} stroke={G.ax} strokeWidth="1"/><text x={ox - 8} y={yp + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{val.toFixed(1)}</text></g>;
        })}
        <text x={w - 60} y={60} fill={G.gold} fontSize="9" fontFamily="'IBM Plex Mono'">Stimulated</text>
        {p.showSpontaneous && <text x={ox + 20} y={oy - 20} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Spontaneous</text>}
        <rect x={ox + 1} y={30} width={ithX - ox - 1} height={oy - 31} fill={G.blue} opacity="0.04"/>
        <rect x={ithX} y={30} width={w - 30 - ithX} height={oy - 31} fill={G.gold} opacity="0.04"/>
        <text x={(ox + ithX) / 2} y={oy - 8} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">Below threshold</text>
        <text x={(ithX + w - 30) / 2} y={oy - 8} fill={G.gold} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">Lasing</text>
      </svg>
    </div>
  );
}

function GainSpectrum({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.gainSpectrum, ...params };
  const w = 480, h = 280, ox = 60, oy = 240;
  const scX = (w - ox - 30) / 0.6;
  const scY = (oy - 40) / 1.1;
  const eMin = 0.8, eMax = 1.4;

  const bulkGain = (E) => {
    const ec = 1.0;
    if (E < ec) return 0;
    const x = (E - ec) / 0.15;
    return 0.6 * Math.sqrt(x) * Math.exp(-x * 0.8);
  };

  const qwGain = (E) => {
    const ec = 1.02;
    if (E < ec) return 0;
    const step = 1.0 / (1 + Math.exp(-(E - ec) * 80));
    const decay = Math.exp(-(E - ec) * 5);
    return 0.85 * step * decay;
  };

  const qdGain = (E) => {
    const centers = [1.05, 1.12, 1.19];
    const sigmas = [0.012, 0.015, 0.013];
    const amps = [1.0, 0.65, 0.35];
    let g = 0;
    for (let i = 0; i < centers.length; i++) {
      g += amps[i] * Math.exp(-0.5 * Math.pow((E - centers[i]) / sigmas[i], 2));
    }
    return g;
  };

  const buildPath = (fn) => {
    let d = "";
    for (let E = eMin; E <= eMax; E += 0.002) {
      const x = ox + (E - eMin) * scX;
      const y = oy - fn(E) * scY;
      d += d ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return d;
  };

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Optical gain spectrum for bulk, quantum well, and quantum dot</title>
        <defs>
          <marker id={`ahGS${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Material Gain Spectrum: Bulk vs QW vs QD</text>
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahGS${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahGS${mid})`}/>
        <text x={w - 10} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">Photon Energy (eV)</text>
        <text x={ox - 8} y={24} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">g(E)</text>
        {[0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4].map(e => {
          const x = ox + (e - eMin) * scX;
          return <g key={e}><line x1={x} y1={oy} x2={x} y2={oy + 4} stroke={G.ax} strokeWidth="1"/><text x={x} y={oy + 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{e.toFixed(1)}</text></g>;
        })}
        {p.showBulk && <path d={buildPath(bulkGain)} fill="none" stroke={G.blue} strokeWidth="2"/>}
        {p.showQW && <path d={buildPath(qwGain)} fill="none" stroke={G.grn} strokeWidth="2"/>}
        {p.showQD && <path d={buildPath(qdGain)} fill="none" stroke={G.red} strokeWidth="2"/>}
        {p.showBulk && <text x={ox + (1.15 - eMin) * scX} y={oy - bulkGain(1.15) * scY - 6} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Bulk</text>}
        {p.showQW && <text x={ox + (1.08 - eMin) * scX + 25} y={oy - qwGain(1.08) * scY - 6} fill={G.grn} fontSize="9" fontFamily="'IBM Plex Mono'">QW</text>}
        {p.showQD && <text x={ox + (1.05 - eMin) * scX + 2} y={oy - qdGain(1.05) * scY - 8} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">QD</text>}
        {/* Telecom wavelength band annotations */}
        {(() => {
          const eCband = 0.8;  // 1550nm C-band
          const eOband = 0.947; // 1310nm O-band (E = 1240/1310)
          const xC = ox + (eCband - eMin) * scX;
          const xO = ox + (eOband - eMin) * scX;
          return <>
            <line x1={xO} y1={oy - 2} x2={xO} y2={30} stroke={G.txt} strokeWidth="0.8" strokeDasharray="3,4" opacity="0.5"/>
            <text x={xO} y={26} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">O-band</text>
            <text x={xO} y={34} fill={G.txt} fontSize="7" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.5">1310nm</text>
            {xC > ox && <>
              <line x1={xC} y1={oy - 2} x2={xC} y2={30} stroke={G.txt} strokeWidth="0.8" strokeDasharray="3,4" opacity="0.5"/>
              <text x={xC + 12} y={26} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.7">C-band</text>
              <text x={xC + 12} y={34} fill={G.txt} fontSize="7" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.5">1550nm</text>
            </>}
          </>;
        })()}
      </svg>
    </div>
  );
}

function RingResonatorResponse({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.ringResonator, ...params };
  const w = 500, h = 300, ox = 65, oy = 260;

  const R_m = p.radius_um * 1e-6;
  const L_ring = 2 * Math.PI * R_m;
  const alpha_per_m = p.loss_dB_cm * 100 / (10 * Math.log10(Math.E));
  const a = Math.exp(-alpha_per_m * L_ring / 2);
  const r = Math.sqrt(1 - p.coupling);

  const lambdaCenter = 1.55;
  const FSR_nm = (lambdaCenter * lambdaCenter * 1000) / (p.ng * L_ring * 1e6);
  const span = FSR_nm * 3.5;
  const lambdaMin = lambdaCenter * 1000 - span / 2;
  const lambdaMax = lambdaCenter * 1000 + span / 2;

  const scX = (w - ox - 25) / span;
  const minT_dB = -30;
  const scY = (oy - 40) / (-minT_dB);

  const transmission = (lam_nm) => {
    const lam_m = lam_nm * 1e-9;
    const phi = 2 * Math.PI * p.neff * L_ring / lam_m;
    const num = r * r - 2 * r * a * Math.cos(phi) + a * a;
    const den = 1 - 2 * r * a * Math.cos(phi) + r * r * a * a;
    return num / den;
  };

  let throughPath = "";
  const step = span / 500;
  for (let lam = lambdaMin; lam <= lambdaMax; lam += step) {
    const T = transmission(lam);
    const T_dB = Math.max(10 * Math.log10(T), minT_dB);
    const x = ox + (lam - lambdaMin) * scX;
    const y = oy - (-T_dB) * scY;
    throughPath += throughPath ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
  }

  const resLam1 = lambdaCenter * 1000;
  const resLam2 = resLam1 + FSR_nm;

  const T_res = transmission(resLam1);
  const T_res_dB = 10 * Math.log10(T_res);
  const halfT = (1 + T_res) / 2;
  let fwhm = 0;
  for (let dl = 0; dl < FSR_nm; dl += 0.001) {
    if (transmission(resLam1 + dl) >= halfT) { fwhm = dl * 2; break; }
  }

  const fsrX1 = ox + (resLam1 - lambdaMin) * scX;
  const fsrX2 = ox + (resLam2 - lambdaMin) * scX;
  const fsrY = oy - 5 * scY;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Ring resonator transmission and through-port response</title>
        <defs>
          <marker id={`ahRR${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Ring Resonator Through-Port Response</text>
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahRR${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahRR${mid})`}/>
        <text x={w - 10} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">Wavelength (nm)</text>
        <text x={ox - 6} y={24} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">T (dB)</text>
        {[0, -5, -10, -15, -20, -25, -30].map(db => {
          const y = oy - (-db) * scY;
          return <g key={db}><line x1={ox - 4} y1={y} x2={ox} y2={y} stroke={G.ax} strokeWidth="1"/><text x={ox - 8} y={y + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{db}</text>{db !== 0 && <line x1={ox} y1={y} x2={w - 25} y2={y} stroke={G.ax} strokeWidth="0.3" strokeDasharray="2,4"/>}</g>;
        })}
        {[lambdaMin, lambdaMin + span * 0.25, lambdaMin + span * 0.5, lambdaMin + span * 0.75, lambdaMax].map(l => {
          const x = ox + (l - lambdaMin) * scX;
          return <g key={l}><line x1={x} y1={oy} x2={x} y2={oy + 4} stroke={G.ax} strokeWidth="1"/><text x={x} y={oy + 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{l.toFixed(1)}</text></g>;
        })}
        <path d={throughPath} fill="none" stroke={G.gold} strokeWidth="2"/>
        <line x1={fsrX1} y1={fsrY} x2={fsrX2} y2={fsrY} stroke={G.red} strokeWidth="1"/>
        <line x1={fsrX1} y1={fsrY - 5} x2={fsrX1} y2={fsrY + 5} stroke={G.red} strokeWidth="1"/>
        <line x1={fsrX2} y1={fsrY - 5} x2={fsrX2} y2={fsrY + 5} stroke={G.red} strokeWidth="1"/>
        <text x={(fsrX1 + fsrX2) / 2} y={fsrY - 8} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">FSR = {FSR_nm.toFixed(1)} nm</text>
        {fwhm > 0 && <text x={fsrX1 + 5} y={oy - (-T_res_dB) * scY + 15} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'">FWHM ~ {fwhm.toFixed(2)} nm</text>}
        <text x={w - 80} y={40} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">R = {p.radius_um} um</text>
        <text x={w - 80} y={52} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">kappa = {p.coupling}</text>
        <text x={w - 80} y={64} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">n_g = {p.ng}</text>
      </svg>
    </div>
  );
}

function MZModulatorTransfer({ params, mid = "" }) {
  const p = { ...DEFAULT_GRAPH_PARAMS.mzModulator, ...params };
  const w = 480, h = 280, ox = 60, oy = 240;
  const vMin = -2 * p.Vpi, vMax = 2 * p.Vpi;
  const scX = (w - ox - 25) / (vMax - vMin);
  const IL = Math.pow(10, -p.insertionLoss_dB / 10);
  const ER = Math.pow(10, -p.extinctionRatio_dB / 10);
  const scY = (oy - 40) / 1.1;

  let curvePath = "";
  const step = (vMax - vMin) / 400;
  for (let v = vMin; v <= vMax; v += step) {
    const cosVal = Math.cos(Math.PI * v / (2 * p.Vpi));
    const T = IL * ((1 - ER) * cosVal * cosVal + ER);
    const x = ox + (v - vMin) * scX;
    const y = oy - T * scY;
    curvePath += curvePath ? ` L${x.toFixed(1)},${y.toFixed(1)}` : `M${x.toFixed(1)},${y.toFixed(1)}`;
  }

  const vQuad = p.Vpi / 2;
  const xQuad = ox + (vQuad - vMin) * scX;
  const tQuad = IL * ((1 - ER) * Math.pow(Math.cos(Math.PI * vQuad / (2 * p.Vpi)), 2) + ER);
  const yQuad = oy - tQuad * scY;

  const xVpi = ox + (p.Vpi - vMin) * scX;
  const xZero = ox + (0 - vMin) * scX;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Mach-Zehnder modulator transfer function showing extinction ratio</title>
        <defs>
          <marker id={`ahMZ${mid}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke={G.ax} strokeWidth="1"/>
          </marker>
        </defs>
        <text x={w / 2} y="14" fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">MZ Modulator Transfer Function</text>
        <line x1={ox} y1={oy} x2={w - 10} y2={oy} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahMZ${mid})`}/>
        <line x1={ox} y1={oy} x2={ox} y2={20} stroke={G.ax} strokeWidth="1" markerEnd={`url(#ahMZ${mid})`}/>
        <text x={w - 10} y={oy + 16} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">V (applied)</text>
        <text x={ox - 6} y={24} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="end">P_out/P_in</text>
        <line x1={xZero} y1={oy} x2={xZero} y2={30} stroke={G.ax} strokeWidth="0.5" strokeDasharray="3,3"/>
        {[-2, -1, 0, 1, 2].map(k => {
          const v = k * p.Vpi;
          const x = ox + (v - vMin) * scX;
          return <g key={k}><line x1={x} y1={oy} x2={x} y2={oy + 4} stroke={G.ax} strokeWidth="1"/><text x={x} y={oy + 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{k === 0 ? "0" : `${k}Vpi`}</text></g>;
        })}
        {[0, 0.25, 0.5, 0.75, 1.0].map(f => {
          const y = oy - f * IL * scY;
          return <g key={f}><line x1={ox - 4} y1={y} x2={ox} y2={y} stroke={G.ax} strokeWidth="1"/><text x={ox - 8} y={y + 3} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="end">{(f * IL).toFixed(2)}</text></g>;
        })}
        <path d={curvePath} fill="none" stroke={G.gold} strokeWidth="2.5"/>
        <circle cx={xQuad} cy={yQuad} r="4" fill={G.red}/>
        <text x={xQuad + 8} y={yQuad - 6} fill={G.red} fontSize="9" fontFamily="'IBM Plex Mono'">Quadrature (Vpi/2)</text>
        <line x1={xVpi} y1={oy} x2={xVpi} y2={30} stroke={G.blue} strokeWidth="1" strokeDasharray="4,3"/>
        <text x={xVpi + 4} y={40} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'">Vpi = {p.Vpi}V</text>
        <text x={w - 120} y={oy - 15} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">IL = {p.insertionLoss_dB} dB</text>
        <text x={w - 120} y={oy - 5} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'">ER = {p.extinctionRatio_dB} dB</text>
      </svg>
    </div>
  );
}

function InteractiveRingResonator() {
  const [coupling, setCoupling] = useState(0.15);
  const [loss, setLoss] = useState(2);
  const [radius, setRadius] = useState(5);
  const params = { radius_um: radius, ng: DEFAULT_GRAPH_PARAMS.ringResonator.ng, neff: DEFAULT_GRAPH_PARAMS.ringResonator.neff, coupling, loss_dB_cm: loss };
  return (
    <div>
      <RingResonatorResponse params={params} mid="interactive" />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", padding: "8px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ minWidth: 50 }}>kappa:</span>
          <input type="range" min="0.01" max="0.5" step="0.01" value={coupling} onChange={e => setCoupling(parseFloat(e.target.value))} style={{ width: 100 }} />
          <span style={{ minWidth: 32 }}>{coupling.toFixed(2)}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ minWidth: 70 }}>Loss (dB/cm):</span>
          <input type="range" min="0.5" max="10" step="0.5" value={loss} onChange={e => setLoss(parseFloat(e.target.value))} style={{ width: 100 }} />
          <span style={{ minWidth: 24 }}>{loss.toFixed(1)}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ minWidth: 50 }}>R (um):</span>
          <input type="range" min="2" max="20" step="0.5" value={radius} onChange={e => setRadius(parseFloat(e.target.value))} style={{ width: 100 }} />
          <span style={{ minWidth: 24 }}>{radius.toFixed(1)}</span>
        </label>
      </div>
    </div>
  );
}

function InteractiveGainSpectrum() {
  const [showBulk, setShowBulk] = useState(true);
  const [showQW, setShowQW] = useState(true);
  const [showQD, setShowQD] = useState(true);
  return (
    <div>
      <GainSpectrum params={{ showBulk, showQW, showQD }} mid="interactive" />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={showBulk} onChange={e => setShowBulk(e.target.checked)} />
          <span style={{ color: G.blue }}>Bulk (3D)</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={showQW} onChange={e => setShowQW(e.target.checked)} />
          <span style={{ color: G.grn }}>QW (2D)</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
          <input type="checkbox" checked={showQD} onChange={e => setShowQD(e.target.checked)} />
          <span style={{ color: G.red }}>QD (0D)</span>
        </label>
      </div>
    </div>
  );
}

// ─── Animated Components ───

function FabryPerotCavityAnimation() {
  const [playing, setPlaying] = useState(false);
  const [gain, setGain] = useState(1.0); // 0 to 2 (in units of threshold)
  const [time, setTime] = useState(0);
  const animFrameId = useRef(null);
  const lastTs = useRef(null);

  useEffect(() => {
    if (!playing) { lastTs.current = null; return; }
    const step = (ts) => {
      if (lastTs.current != null) {
        const dt = (ts - lastTs.current) * 0.001;
        setTime(t => t + dt);
      }
      lastTs.current = ts;
      animFrameId.current = requestAnimationFrame(step);
    };
    animFrameId.current = requestAnimationFrame(step);
    return () => { if (animFrameId.current) cancelAnimationFrame(animFrameId.current); };
  }, [playing]);

  const w = 600, h = 200;
  const mirrorX1 = 60, mirrorX2 = 540;
  const cavityLen = mirrorX2 - mirrorX1;
  const mirrorW = 10, mirrorH = 120;
  const mirrorY = (h - mirrorH) / 2;
  const midY = h / 2;

  // Gain ratio relative to threshold
  const gRatio = gain;
  // Net round-trip gain factor per pass
  const netGain = gRatio < 1 ? 0.6 + 0.4 * gRatio : gRatio < 1.05 ? 1.0 : Math.min(1.0 + (gRatio - 1.0) * 0.8, 1.6);
  // Mirror reflectivities
  const R1 = 0.95, R2 = 0.7;

  // Pulse position: bounces back and forth
  const period = 2.0; // seconds for one round trip
  const phase = (time % period) / period;
  const goingRight = phase < 0.5;
  const frac = goingRight ? phase * 2 : (1.0 - (phase - 0.5) * 2);
  const pulseX = mirrorX1 + mirrorW / 2 + frac * (cavityLen - mirrorW);

  // Amplitude evolves over bounces
  const bounceCount = Math.floor(time / (period / 2));
  let amplitude;
  if (gRatio < 0.95) {
    // Below threshold: decays
    amplitude = Math.max(0.05, Math.pow(netGain * Math.sqrt(R1 * R2), bounceCount));
    amplitude = Math.min(1.0, amplitude);
  } else if (gRatio <= 1.05) {
    // At threshold: stable
    amplitude = 0.7;
  } else {
    // Above threshold: grows then saturates
    const raw = Math.pow(netGain, Math.min(bounceCount, 8));
    amplitude = Math.min(1.0, 0.3 * raw);
  }

  // Transmitted wave amplitudes
  const transR = amplitude * (1 - R2);
  const transL = amplitude * (1 - R1);

  // Wave path inside cavity
  const wavePoints = [];
  const waveLen = 30;
  const envWidth = 60;
  for (let x = mirrorX1 + mirrorW; x <= mirrorX2 - mirrorW; x += 1) {
    const dist = Math.abs(x - pulseX);
    const env = Math.exp(-0.5 * (dist / envWidth) * (dist / envWidth));
    const phase_wave = goingRight ? (x - pulseX) : (pulseX - x);
    const y = midY - amplitude * 30 * env * Math.sin(2 * Math.PI * phase_wave / waveLen);
    wavePoints.push(`${wavePoints.length === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
  }

  // Transmitted wave at output (right side)
  const transPoints = [];
  if (transR > 0.02) {
    for (let x = mirrorX2 + mirrorW; x <= mirrorX2 + mirrorW + 40; x += 1) {
      const dist = x - (mirrorX2 + mirrorW);
      const env = Math.exp(-0.5 * (dist / 20) * (dist / 20));
      const y = midY - transR * 30 * env * Math.sin(2 * Math.PI * (x - mirrorX2) / waveLen);
      transPoints.push(`${transPoints.length === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  // Transmitted wave at left mirror
  const transLPoints = [];
  if (transL > 0.02) {
    for (let x = mirrorX1 - mirrorW - 40; x <= mirrorX1 - mirrorW; x += 1) {
      const dist = (mirrorX1 - mirrorW) - x;
      const env = Math.exp(-0.5 * (dist / 20) * (dist / 20));
      const y = midY - transL * 30 * env * Math.sin(2 * Math.PI * (mirrorX1 - x) / waveLen);
      transLPoints.push(`${transLPoints.length === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
  }

  const gainLabel = gRatio < 0.95 ? "Below threshold (decaying)" : gRatio <= 1.05 ? "At threshold (stable)" : "Above threshold (saturated)";

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Fabry-Perot laser cavity with bouncing photons and gain medium</title>
        {/* Gain medium shading */}
        <rect x={mirrorX1 + mirrorW} y={mirrorY - 5} width={cavityLen - mirrorW * 2} height={mirrorH + 10} fill={G.gold} opacity="0.08" rx="2"/>
        <text x={(mirrorX1 + mirrorX2) / 2} y={mirrorY - 10} fill={G.gold} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle" opacity="0.6">Gain Medium</text>
        {/* Left mirror */}
        <rect x={mirrorX1} y={mirrorY} width={mirrorW} height={mirrorH} fill={G.ax} rx="1"/>
        <text x={mirrorX1 + mirrorW / 2} y={mirrorY + mirrorH + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">R1={R1}</text>
        {/* Right mirror */}
        <rect x={mirrorX2 - mirrorW} y={mirrorY} width={mirrorW} height={mirrorH} fill={G.ax} rx="1"/>
        <text x={mirrorX2 - mirrorW / 2} y={mirrorY + mirrorH + 14} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">R2={R2}</text>
        {/* Intracavity wave */}
        <path d={wavePoints.join("")} fill="none" stroke={G.gold} strokeWidth={1.5 + amplitude * 1.5} opacity={0.3 + amplitude * 0.7}/>
        {/* Transmitted waves */}
        {transPoints.length > 0 && <path d={transPoints.join("")} fill="none" stroke={G.blue} strokeWidth={1 + transR} opacity={0.3 + transR * 0.7}/>}
        {transLPoints.length > 0 && <path d={transLPoints.join("")} fill="none" stroke={G.blue} strokeWidth={1 + transL} opacity={0.3 + transL * 0.7}/>}
        {/* Output labels */}
        <text x={mirrorX2 + mirrorW + 5} y={midY - 30} fill={G.blue} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="start">Output</text>
        {/* Title */}
        <text x={w / 2} y={14} fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Fabry-Perot Laser Cavity</text>
        {/* Status label */}
        <text x={w / 2} y={h - 4} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">{gainLabel}</text>
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)", alignItems: "center" }}>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <span>Gain:</span>
          <input type="range" min="0" max="2" step="0.05" value={gain} onChange={e => setGain(parseFloat(e.target.value))} style={{ width: 120 }} onClick={e => e.stopPropagation()} />
          <span style={{ minWidth: 60 }}>{gain.toFixed(2)}x g_th</span>
        </label>
      </div>
    </div>
  );
}

function MachZehnderAnimation() {
  const [playing, setPlaying] = useState(false);
  const [voltage, setVoltage] = useState(0);
  const [time, setTime] = useState(0);
  const animFrameId = useRef(null);
  const lastTs = useRef(null);

  const Vpi = 3.5;

  useEffect(() => {
    if (!playing) { lastTs.current = null; return; }
    const step = (ts) => {
      if (lastTs.current != null) {
        const dt = (ts - lastTs.current) * 0.001;
        setTime(t => t + dt);
      }
      lastTs.current = ts;
      animFrameId.current = requestAnimationFrame(step);
    };
    animFrameId.current = requestAnimationFrame(step);
    return () => { if (animFrameId.current) cancelAnimationFrame(animFrameId.current); };
  }, [playing]);

  const w = 600, h = 250;
  const inX = 40, splitX = 140, mergeX = 460, outX = 560;
  const topY = 80, botY = 170, midY = 125;

  const phi = Math.PI * voltage / Vpi;
  const outputIntensity = Math.cos(phi / 2) * Math.cos(phi / 2);

  // Pulse positions along waveguide
  const speed = 120; // px per second
  const pulseSpacing = 80;
  const totalLen = outX - inX;

  // Generate pulse positions (wrapping)
  const pulsePhases = [];
  for (let i = 0; i < 5; i++) {
    const pos = ((time * speed + i * pulseSpacing) % (totalLen + pulseSpacing)) - 20;
    if (pos >= -10 && pos <= totalLen + 20) pulsePhases.push(pos);
  }

  // Waveguide paths
  const inputPath = `M${inX},${midY} L${splitX},${midY}`;
  const topArmPath = `M${splitX},${midY} C${splitX + 40},${midY} ${splitX + 40},${topY} ${splitX + 60},${topY} L${mergeX - 60},${topY} C${mergeX - 40},${topY} ${mergeX - 40},${midY} ${mergeX},${midY}`;
  const botArmPath = `M${splitX},${midY} C${splitX + 40},${midY} ${splitX + 40},${botY} ${splitX + 60},${botY} L${mergeX - 60},${botY} C${mergeX - 40},${botY} ${mergeX - 40},${midY} ${mergeX},${midY}`;
  const outputPath = `M${mergeX},${midY} L${outX},${midY}`;

  // Compute pulse position on the MZI structure
  const getPulseXY = (dist, arm) => {
    if (dist < splitX - inX) {
      // Input waveguide
      return { x: inX + dist, y: midY, section: "input" };
    }
    const armStart = splitX - inX;
    const armLen = mergeX - splitX;
    if (dist < armStart + armLen) {
      const armDist = (dist - armStart) / armLen;
      const ay = arm === "top" ? topY : botY;
      // Approximate position along arm
      let px, py;
      if (armDist < 0.15) {
        const t = armDist / 0.15;
        px = splitX + t * 60;
        py = midY + t * (ay - midY);
      } else if (armDist > 0.85) {
        const t = (armDist - 0.85) / 0.15;
        px = mergeX - 60 + t * 60;
        py = ay + t * (midY - ay);
      } else {
        const t = (armDist - 0.15) / 0.7;
        px = splitX + 60 + t * (mergeX - splitX - 120);
        py = ay;
      }
      return { x: px, y: py, section: "arm" };
    }
    const outDist = dist - armStart - armLen;
    return { x: mergeX + outDist, y: midY, section: "output" };
  };

  // Phase shifter region on bottom arm
  const psX1 = splitX + 100, psX2 = mergeX - 100;

  return (
    <div className="eq-block" style={{ padding: "16px", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", maxWidth: w, display: "block", margin: "0 auto" }}>
        <title>Mach-Zehnder interferometer animation with phase-shifting arm</title>
        <text x={w / 2} y={14} fill={G.gold} fontSize="11" fontFamily="'IBM Plex Mono'" textAnchor="middle" fontWeight="600">Mach-Zehnder Interferometer</text>

        {/* Waveguide paths */}
        <path d={inputPath} fill="none" stroke={G.ax} strokeWidth="3" opacity="0.4"/>
        <path d={topArmPath} fill="none" stroke={G.ax} strokeWidth="3" opacity="0.4"/>
        <path d={botArmPath} fill="none" stroke={G.ax} strokeWidth="3" opacity="0.4"/>
        <path d={outputPath} fill="none" stroke={G.ax} strokeWidth="3" opacity="0.4"/>

        {/* Phase shifter on bottom arm */}
        <rect x={psX1} y={botY - 12} width={psX2 - psX1} height={24} fill={G.blue} opacity="0.12" rx="3"/>
        <text x={(psX1 + psX2) / 2} y={botY + 28} fill={G.blue} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Phase Shifter (V)</text>

        {/* Arm labels */}
        <text x={(splitX + mergeX) / 2} y={topY - 10} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="middle">Reference arm</text>

        {/* Y-junction labels */}
        <text x={splitX} y={midY - 45} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">Split</text>
        <text x={mergeX} y={midY - 45} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">Combine</text>

        {/* Input / Output labels */}
        <text x={inX - 5} y={midY - 8} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="end">In</text>
        <text x={outX + 5} y={midY - 8} fill={G.txt} fontSize="9" fontFamily="'IBM Plex Mono'" textAnchor="start">Out</text>

        {/* Animated pulses */}
        {pulsePhases.map((dist, i) => {
          const topP = getPulseXY(dist, "top");
          const botP = getPulseXY(dist, "bottom");
          const inP = getPulseXY(dist, "top"); // same for input section
          if (inP.section === "input") {
            return <circle key={`in-${i}`} cx={inP.x} cy={inP.y} r={5} fill={G.gold} opacity="0.8"/>;
          }
          if (topP.section === "output") {
            return <circle key={`out-${i}`} cx={topP.x} cy={topP.y} r={5} fill={G.gold} opacity={0.15 + outputIntensity * 0.75}/>;
          }
          return (
            <g key={`arm-${i}`}>
              <circle cx={topP.x} cy={topP.y} r={4} fill={G.gold} opacity="0.7"/>
              <circle cx={botP.x} cy={botP.y} r={4} fill={G.blue} opacity="0.7"/>
            </g>
          );
        })}

        {/* Output intensity bar */}
        <rect x={outX + 8} y={midY - 30} width={12} height={60} fill="none" stroke={G.ax} strokeWidth="1" rx="2"/>
        <rect x={outX + 9} y={midY + 30 - outputIntensity * 59} width={10} height={outputIntensity * 59} fill={G.gold} opacity={0.3 + outputIntensity * 0.7} rx="1"/>
        <text x={outX + 14} y={midY + 48} fill={G.txt} fontSize="8" fontFamily="'IBM Plex Mono'" textAnchor="middle">{(outputIntensity * 100).toFixed(0)}%</text>

        {/* Phase difference label */}
        <text x={w / 2} y={h - 8} fill={G.txt} fontSize="10" fontFamily="'IBM Plex Mono'" textAnchor="middle">
          {"phi = " + (phi / Math.PI).toFixed(2) + " pi"}
        </text>
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", padding: "8px 0", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "var(--text-muted)", alignItems: "center" }}>
        <button className="ctrl-btn" onClick={e => { e.stopPropagation(); setPlaying(p => !p); }}>{playing ? "Pause" : "Play"}</button>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }} onClick={e => e.stopPropagation()}>
          <span>V:</span>
          <input type="range" min="0" max={2 * Vpi} step="0.1" value={voltage} onChange={e => setVoltage(parseFloat(e.target.value))} style={{ width: 140 }} onClick={e => e.stopPropagation()} />
          <span style={{ minWidth: 50 }}>{voltage.toFixed(1)} V</span>
        </label>
        <span style={{ color: G.txt }}>V_pi = {Vpi} V</span>
      </div>
    </div>
  );
}

// ─── Topics ───

const TOPICS = [
  {
    id: "laser-fundamentals",
    tab: "Laser Fundamentals",
    title: "1. Laser Fundamentals",
    subtitle: "Stimulated emission, population inversion, and optical feedback",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Stimulated vs Spontaneous Emission">
          <P>Light-matter interaction involves three fundamental processes described by Einstein's coefficients. In <b>spontaneous emission</b>, an excited atom in state <M>{"E_2"}</M> decays to <M>{"E_1"}</M>, emitting a photon of energy <M>{"h\\nu = E_2 - E_1"}</M> at a random time and direction. The rate is governed by the Einstein A coefficient.</P>
          <Eq>{"\\frac{dN_2}{dt}\\bigg|_{\\text{spon}} = -A_{21} N_2"}</Eq>
          <P>In <b>stimulated emission</b>, an incoming photon with energy <M>{"h\\nu"}</M> triggers an excited atom to emit a second photon with identical frequency, phase, polarization, and direction. This is the basis of optical amplification.</P>
          <Eq>{"\\frac{dN_2}{dt}\\bigg|_{\\text{stim}} = -B_{21}\\, \\rho(\\nu)\\, N_2"}</Eq>
          <P><b>Absorption</b> is the reverse: a photon is absorbed, promoting an atom from <M>{"E_1"}</M> to <M>{"E_2"}</M>.</P>
          <Eq>{"\\frac{dN_1}{dt}\\bigg|_{\\text{abs}} = -B_{12}\\, \\rho(\\nu)\\, N_1"}</Eq>
          <KeyConcept label="Einstein Coefficient Relations">
            From detailed balance with blackbody radiation: <M>{"B_{12} = B_{21}"}</M> (stimulated absorption and emission are equally probable), and the ratio of spontaneous to stimulated coefficients is
          </KeyConcept>
          <Eq>{"\\frac{A_{21}}{B_{21}} = \\frac{8\\pi h \\nu^3}{c^3}"}</Eq>
          <P>This relation shows that at high frequencies (optical), spontaneous emission dominates, making population inversion harder to achieve.</P>
        </Section>
        <Section title="Population Inversion">
          <P>For net optical gain (stimulated emission exceeding absorption), we need <b>population inversion</b>:</P>
          <Eq>{"N_2 \\gt N_1"}</Eq>
          <P>In thermal equilibrium, the Boltzmann distribution gives <M>{"N_2/N_1 = \\exp(-(E_2 - E_1)/k_B T) \\lt 1"}</M>, so inversion never occurs naturally. A <b>pumping mechanism</b> (electrical injection, optical pumping) is required. Two-level systems cannot achieve inversion; at least three or four energy levels are needed.</P>
          <KeyConcept label="Gain Medium">
            The gain medium provides optical amplification. The material gain coefficient <M>{"g"}</M> (cm^-1) is proportional to the population inversion: <M>{"g \\propto (N_2 - N_1)"}</M>. For semiconductors, this becomes <M>{"g \\propto (f_c - f_v)"}</M> where <M>{"f_c"}</M> and <M>{"f_v"}</M> are Fermi-Dirac occupations of conduction and valence band states.
          </KeyConcept>
        </Section>
        <Section title="Optical Feedback: Fabry-Perot Cavity">
          <P>A laser requires optical feedback to sustain oscillation. The simplest cavity is the <b>Fabry-Perot resonator</b>: two parallel mirrors with reflectivities <M>{"R_1"}</M> and <M>{"R_2"}</M> separated by a gain medium of length <M>{"L"}</M>.</P>
          <P>The <b>threshold condition</b> requires that the round-trip gain equals the round-trip loss:</P>
          <Eq>{"R_1 R_2 \\exp\\bigl(2(g_{\\text{th}} - \\alpha_i)L\\bigr) = 1"}</Eq>
          <P>Solving for the threshold gain:</P>
          <Eq>{"g_{\\text{th}} = \\alpha_i + \\frac{1}{2L}\\ln\\!\\left(\\frac{1}{R_1 R_2}\\right) = \\alpha_i + \\alpha_m"}</Eq>
          <P>where <M>{"\\alpha_i"}</M> is the internal loss (scattering, free carrier absorption) and <M>{"\\alpha_m"}</M> is the mirror loss. Lower mirror reflectivity means higher threshold but also higher output power extraction.</P>
        </Section>
        <Section title="Laser Rate Equations">
          <P>The coupled rate equations describe the dynamics of carrier density <M>{"N"}</M> and photon density <M>{"S"}</M> in a semiconductor laser:</P>
          <Eq>{"\\frac{dN}{dt} = \\frac{J}{ed} - \\frac{N}{\\tau} - v_g \\, g \\, S"}</Eq>
          <Eq>{"\\frac{dS}{dt} = \\Gamma v_g \\, g \\, S - \\frac{S}{\\tau_p} + \\Gamma \\beta \\frac{N}{\\tau_r}"}</Eq>
          <P>where <M>{"J"}</M> is the injection current density, <M>{"e"}</M> is electron charge, <M>{"d"}</M> is the active layer thickness, <M>{"\\tau"}</M> is the carrier lifetime, <M>{"v_g"}</M> is the group velocity, <M>{"\\Gamma"}</M> is the optical confinement factor, <M>{"\\tau_p"}</M> is the photon lifetime, <M>{"\\beta"}</M> is the spontaneous emission coupling factor, and <M>{"\\tau_r"}</M> is the radiative lifetime.</P>
        </Section>
        <Section title="Longitudinal Modes">
          <P>A Fabry-Perot cavity supports discrete resonant wavelengths (longitudinal modes) satisfying <M>{"m\\lambda = 2nL"}</M>. The spacing between adjacent modes is:</P>
          <Eq>{"\\Delta\\lambda = \\frac{\\lambda^2}{2 n_g L}"}</Eq>
          <P>where <M>{"n_g"}</M> is the group index. For a typical semiconductor laser with <M>{"n_g \\approx 3.5"}</M> and <M>{"L = 300\\,\\mu\\text{m}"}</M>, mode spacing is approximately 1 nm near 1550 nm.</P>
        </Section>
        <Section title="L-I Curve">
          <P>The optical output power vs. injection current characteristic is the most important laser metric:</P>
          <LaserLICurve params={gp.laserLICurve} mid="tab1" />
        </Section>
        <Section title="Fabry-Perot Cavity Animation">
          <P>Visualize light bouncing between mirrors in a Fabry-Perot cavity. Adjust the gain relative to threshold to see how the intracavity field evolves: below threshold the wave decays, at threshold it stabilizes, and above threshold it grows to saturation.</P>
          <FabryPerotCavityAnimation />
        </Section>
      </div>
    ),
  },
  {
    id: "semiconductor-lasers",
    tab: "Semiconductor Lasers",
    title: "2. Semiconductor Lasers",
    subtitle: "Direct bandgap materials, heterostructures, and quantum wells",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Direct vs Indirect Bandgap">
          <P>Efficient light emission requires a <b>direct bandgap</b> semiconductor where the conduction band minimum and valence band maximum occur at the same crystal momentum (k-value). Key materials:</P>
          <ul className="info-list">
            <li><b>GaAs</b>: direct bandgap, <M>{"E_g = 1.42"}</M> eV (870 nm)</li>
            <li><b>InP</b>: direct bandgap, <M>{"E_g = 1.35"}</M> eV (920 nm)</li>
            <li><b>InGaAsP/InP</b>: tunable 1.1-1.65 um range for telecom</li>
            <li><b>Si</b>: <i>indirect</i> bandgap, requires phonon assistance, extremely inefficient for emission</li>
          </ul>
          <KeyConcept label="Why Si Cannot Lase Efficiently">
            Silicon has an indirect bandgap where the conduction band minimum is offset in k-space from the valence band maximum. Radiative recombination requires simultaneous emission of a phonon to conserve momentum, making the process orders of magnitude slower than non-radiative Auger recombination. The radiative lifetime in Si is milliseconds vs. nanoseconds in GaAs.
          </KeyConcept>
        </Section>
        <Section title="Double Heterostructure">
          <P>The double heterostructure (DH) was the key innovation enabling practical semiconductor lasers (Alferov, Kroemer; Nobel Prize 2000). A narrow-gap active layer is sandwiched between wide-gap cladding layers:</P>
          <P><b>AlGaAs / GaAs / AlGaAs</b> provides both <b>carrier confinement</b> (bandgap barriers prevent carrier diffusion) and <b>optical confinement</b> (higher refractive index in GaAs creates a waveguide).</P>
          <KeyConcept label="Carrier and Optical Confinement">
            The bandgap step confines injected electrons and holes to the thin active region, dramatically increasing the carrier density for a given current. Simultaneously, the refractive index step (n_GaAs = 3.6 vs n_AlGaAs = 3.4) guides the optical mode, increasing the overlap with the gain medium.
          </KeyConcept>
        </Section>
        <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
          <img src="/images/laser_diode_chip.jpg" alt="Tunable diode laser chip next to a sewing needle for scale, showing the miniature size of semiconductor lasers" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
          <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Semiconductor laser diode chip next to a sewing needle for scale. The active region is only micrometers thick. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, Public Domain (NASA/JPL)</span></figcaption>
        </figure>
        <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
          <img src="/images/laser_diode_sem_cutaway.jpg" alt="SEM image of a laser diode with metal case cut away, showing the semiconductor chip and wire bonds" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
          <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>Commercial laser diode with case cut away (SEM), revealing the semiconductor chip and wire bond connections inside. <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 4.0</span></figcaption>
        </figure>
        <Section title="Quantum Well Lasers">
          <P>Reducing the active layer thickness to ~5-10 nm creates a <b>quantum well</b> (QW). Quantum confinement modifies the density of states from the bulk 3D <M>{"\\sqrt{E}"}</M> shape to a 2D <b>step function</b>:</P>
          <Eq>{"\\rho_{\\text{2D}}(E) = \\frac{m^*}{\\pi \\hbar^2} \\sum_n \\Theta(E - E_n)"}</Eq>
          <P>The step-function DOS concentrates carriers at the band edge, yielding a <b>higher peak gain at lower carrier density</b> compared to bulk. This directly translates to lower threshold current.</P>
          <P>The <b>separate confinement heterostructure</b> (SCH) uses additional cladding layers to independently optimize optical mode size and carrier confinement.</P>
          <InteractiveGainSpectrum />
        </Section>
        <Section title="Threshold and Slope Efficiency">
          <P>The threshold current density <M>{"J_{\\text{th}}"}</M> is the minimum injection needed to achieve gain equal to total losses. Above threshold, the output power increases linearly with current:</P>
          <Eq>{"P = \\eta_d \\frac{hf}{e}(I - I_{\\text{th}})"}</Eq>
          <P>where <M>{"\\eta_d"}</M> is the <b>differential quantum efficiency</b>:</P>
          <Eq>{"\\eta_d = \\eta_i \\cdot \\frac{\\alpha_m}{\\alpha_m + \\alpha_i}"}</Eq>
          <P>Here <M>{"\\eta_i"}</M> is the internal quantum efficiency (fraction of injected carriers that recombine radiatively), and the second factor is the extraction efficiency (fraction of generated photons that escape through the mirrors rather than being reabsorbed). The <b>slope efficiency</b> (W/A) combines both:</P>
          <Eq>{"\\eta_s = \\eta_d \\cdot \\frac{hf}{e} \\quad \\text{[W/A]}"}</Eq>
        </Section>
        <Section title="VCSEL vs Edge-Emitting">
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Edge-Emitting Laser</h4>
              <P>Cavity along the wafer plane. Cleaved facets form mirrors (<M>{"R \\approx 0.3"}</M>). Elliptical beam. High power (mW to W). Cavity length ~300 um. Tested after cleaving (end of process).</P>
              <div className="data-table">
                <table>
                  <tbody>
                    <tr><td>Cavity length</td><td>~300 um</td></tr>
                    <tr><td>Mirror type</td><td>Cleaved facets / HR coatings</td></tr>
                    <tr><td>Output power</td><td>1-100+ mW</td></tr>
                    <tr><td>Beam shape</td><td>Elliptical (large divergence)</td></tr>
                    <tr><td>Testing</td><td>After cleaving</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="compare-card">
              <h4>VCSEL</h4>
              <P>Cavity perpendicular to wafer surface. DBR mirrors (distributed Bragg reflectors, <M>{"R \\gt 0.99"}</M>). Circular beam. Low threshold (&lt;1 mA). Cavity ~1 um. Wafer-level testing. Ideal for 2D arrays and short-reach links.</P>
              <div className="data-table">
                <table>
                  <tbody>
                    <tr><td>Cavity length</td><td>~1 um</td></tr>
                    <tr><td>Mirror type</td><td>DBR (20-40 pairs)</td></tr>
                    <tr><td>Output power</td><td>0.5-5 mW</td></tr>
                    <tr><td>Beam shape</td><td>Circular (low divergence)</td></tr>
                    <tr><td>Testing</td><td>Wafer-level (pre-dicing)</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>
      </div>
    ),
  },
  {
    id: "qd-lasers",
    tab: "Quantum Dot Lasers",
    title: "3. Quantum Dot Lasers",
    subtitle: "Zero-dimensional confinement and atom-like gain media",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Quantum Confinement Progression">
          <P>As we reduce the dimensionality of the active region, the density of states changes fundamentally:</P>
          <div className="data-table">
            <table>
              <thead><tr><th>Structure</th><th>Confinement</th><th>DOS Shape</th></tr></thead>
              <tbody>
                <tr><td>Bulk (3D)</td><td>None</td><td><M>{"\\rho(E) \\propto \\sqrt{E}"}</M></td></tr>
                <tr><td>Quantum Well (2D)</td><td>1D</td><td><M>{"\\rho(E) \\propto \\text{step function}"}</M></td></tr>
                <tr><td>Quantum Wire (1D)</td><td>2D</td><td><M>{"\\rho(E) \\propto 1/\\sqrt{E}"}</M></td></tr>
                <tr><td>Quantum Dot (0D)</td><td>3D</td><td><M>{"\\rho(E) \\propto \\delta(E - E_n)"}</M></td></tr>
              </tbody>
            </table>
          </div>
          <P>A quantum dot confines carriers in all three spatial dimensions, producing <b>discrete, atom-like energy levels</b>. The delta-function DOS means all carriers are concentrated at exactly the transition energy, maximizing gain per carrier.</P>
        </Section>
        <Section title="Self-Assembled Quantum Dots">
          <P>The most practical QD fabrication method is <b>Stranski-Krastanov (S-K) growth</b> via molecular beam epitaxy (MBE) or MOCVD:</P>
          <ul className="info-list">
            <li>Deposit InAs on GaAs (7% lattice mismatch)</li>
            <li>First ~1.5 monolayers form a flat <b>wetting layer</b></li>
            <li>Strain energy drives 3D <b>island formation</b></li>
            <li>Typical dot size: ~5 nm height, ~20 nm base diameter</li>
            <li>Dot density: ~10^10 - 10^11 cm^-2 per layer</li>
            <li>Capped with GaAs to form buried dots; stack multiple layers</li>
          </ul>
          <KeyConcept label="Inhomogeneous Broadening">
            Real QD ensembles have a size distribution (typically 5-10% standard deviation). Since the transition energy depends on dot size, this produces inhomogeneous broadening of the gain spectrum. This is a drawback for single-wavelength applications but an advantage for broad-bandwidth applications (SOAs, mode-locked lasers, tunable lasers).
          </KeyConcept>
        </Section>
        <figure className="eq-block" style={{ textAlign: "center", padding: "16px" }}>
          <img src="/images/ingaas_quantum_dot_stem.jpg" alt="Atomic-resolution STEM image of an InGaAs quantum dot in a GaAs matrix showing lattice structure" style={{ maxWidth: "100%", maxHeight: 350, borderRadius: 6, border: `1px solid ${G.ax}` }} />
          <figcaption style={{ color: G.txt, fontSize: 11, fontFamily: "'IBM Plex Mono'", marginTop: 8 }}>STEM image of a self-assembled InGaAs quantum dot buried in GaAs. Individual atomic columns are resolved, showing the strained dot structure (~5nm high, ~20nm wide). <span style={{ opacity: 0.5 }}>Source: Wikimedia Commons, CC BY-SA 4.0</span></figcaption>
        </figure>
        <Section title="QD Laser Advantages">
          <P>Compared to quantum well lasers, QD lasers offer several fundamental advantages:</P>
          <ul className="info-list">
            <li><b>Ultra-low threshold</b>: fewer carriers needed to fill discrete states</li>
            <li><b>Temperature insensitivity</b>: characteristic temperature <M>{"T_0 \\gt 200\\text{K}"}</M> vs ~50K for QW lasers (carriers cannot thermally escape discrete levels as easily)</li>
            <li><b>Broad gain bandwidth</b>: inhomogeneous broadening spans ~50-80 nm</li>
            <li><b>Reduced linewidth enhancement factor</b>: <M>{"\\alpha_H \\approx 0"}</M> (symmetric gain spectrum yields near-zero refractive index change with carrier density). This reduces chirp and improves coherence.</li>
            <li><b>Reduced sensitivity to feedback</b>: lower <M>{"\\alpha_H"}</M> makes QD lasers more tolerant of back-reflections, potentially eliminating the need for optical isolators</li>
          </ul>
        </Section>
        <Section title="QD Lasers on Silicon">
          <P>QD lasers are uniquely suited for integration on silicon platforms. The O-band (1310 nm) is the target wavelength for data center interconnects (zero dispersion in standard fiber).</P>
          <P>The key challenge of growing III-V on Si is the high density of <b>threading dislocations</b> (TDs) caused by the 4% lattice mismatch and thermal expansion difference. QDs are more tolerant of TDs than QWs because:</P>
          <ul className="info-list">
            <li>QDs act as strain-relieving sites, bending TDs away from the active region</li>
            <li>Carrier localization in dots prevents migration to non-radiative TD sites</li>
            <li>Demonstrated: QD lasers on Si with lifetimes exceeding 100,000 hours at 35 C</li>
          </ul>
          <P>Buffer layer strategies include GaP nucleation layers, strained-layer superlattices (SLS) as dislocation filters, and optimized thermal cycle annealing.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "silicon-photonics",
    tab: "Silicon Photonics",
    title: "4. Silicon Photonics",
    subtitle: "SOI waveguides, ring resonators, and photonic building blocks",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Why Silicon for Photonics?">
          <ul className="info-list">
            <li><b>CMOS compatibility</b>: leverage billions of dollars of mature Si fab infrastructure</li>
            <li><b>Transparency</b>: Si is transparent at 1.3 um and 1.55 um telecom wavelengths (bandgap at 1.1 um)</li>
            <li><b>High refractive index</b>: <M>{"n_{\\text{Si}} = 3.48"}</M> at 1550 nm enables strong optical confinement</li>
            <li><b>Mature processing</b>: lithography, etching, and deposition tools readily available</li>
            <li><b>Low cost at scale</b>: 300 mm wafer fabrication in existing foundries</li>
          </ul>
        </Section>
        <Section title="Telecom Wavelength Bands">
          <P>Silicon photonics targets specific wavelength windows where optical fiber has low loss and dispersion:</P>
          <div className="data-table">
            <table>
              <thead><tr><th>Band</th><th>Wavelength</th><th>Key Property</th><th>Application</th></tr></thead>
              <tbody>
                <tr><td>O-band</td><td>1260-1360 nm</td><td>Zero dispersion in SMF-28</td><td>Data center interconnects</td></tr>
                <tr><td>C-band</td><td>1530-1565 nm</td><td>Lowest fiber loss (0.2 dB/km)</td><td>Long-haul, DWDM</td></tr>
                <tr><td>L-band</td><td>1565-1625 nm</td><td>Extended C-band capacity</td><td>Capacity expansion</td></tr>
                <tr><td>S-band</td><td>1460-1530 nm</td><td>Low loss, emerging DWDM</td><td>Future capacity bands</td></tr>
              </tbody>
            </table>
          </div>
          <P>The O-band (centered at 1310 nm) is preferred for short-reach data center links because zero dispersion eliminates the need for dispersion compensation, simplifying transceiver design. The C-band (centered at 1550 nm) is used for long-haul because of minimum fiber attenuation.</P>
        </Section>
        <Section title="SOI Waveguide Platform">
          <P>The <b>silicon-on-insulator</b> (SOI) platform is the standard for silicon photonics. A thin Si device layer sits on a buried oxide (BOX) layer of SiO2:</P>
          <Eq>{"n_{\\text{core}} = n_{\\text{Si}} = 3.48, \\quad n_{\\text{clad}} = n_{\\text{SiO}_2} = 1.44"}</Eq>
          <P>The large index contrast (<M>{"\\Delta n \\approx 2.04"}</M>) enables ultra-compact waveguides via <b>total internal reflection</b> (TIR). Light guided when the incidence angle exceeds the critical angle:</P>
          <Eq>{"\\theta_c = \\sin^{-1}\\!\\left(\\frac{n_{\\text{clad}}}{n_{\\text{core}}}\\right) = \\sin^{-1}\\!\\left(\\frac{1.44}{3.48}\\right) \\approx 24.5^\\circ"}</Eq>
          <P>The small critical angle means light is tightly confined even in sharp bends (radius down to ~2 um with acceptable loss). Typical waveguide cross-sections:</P>
          <div className="data-table">
            <table>
              <thead><tr><th>Type</th><th>Dimensions</th><th>Characteristics</th></tr></thead>
              <tbody>
                <tr><td>Strip</td><td>~450 x 220 nm</td><td>Strong confinement, single-mode, ~1-2 dB/cm loss</td></tr>
                <tr><td>Rib</td><td>~500 x 220 nm, 70nm slab</td><td>Lower loss, larger mode, easier coupling</td></tr>
                <tr><td>Slot</td><td>~200 nm slot between rails</td><td>High field in low-index slot, good for sensing/EO</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Coupling: Grating vs Edge">
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Grating Coupler</h4>
              <P>Periodic perturbation on waveguide surface diffracts light between fiber (vertical/angled) and waveguide. Advantages: wafer-level testing, no facet preparation. Drawbacks: wavelength and angle selective (~30-40 nm 1dB bandwidth), ~3-5 dB loss per coupler.</P>
            </div>
            <div className="compare-card">
              <h4>Edge Coupler</h4>
              <P>Mode size converter (inverse taper) at the chip facet matches the waveguide mode to fiber mode. Advantages: broadband, low loss (~1-2 dB). Drawbacks: requires chip dicing and polishing, no wafer-level test.</P>
            </div>
          </div>
        </Section>
        <Section title="Ring Resonator">
          <P>A ring resonator is a circular waveguide evanescently coupled to a bus waveguide. The <b>through-port transmission</b> of an all-pass ring is:</P>
          <Eq>{"T = \\frac{r^2 - 2ra\\cos\\phi + a^2}{1 - 2ra\\cos\\phi + r^2 a^2}"}</Eq>
          <P>where <M>{"r = \\sqrt{1 - \\kappa}"}</M> is the self-coupling coefficient, <M>{"a"}</M> is the round-trip amplitude transmission, and <M>{"\\phi = 2\\pi n_{\\text{eff}} L_{\\text{ring}} / \\lambda"}</M> is the round-trip phase.</P>
          <P>Key performance metrics:</P>
          <Eq>{"\\text{FSR} = \\frac{\\lambda^2}{n_g \\cdot 2\\pi R}, \\quad Q = \\frac{\\pi n_g \\cdot 2\\pi R \\sqrt{a \\cdot r}}{\\lambda (1 - a \\cdot r)}"}</Eq>
          <InteractiveRingResonator />
          <div className="eq-block" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--accent)", marginBottom: 8, fontWeight: 600 }}>Micro-Ring Modulator -- Manim Animation</div>
            <video controls style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)" }} preload="metadata">
              <source src="videos/MicroRingModulator.mp4" type="video/mp4" />
            </video>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>
              Shows ring resonator coupling, on/off-resonance behavior, voltage-induced resonance shift, and OOK digital modulation.
            </div>
          </div>
        </Section>
        <Section title="Mach-Zehnder Interferometer">
          <P>The MZI is a fundamental building block in silicon photonics. Input light is split (usually by a 2x2 multimode interference coupler or Y-junction), travels through two arms with a relative phase shift <M>{"\\Delta\\phi"}</M>, and recombines:</P>
          <Eq>{"P_{\\text{out}} = P_{\\text{in}} \\cos^2\\!\\left(\\frac{\\Delta\\phi}{2}\\right)"}</Eq>
          <P>The phase shift can be induced thermally (thermo-optic coefficient <M>{"dn/dT \\approx 1.86 \\times 10^{-4}"}</M> K^-1 for Si) or electrically (carrier injection/depletion). MZIs are used for switching, modulation, filtering, and wavelength demultiplexing.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "modulators",
    tab: "Optical Modulators",
    title: "5. Optical Modulators",
    subtitle: "Electro-optic effects, MZ and ring modulators, modulation formats",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Electro-Optic Effect">
          <P>The <b>Pockels effect</b> (linear electro-optic effect) in materials like LiNbO3 changes the refractive index linearly with applied electric field:</P>
          <Eq>{"\\Delta n = -\\frac{1}{2} n^3 r E"}</Eq>
          <P>where <M>{"r"}</M> is the electro-optic coefficient (pm/V). LiNbO3 has <M>{"r_{33} \\approx 30"}</M> pm/V, enabling high-bandwidth modulation. However, Si has no Pockels effect (centrosymmetric crystal), so silicon modulators rely on the <b>plasma dispersion effect</b>.</P>
        </Section>
        <Section title="Plasma Dispersion in Silicon">
          <P>The free-carrier plasma dispersion effect changes the refractive index through injection or depletion of carriers:</P>
          <Eq>{"\\Delta n = -\\frac{e^2 \\lambda^2}{8\\pi^2 c^2 \\varepsilon_0 n}\\left(\\frac{\\Delta N_e}{m_e^*} + \\frac{\\Delta N_h}{m_h^*}\\right)"}</Eq>
          <P>At 1550 nm, empirical Soref-Bennett relations give:</P>
          <Eq>{"\\Delta n = -(8.8 \\times 10^{-22} \\Delta N_e + 8.5 \\times 10^{-18} (\\Delta N_h)^{0.8})"}</Eq>
          <P>Three mechanisms to modulate carrier density: <b>carrier injection</b> (PIN diode, slow ~ns), <b>carrier depletion</b> (reverse-biased PN junction, fast ~10s GHz), and <b>carrier accumulation</b> (MOS capacitor, moderate speed).</P>
        </Section>
        <Section title="Mach-Zehnder Modulator">
          <P>The MZ modulator uses an interferometric structure where a phase shift in one or both arms converts to intensity modulation:</P>
          <Eq>{"\\frac{P_{\\text{out}}}{P_{\\text{in}}} = \\cos^2\\!\\left(\\frac{\\pi V}{2 V_\\pi}\\right)"}</Eq>
          <P>The key figure of merit is <M>{"V_\\pi \\cdot L"}</M> (V-cm), the voltage-length product needed for a pi phase shift. For Si depletion modulators, typical <M>{"V_\\pi L \\approx 1{-}2"}</M> V-cm. <b>Push-pull</b> operation (opposite phase shifts in both arms) halves the required voltage.</P>
          <P><b>Traveling-wave electrode</b> design is essential for high bandwidth: the RF signal co-propagates with the optical wave, matching velocities to maintain modulation efficiency across the device length. Bandwidth is limited by velocity mismatch, RF loss, and impedance mismatch.</P>
          <MZModulatorTransfer params={gp.mzModulator} mid="tab5" />
        </Section>
        <Section title="Mach-Zehnder Animation">
          <P>Watch light split, traverse two arms, and recombine. The bottom arm has a voltage-controlled phase shifter. At V=0 both arms are in phase (constructive interference, full output). At V=V_pi, the arms are pi out of phase (destructive interference, zero output). The quadrature point at V=V_pi/2 gives 50% output.</P>
          <MachZehnderAnimation />
        </Section>
        <Section title="Ring Modulator">
          <P>A ring resonator modulator shifts the resonance wavelength by changing the effective index via carrier injection/depletion:</P>
          <Eq>{"\\Delta\\lambda_{\\text{res}} = \\frac{\\lambda \\cdot \\Delta n}{n_g}"}</Eq>
          <P>Advantages: ultra-compact (~5-10 um radius), low power (~fJ/bit), high modulation efficiency. Drawbacks: narrow optical bandwidth (must track laser wavelength), temperature sensitivity (~80 pm/K shift), limited extinction ratio at high data rates.</P>
          <div className="eq-block" style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "var(--accent)", marginBottom: 8, fontWeight: 600 }}>MRM Transmission Spectrum Shift -- Manim Animation</div>
            <video controls style={{ maxWidth: "100%", borderRadius: 6, border: "1px solid var(--border)" }} preload="metadata">
              <source src="videos/MRMTransmissionShift.mp4" type="video/mp4" />
            </video>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontFamily: "'IBM Plex Mono', monospace", fontStyle: "italic" }}>
              Shows the Lorentzian transmission dip shifting under applied voltage, with CW laser operating point switching between low and high transmission (OOK modulation).
            </div>
          </div>
        </Section>
        <Section title="Electro-Absorption Modulators">
          <P>In III-V materials, absorption-based modulators offer compact, high-bandwidth alternatives:</P>
          <ul className="info-list">
            <li><b>Franz-Keldysh effect</b> (bulk): electric field tilts the band edges, enabling sub-bandgap photon absorption. Moderate extinction ratio.</li>
            <li><b>Quantum-Confined Stark Effect</b> (QCSE, MQW): electric field shifts QW exciton absorption peak to longer wavelengths. Higher extinction ratio, sharper absorption edge. Widely used in EAMs integrated with DFB lasers (EML).</li>
          </ul>
        </Section>
        <Section title="Modulation Formats">
          <div className="data-table">
            <table>
              <thead><tr><th>Format</th><th>Bits/Symbol</th><th>Modulator</th><th>Use Case</th></tr></thead>
              <tbody>
                <tr><td>OOK (NRZ)</td><td>1</td><td>MZ or Ring</td><td>Short-reach, 100G per lane</td></tr>
                <tr><td>PAM-4</td><td>2</td><td>MZ or EAM</td><td>400G/800G data center</td></tr>
                <tr><td>QPSK</td><td>2</td><td>I/Q MZ</td><td>Coherent long-haul</td></tr>
                <tr><td>16QAM</td><td>4</td><td>I/Q MZ</td><td>High-capacity metro/long-haul</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Eye Diagram Concept">
          <P>The <b>eye diagram</b> is formed by overlaying successive bit periods of the modulated signal. Key metrics extracted from the eye:</P>
          <ul className="info-list">
            <li><b>Eye opening (vertical)</b>: signal-to-noise margin. Larger opening means better signal quality.</li>
            <li><b>Eye width (horizontal)</b>: timing margin. Wider means more tolerance to jitter.</li>
            <li><b>Crossing point</b>: indicates symmetry and DC offset. Ideally at 50% amplitude.</li>
            <li><b>Extinction ratio</b>: ratio of "1" level to "0" level power, <M>{"ER = P_1 / P_0"}</M>.</li>
          </ul>
          <P>For PAM-4, three eye openings are stacked vertically, making signal integrity more challenging than OOK. The modulator's linearity directly impacts PAM-4 eye quality, which is why MZ modulators (inherently linear near quadrature) are preferred over ring modulators for PAM-4.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "photodetectors",
    tab: "Photodetectors",
    title: "6. Photodetectors",
    subtitle: "PIN photodiodes, APDs, and Ge-on-Si detectors",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="PIN Photodiode">
          <P>The <b>PIN photodiode</b> operates under reverse bias. Photons with <M>{"h\\nu \\gt E_g"}</M> are absorbed in the intrinsic (I) region, generating electron-hole pairs that are swept to the contacts by the electric field.</P>
          <P>The <b>photocurrent</b> is proportional to incident optical power:</P>
          <Eq>{"I_{\\text{ph}} = R \\cdot P_{\\text{opt}}"}</Eq>
          <P>where <M>{"R"}</M> is the responsivity:</P>
          <Eq>{"R = \\frac{\\eta \\cdot e}{h f} \\quad [\\text{A/W}]"}</Eq>
          <P>and <M>{"\\eta"}</M> is the external quantum efficiency (number of collected e-h pairs per incident photon).</P>
          <KeyConcept label="Responsivity Physical Meaning">
            At 1550 nm, the maximum possible responsivity (eta = 1) is R = e*lambda/(hc) = 1.25 A/W. Practical InGaAs PIN detectors achieve R ~ 0.8-1.0 A/W. Ge-on-Si detectors reach R ~ 1.0 A/W at 1550 nm.
          </KeyConcept>
        </Section>
        <Section title="Bandwidth Considerations">
          <P>Two fundamental bandwidth limits in a PIN photodiode:</P>
          <Eq>{"\\tau_{\\text{tr}} = \\frac{w}{v_{\\text{sat}}}, \\quad \\tau_{RC} = R_L C_j"}</Eq>
          <P>where <M>{"w"}</M> is the depletion width, <M>{"v_{\\text{sat}}"}</M> is the carrier saturation velocity (~10^7 cm/s), <M>{"R_L"}</M> is the load resistance, and <M>{"C_j"}</M> is the junction capacitance.</P>
          <P>The 3 dB bandwidth is approximately:</P>
          <Eq>{"f_{3\\text{dB}} \\approx \\frac{1}{2\\pi \\sqrt{\\tau_{\\text{tr}}^2 + \\tau_{RC}^2}}"}</Eq>
          <KeyConcept label="Bandwidth-Efficiency Tradeoff">
            A thicker absorbing region increases quantum efficiency (more photons absorbed) but also increases transit time (slower response). This fundamental tradeoff drives design optimization: thin absorbers for high-speed receivers, thick absorbers for high-sensitivity receivers.
          </KeyConcept>
        </Section>
        <Section title="Avalanche Photodiode (APD)">
          <P>APDs use <b>impact ionization</b> to multiply the photocurrent by a factor <M>{"M"}</M>. A high reverse bias accelerates carriers to energies sufficient to create additional e-h pairs. The responsivity becomes:</P>
          <Eq>{"R_{\\text{APD}} = M \\cdot R_{\\text{PIN}}"}</Eq>
          <P>However, the multiplication process is stochastic, introducing <b>excess noise</b> characterized by the excess noise factor:</P>
          <Eq>{"F(M) = k M + (1-k)\\left(2 - \\frac{1}{M}\\right)"}</Eq>
          <P>where <M>{"k"}</M> is the ratio of hole to electron ionization coefficients. Lower <M>{"k"}</M> means lower noise. Si has <M>{"k \\approx 0.02"}</M> (excellent), InP has <M>{"k \\approx 0.5"}</M> (poor). This is why Si APDs outperform III-V APDs in noise despite lower absorption at telecom wavelengths.</P>
        </Section>
        <Section title="Ge-on-Si Photodetectors">
          <P>Germanium absorbs well at telecom wavelengths (direct gap ~0.8 eV at 1550 nm) and can be grown epitaxially on Si. Key features:</P>
          <ul className="info-list">
            <li>Responsivity <M>{"R \\approx 1"}</M> A/W at 1550 nm</li>
            <li>Bandwidth exceeding 50 GHz demonstrated</li>
            <li>Compatible with Si CMOS fab processes</li>
            <li>4% lattice mismatch managed by graded SiGe buffers or selective area growth</li>
            <li>Dark current higher than InGaAs (~1 uA vs ~1 nA) due to threading dislocations</li>
          </ul>
        </Section>
        <Section title="UTC Photodiode">
          <P>The <b>uni-traveling-carrier</b> (UTC) photodiode improves bandwidth by using only electrons as active transit carriers. The absorber and collector are separate layers: a p-type narrow-gap absorber (InGaAs) and an n-type wide-gap collector (InP). Photogenerated electrons diffuse/drift across the collector, while holes are collected in the absorber within a short distance. Since only the faster carriers (electrons) transit the high-field region, and the space-charge screening effect is reduced, UTC photodiodes achieve bandwidths exceeding 100 GHz.</P>
        </Section>
      </div>
    ),
  },
  {
    id: "integration",
    tab: "Photonic Integration",
    title: "7. Photonic Integration",
    subtitle: "PICs, III-V on Si, transceivers, and emerging applications",
    content: (gp) => (
      <div className="lesson-body">
        <Section title="Photonic Integrated Circuits (PICs)">
          <P>A PIC integrates multiple photonic functions (lasers, modulators, filters, detectors) on a single chip, analogous to electronic ICs. Key platforms:</P>
          <ul className="info-list">
            <li><b>InP PIC</b>: monolithic integration of laser + SOA + modulator + detector. Best performance but expensive, smaller wafers (75-100 mm).</li>
            <li><b>Si PIC (SOI)</b>: passive components (waveguides, filters, couplers) and Ge detectors native. Need external or hybrid-integrated light source.</li>
            <li><b>SiN PIC</b>: ultra-low loss (~0.1 dB/m), but no active devices. Used for high-Q filters, delay lines.</li>
          </ul>
        </Section>
        <Section title="III-V on Silicon Integration">
          <P>The holy grail of photonic integration: combining III-V active devices (lasers, amplifiers) with Si passive photonics. Three main approaches:</P>
          <div className="compare-grid">
            <div className="compare-card">
              <h4>Hybrid Bonding</h4>
              <P>III-V dies or wafers bonded to patterned SOI using molecular (direct) bonding or adhesive (BCB polymer). Light couples evanescently between III-V gain and Si waveguide. Mature, used in production.</P>
            </div>
            <div className="compare-card">
              <h4>Heterogeneous Integration</h4>
              <P>III-V wafer bonded to SOI, then processed (lithography, etch) to define lasers/SOAs aligned to Si waveguides. Better alignment than die bonding. Intel/Juniper use this for production transceivers.</P>
            </div>
            <div className="compare-card">
              <h4>Monolithic Epitaxy</h4>
              <P>Direct III-V growth on Si. Lowest cost at scale, no bonding. Challenge: 4% lattice mismatch creates threading dislocations. Mitigated by dislocation filters (SLS), thermal cycling, and QD active regions. Research-stage but promising for high-volume applications.</P>
            </div>
          </div>
          <KeyConcept label="Monolithic Epitaxy on Si">
            Direct epitaxial growth of III-V on Si eliminates bonding. The 4% GaAs/Si lattice mismatch creates threading dislocations that degrade device lifetime. Mitigation strategies: dislocation filter layers (SLS), thermal cycle annealing, selective area growth in trenches (aspect ratio trapping). QD active regions show superior tolerance to defects. Demonstrated: QD lasers on Si with over 100,000 hour extrapolated lifetimes.
          </KeyConcept>
        </Section>
        <Section title="Transceiver Architecture">
          <P>A photonic transceiver converts between electrical data and optical signals. Standard architecture:</P>
          <P><b>Transmitter (TX)</b>: Laser source (CW or directly modulated) followed by external modulator (MZ or EAM or ring), then wavelength multiplexer (AWG or cascaded rings) for WDM.</P>
          <P><b>Receiver (RX)</b>: Wavelength demultiplexer (AWG) followed by photodetector array (Ge-on-Si PINs or APDs), then transimpedance amplifier (TIA) to convert photocurrent to voltage.</P>
          <Eq>{"\\text{Link budget: } P_{\\text{TX}} - \\alpha_{\\text{fiber}} \\cdot L_{\\text{km}} - \\text{IL}_{\\text{coupling}} - \\text{penalties} \\geq P_{\\text{RX,min}}"}</Eq>
        </Section>
        <Section title="Applications">
          <div className="data-table">
            <table>
              <thead><tr><th>Application</th><th>Data Rate</th><th>Key Technology</th></tr></thead>
              <tbody>
                <tr><td>Data Center Interconnect</td><td>400G-1.6T</td><td>Si PIC + external laser or EML, PAM-4</td></tr>
                <tr><td>Coherent Long-Haul</td><td>400G-800G</td><td>InP or SiPh I/Q modulator, DP-QPSK/16QAM</td></tr>
                <tr><td>LiDAR</td><td>N/A</td><td>FMCW with on-chip beam steering (OPA or focal plane switch)</td></tr>
                <tr><td>Biosensing</td><td>N/A</td><td>Ring resonator shift from molecular binding</td></tr>
              </tbody>
            </table>
          </div>
          <KeyConcept label="Co-Packaged Optics (CPO)">
            Traditional pluggable optics are reaching bandwidth and power limits. CPO places the photonic transceiver on the same package substrate as the switch ASIC, reducing electrical interconnect distance from ~25 cm (front panel) to ~5 mm. Benefits: lower power per bit (reduced SerDes equalization), higher bandwidth density, lower latency. Key challenge: thermal management (ASIC runs at ~100 C, laser reliability degrades above ~70 C).
          </KeyConcept>
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
        <Section title="1. Laser L-I Curve">
          <LaserLICurve params={gp.laserLICurve} mid="gp1" />
        </Section>
        <Section title="2. Gain Spectrum: Bulk vs QW vs QD">
          <GainSpectrum params={gp.gainSpectrum} mid="gp2" />
        </Section>
        <Section title="3. Ring Resonator Through-Port Response">
          <RingResonatorResponse params={gp.ringResonator} mid="gp3" />
        </Section>
        <Section title="4. MZ Modulator Transfer Function">
          <MZModulatorTransfer params={gp.mzModulator} mid="gp4" />
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

// ─── Chatbot Component (copy verbatim, updated system prompt) ───

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
    return `You are a concise tutor for ECE 109 supplementary material on Photonics at the University of Waterloo. ${LESSON_CONTEXT}\n\nFull lesson topics for cross-reference:\n${allTopicCtx}\n\nYou have access to the lesson codebase. Edits to the JSX file hot-reload automatically. Help the student understand concepts, equations, derivations, and common pitfalls. Be concise: every sentence must advance understanding. Cut filler, preamble, and repetition. Prefer equations and visuals over lengthy prose.\n\nFORMATTING RULES:\n- Wrap ALL math in dollar signs: $...$ inline, $$...$$ display. This includes variables ($x$, $T$), subscripts ($E_g$), Greek letters ($\\alpha$), and compound expressions ($\\frac{2m_e}{\\hbar^2}$). Never write bare math.\n- Use **bold** for emphasis, \`code\` for code, markdown headers/lists/fenced blocks freely.\n\n--- GRAPH EDITING ---\nCurrent graph parameters: ${JSON.stringify(graphParams)}\n\nTo edit a graph (only when the user asks), include EXACTLY:\n<<EDIT_GRAPH>>{"graphKey": {"param": value}}<<END_EDIT>>\n\n--- RESEARCH & VERIFICATION ---\nUse WebSearch/WebFetch to verify equations, constants, derivations, and reference data before stating them.\n\nSource tiers:\n- TRUSTED: textbook publishers, NIST, .edu courses, peer-reviewed papers, well-sourced Wikipedia\n- ACCEPTABLE: Physics Stack Exchange (check votes), HyperPhysics, MIT OCW\n- REJECT: random forums, unattributed blogs, AI-generated content farms\n\nCite briefly inline (e.g. "per Kasap Table 4.1", "NIST CODATA 2018"). If only low-quality sources exist, state the uncertainty.\nWhen you use sources, collect them at the end of your response:\n<<SOURCES>>\n- Source name or title (URL if available)\n<<END_SOURCES>>\nThis renders as a collapsed "Sources" dropdown.\n\n--- VISUAL GENERATION ---\nGenerate visuals beyond inline SVG graphs. Decide how many to include based on what the explanation needs. Always verify output before presenting.\n\n1. MATPLOTLIB: For plots (3D, heatmaps, multi-panel). Run python3 via Bash, save to public/images/.\n2. MANIM: For animations. Spawn an Agent: write script, render, copy .mp4 to public/videos/, edit JSX to add <video> tag.\n3. WEB IMAGES: Fetch images using Bash(curl -o public/images/<name>.<ext> "URL"). Read the downloaded file to visually inspect it (you can see images). If suitable, use in chat as ![alt](/images/name.ext) or edit JSX to add <img>. Only use freely licensed or educational-source images. Delete unsuitable downloads.\n4. PLAYWRIGHT: Playwright is installed. Use it to screenshot and verify rendered pages or elements:\n   - Write a short Node script: require(\'playwright\'), launch chromium, navigate to the page, screenshot, close.\n   - Read the screenshot PNG to visually inspect the result.\n   - Use after editing lesson graphs, adding images to JSX, or when the student reports something looks wrong.\n   - For a specific element, use page.locator(\'.selector\').screenshot() instead of full-page.\n\n--- AGENT-BASED REVIEW ---\nUse the Agent tool for verification after generating visuals, multi-file edits, or complex derivations. Spawn with a specific task (e.g. "Read the SVG at X. Verify the curve matches y = sin(kx) for k=2pi. Check labels and scale."). Do not spawn agents for tasks you can do directly.\n\n--- CONVERSATION ANALYSIS ---\nSilently assess every response. Do NOT output your analysis; use it to guide action.\n\nBREAKTHROUGH DETECTION:\nSignals of pivotal understanding:\n- Student connects previously separate concepts\n- Student shifts from "what" to "why" or "what if" questions\n- Student self-corrects a misconception or applies a concept to a new context unprompted\n- A stuck exchange suddenly resolves\n\nOn breakthrough:\n1. Acknowledge briefly (1 sentence, not patronizing)\n2. If the insight reveals a gap the lesson does not cover and is general enough to help future readers, use <<SUGGEST>> to propose a KeyConcept or bridging paragraph\n\nVISUALIZATION OPPORTUNITIES:\nGenerate a visual when explaining spatial relationships, parameter-dependent curves, or inherently visual confusion. Skip when the concept is purely algebraic, an existing lesson graph covers it, the question is about notation, or adding more visuals would not clarify the explanation.\n\nInline demo format:\n<<DEMO title="Short Title">>\n<svg viewBox="0 0 W H" style="width:100%;max-width:Wpx;display:block;margin:8px auto">\n  <!-- gold=#c8a45a, blue=#4a90d9, red=#e06c75, green=#69b578, axis=#6b7084, text=#9498ac -->\n  <!-- Keep it clean: labeled axes, clear annotations. -->\n</svg>\n<<END_DEMO>>\n\nFor complex visuals needing many SVG elements, consider a lesson graph edit instead. If generalizable, also append a <<SUGGEST>> block.\n\n--- LESSON AUGMENTATION ---\nSuggest lesson additions only for genuine understanding gaps. Every word must earn its place.\n- Reusable <<DEMO>> visuals can be promoted via <<SUGGEST>> with the SVG in a collapsible.\n- Short additions (1-3 lines): mode="inline". Longer: mode="collapsible". Untied to a paragraph: type="faq".\n- Explain in chat first, then append if it belongs in the lesson:\n\n<<SUGGEST type="lesson|faq" section="exact-section-title" title="Short Title" mode="inline|collapsible">>\n[JSX content using existing components: <P>, <Eq m={...}/>, <M>, <KeyConcept label="...">, inline SVG if needed]\n<<END_SUGGEST>>\n\nThe user will see [Add to lesson] [Add to FAQ] [No] buttons. If approved, you will receive a follow-up -- then make the edit to src/photonics.jsx.\n\n--- THREAD SYSTEM ---\nMessages starting with [THREAD:id | "snippet"] are side-threads on a specific part of your previous response.\n- Prefix replies with [THREAD:id]. Keep responses appropriately scoped to the snippet.\n- Ignore thread history when responding to untagged main messages.${isolationBlock}`;
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
      ? `User approved: please add the suggested content to the lesson FAQ. Place it in the FAQ section/tab as a collapsible block with title "${s.title}". Make the edit to src/photonics.jsx now.`
      : `User approved: please add the suggested content inline to the lesson. Target section: "${s.section || "relevant section"}". Mode: ${s.mode || "collapsible"}. Title: "${s.title}". Make the edit to src/photonics.jsx now.`;
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
                {sessionStatus === "ready" && "Session active. Ask about lasers, waveguides, modulators, photodetectors, or photonic integration. Click lesson content to attach as context."}
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
          <h1>Photonics: Lasers, Waveguides, and Semiconductor Devices</h1>
          <p>ECE 109 -- Supplementary Material</p>
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
      <div style={{ background: G.gold, color: G.bg, textAlign: "center", padding: "8px 24px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>
        NOT ON THE EXAM -- This lesson was built purely out of curiosity and is not part of the ECE 109 syllabus.
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
