## Lesson App

**Project**: ECE 109 -- Dielectric Materials and Piezoelectricity Interactive Lesson
**Course**: ECE 109 (Principles of Electronic Materials), University of Waterloo, Winter 2026
**Topic**: Kasap Ch. 7 (sections 7.1-7.5, 7.7-7.8) covering electric polarization, displacement field, polarization mechanisms, frequency dependence of permittivity, Debye relaxation, loss tangent, Gauss's law in dielectrics, capacitors, piezoelectricity, and quartz oscillators.

### Stack
- React (via CDN/Vite), single-file JSX component
- KaTeX for equation rendering (loaded from CDN)
- Pure SVG graphs (no external charting libraries)
- Embedded Claude chatbot via local proxy server
- Vite dev server for hot reload

### How to Run
1. Start the proxy server: `node server/proxy.js`
2. Start the dev server: `npx vite`
3. Open `http://localhost:5173` in a browser

The proxy server handles Claude API authentication; the Vite dev server proxies `/chat`, `/session/*`, and `/upload` requests to the proxy.

### Key Files
- `src/dielectrics.jsx` -- Main lesson component (all content, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Claude API proxy server
- `test_lesson.cjs` -- 17-test automated QA suite
- `vite.config.js` -- Vite configuration with proxy settings

### Testing
Run `node test_lesson.cjs src/dielectrics.jsx` to execute the 17-test suite (Babel parse, KaTeX safety, structure checks, etc.).

### Tabs
1. Polarization -- Electric polarization P, displacement D, Clausius-Mossotti
2. Polarization Mechanisms -- Electronic, ionic, orientational, interfacial
3. Frequency Dependence -- Complex permittivity, Debye model, loss tangent, Cole-Cole
4. Gauss's Law and Capacitors -- Boundary conditions, capacitance, breakdown, materials
5. Piezoelectricity -- Direct/converse effects, quartz oscillators, applications
6. Graph Preview -- All SVG graphs in one scrollable view

### Graphs
1. DielectricVsFrequency -- eps_r' and eps_r'' vs log frequency, parameterized toggles for each mechanism
2. PolarizationMechanisms -- Visual bar chart of four mechanisms with frequency ranges
3. LossTangent -- tan(delta) vs frequency with adjustable peak frequency and height
