## Lesson App

**Course**: ECE 109 -- Principles of Electronic Materials for Engineering, University of Waterloo, Winter 2026
**Topic**: Quantum Mechanics II: Confinement, Tunneling, and Atoms (Lectures 4-6)

### Stack
- React + Vite (JSX, no TypeScript)
- KaTeX for math rendering (loaded from CDN)
- Pure inline SVG for graphs (no D3 or external charting libraries)
- Embedded Claude CLI chatbot via local proxy server

### How to Run
1. Start the proxy server: `node server/proxy.js`
2. Start Vite dev server: `npx vite`
3. Open the URL printed by Vite (typically http://localhost:5173)

The proxy server handles Claude API authentication and session management. The Vite dev server serves the React app with hot reload.

### Port Allocation
- Vite dev server: auto-selects (default 5173, increments if busy)
- Proxy server: configured in `server/proxy.js` (default 3001)

### Key Files
- `src/qm_atoms.jsx` -- Main lesson component (all content, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Claude API proxy server
- `test_lesson.cjs` -- 17-test automated QA suite
- `vite.config.js` -- Vite configuration with proxy settings

### Tabs
1. Finite Potential Well -- bound states, evanescent tails, penetration depth
2. Quantum Tunneling -- transmission coefficient, STM, alpha decay
3. Uncertainty Principle -- Heisenberg relations, zero-point energy
4. Hydrogen Atom -- quantum numbers, energy levels, orbital shapes
5. Atoms & Periodic Table -- Pauli exclusion, aufbau, Hund's rules, trends
6. Graph Preview -- all graphs in one scrollable view for visual QA

### Graphs (SVG)
1. FiniteWellWavefunctions -- sinusoidal modes inside well with evanescent tails
2. TunnelingProbability -- T vs barrier width (log scale) for multiple barrier heights
3. HydrogenEnergyLevels -- energy level diagram n=1 through n=5 with subshell labels
