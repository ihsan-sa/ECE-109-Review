## Lesson App

ECE 109 (Principles of Electronic Materials) interactive lesson on Bonding, Crystal Structures, and Defects.

**Stack**: React + Vite, KaTeX for math rendering, pure SVG graphs, embedded Claude chatbot via local proxy server.

**How to run**:
1. `npm install` (first time)
2. Start proxy: `node server/proxy.js`
3. In another terminal: `npx vite` (or `npm run dev`)
4. Open the URL shown by Vite (typically http://localhost:5173)

The Vite dev server proxies `/chat`, `/session/*`, `/sessions`, and `/upload` to the local Claude proxy on port 3001.

**Key files**:
- `src/bonding_crystals.jsx` -- main lesson component (all tabs, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Claude API proxy server
- `test_lesson.cjs` -- 17-test automated QA suite

**Tabs**: Interatomic Forces, Bond Types, Crystal Structures, Miller Indices, Crystal Defects, Graph Preview

**Graphs**: InteratomicPotentialEnergy (E(r) vs r for NaCl), InteratomicForce (F(r) vs r). Both parameterized and editable via chatbot.
