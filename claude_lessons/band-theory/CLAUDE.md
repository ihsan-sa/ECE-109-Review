## Lesson App

ECE 109 (Principles of Electronic Materials) -- Lesson 4: Band Theory and Electronic Properties.

Covers Lectures 9-12 and Kasap Ch. 4.1-4.4: band formation from molecular orbitals, energy band diagrams, semiconductors vs insulators vs metals, effective mass, density of states, and Fermi-Dirac statistics.

**Stack:** React + Vite, KaTeX for equations, inline SVG for graphs, embedded Claude CLI chatbot via local proxy.

**How to run:**
```
npm run dev          # Vite dev server (default port 5173)
node server/proxy.js # Chatbot proxy server
```

The Vite config proxies `/chat`, `/session/*`, `/sessions`, and `/upload` to the proxy server on port 3014.

**Key files:**
- `src/band_theory.jsx` -- Main lesson app (all content, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Claude API proxy for chatbot
- `test_lesson.cjs` -- 17-test validation suite

**Graphs (4 SVG components):**
1. EkParabola -- E vs k parabolic dispersion with curvature comparison
2. BandDiagram -- Side-by-side Si / SiO2 / Metal band diagrams
3. FermiDiracDistribution -- f(E) at multiple temperatures
4. DensityOfStates -- g(E) = C*sqrt(E) with occupied states overlay
