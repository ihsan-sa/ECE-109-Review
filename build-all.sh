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
<ul>
  <li><a href="/qm-waves/">Quantum Mechanics: Waves</a><div class="note">Waves, Schrodinger equation, infinite well</div></li>
  <li><a href="/qm-atoms/">Quantum Mechanics: Atoms</a><div class="note">Finite wells, tunneling, hydrogen atom</div></li>
  <li><a href="/bonding-crystals/">Bonding and Crystals</a><div class="note">Bonding, crystal structures, defects</div></li>
  <li><a href="/band-theory/">Band Theory</a><div class="note">Band theory, semiconductors, Fermi-Dirac</div></li>
  <li><a href="/conduction-optics/">Conduction and Optics</a><div class="note">Metallic conduction, thermoelectrics, optics</div></li>
  <li><a href="/dielectrics/">Dielectrics</a><div class="note">Polarization, piezoelectricity</div></li>
  <li><a href="/photonics/">Photonics</a><div class="note">Lasers, waveguides, modulators, photodetectors (not on the exam)</div></li>
</ul>
</body>
</html>
HTML

echo "Done. Output in $OUT/"
