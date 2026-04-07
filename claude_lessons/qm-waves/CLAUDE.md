## Lesson App

**Project**: ECE 109 -- QM I: Waves and the Schrodinger Equation
**Course**: ECE 109 (Principles of Electronic Materials for Engineering), University of Waterloo, Winter 2026
**Topic**: Introduction to Quantum Mechanics (Lectures 1-6)

### Stack
- React 19 + Vite 6 (JSX, no TypeScript)
- KaTeX for math rendering (loaded from CDN)
- Pure inline SVG graphs (no D3/recharts)
- Express proxy server for Claude API chat integration

### How to Run
1. Start the proxy: `npm run proxy` (finds an available port, writes to `server/.proxy-port`)
2. Start Vite dev server: `npm run dev`
3. Open the URL Vite prints (default `http://localhost:5173`)

### Key Files
- `src/qm_waves.jsx` -- Main lesson component (all content, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Express proxy for Claude API
- `test_lesson.cjs` -- 17-test automated QA suite
- `index.html` -- HTML shell

### Testing
```bash
node test_lesson.cjs src/qm_waves.jsx
```

### Tabs
1. Wave-Particle Duality (historical context, E=hf, de Broglie, photoelectric effect)
2. Wave Equation (classical wave eq, EM waves, plane wave solutions, vector calc)
3. QM Formalism (wavefunctions, probability, operators, expectation values)
4. Schrodinger Equation (time-dependent/independent SE, Hamiltonian, stationary states)
5. Infinite Potential Well (boundary conditions, psi_n, E_n, probability density)
6. Graph Preview (all graphs for screenshot-based review)

### Graphs
- InfiniteWellWavefunctions: psi_n(x) for n=1..4 with energy level lines
- ProbabilityDensity: |psi_n(x)|^2 for n=1..4
- EnergyLevelDiagram: E_n levels proportional to n^2, parameterized by well width
