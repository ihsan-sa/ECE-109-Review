#!/bin/bash
set -e

LESSONS="qm-waves qm-atoms bonding-crystals band-theory conduction-optics dielectrics photonics"
OUT="dist"

rm -rf "$OUT"
mkdir -p "$OUT"

for slug in $LESSONS; do
  echo "Building $slug..."
  cd "claude_lessons/$slug"
  npm install
  npx vite build --base="/$slug/"
  cp -r dist/. "../../$OUT/$slug/"
  cd ../..
done

# Root index page linking to all lessons
cat > "$OUT/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ECE 109 Interactive Lessons</title>
<style>
  body { font-family: 'IBM Plex Sans', 'Segoe UI', sans-serif; background: #13151c; color: #e0e0e0; margin: 0; padding: 40px 20px; }
  h1 { color: #c8a45a; font-family: 'IBM Plex Mono', monospace; font-size: 20px; letter-spacing: 0.08em; text-transform: uppercase; }
  ul { list-style: none; padding: 0; max-width: 600px; }
  li { margin: 8px 0; }
  a { color: #4a90d9; text-decoration: none; font-size: 16px; }
  a:hover { text-decoration: underline; }
  .note { color: #9498ac; font-size: 13px; margin-top: 4px; }
</style>
</head>
<body>
<h1>ECE 109 Interactive Lessons</h1>
<div style="margin-bottom: 24px; padding: 14px 18px; background: rgba(200,164,90,0.08); border: 1px solid rgba(200,164,90,0.25); border-radius: 6px; font-size: 13px; line-height: 1.7; color: #b0b4c4;">
  <b style="color: #c8a45a;">Disclaimer:</b> While globally approved by the professor, there may be errors or content missing. In some cases, the lesson goes into more detail than needed. Keep this in mind when using this resource. This is not a step-by-step guide with exactly what will be on the exam. It is a tool. Content for these lessons has been compiled from lecture notes, the textbook, and online using Claude Code, generally the Opus 4.6 model on max effort. The lessons are built using many rounds of thorough multi-agent review and graphics are verified before being added. However, there is still potential for mistakes. I am not responsible in any way for any ensuing repercussions.
</div>
<div style="margin-bottom: 24px; padding: 14px 18px; background: #1a1d27; border: 1px solid #c8a45a; border-radius: 8px;">
  <span style="background: #c8a45a; color: #13151c; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.06em; margin-right: 10px;">New</span>
  <a href="/ece109_formula_sheet.pdf" style="color: #c8a45a; font-size: 15px; font-weight: 600;">Formula Sheet (PDF)</a>
  <div style="color: #9498ac; font-size: 12px; margin-top: 6px;">Not an official formula sheet, just a compilation of equations and variables from these lessons. Reminder: you must handwrite your formula sheet.</div>
</div>
<ul>
  <li><a href="/qm-waves/">Quantum Mechanics: Waves</a><div class="note">Waves, Schrodinger equation, infinite well</div></li>
  <li><a href="/qm-atoms/">Quantum Mechanics: Atoms</a><div class="note">Finite wells, tunneling, hydrogen atom</div></li>
  <li><a href="/bonding-crystals/">Bonding and Crystals</a><div class="note">Bonding, crystal structures, defects</div></li>
  <li><a href="/band-theory/">Band Theory</a><div class="note">Band theory, semiconductors, Fermi-Dirac</div></li>
  <li><a href="/conduction-optics/">Conduction and Optics</a><div class="note">Metallic conduction, thermoelectrics, optics</div></li>
  <li><a href="/dielectrics/">Dielectrics</a><div class="note">Polarization, piezoelectricity</div></li>
  <li><a href="/photonics/">Photonics</a><div class="note">Lasers, waveguides, modulators, photodetectors (not on the exam)</div></li>
</ul>
<div style="margin-top: 32px; padding: 12px 16px; border: 1px solid #333; border-radius: 6px; font-size: 13px; color: #9498ac;">
  Suggestions? Email <a href="mailto:me@ihsan.cc" style="color: #4a90d9;">me@ihsan.cc</a> or DM me on Instagram or <a href="https://www.linkedin.com/in/ihsan-sa/" style="color: #4a90d9;">LinkedIn</a>.
</div>
<div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #333; font-size: 12px; color: #666; font-family: 'IBM Plex Mono', monospace;">&copy; 2026 Ihsan S. All rights reserved.</div>
<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "a0352d88c30140ec8bd0972184f2009f"}'></script><!-- End Cloudflare Web Analytics -->
</body>
</html>
HTML

# Copy formula sheet PDF to dist
cp ece109_formula_sheet.pdf "$OUT/" 2>/dev/null || echo "Warning: formula sheet PDF not found"

echo "Done. Output in $OUT/"
