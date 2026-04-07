## Lesson App

ECE 109 Lesson 5: Metallic Conduction and Optical Properties. Interactive tabbed lesson app with embedded Claude tutor chatbot.

**Course**: ECE 109 -- Principles of Electronic Materials for Engineering, University of Waterloo, Winter 2026
**Topics**: Lectures 12-14. Free electron model, Drude model, metal contacts, Seebeck effect, EM waves in media, dispersion, Fresnel equations.

**Stack**: React + Vite, KaTeX (CDN), inline SVG graphs, Claude API via local proxy server.

**How to run**:
1. `node server/proxy.js` -- starts the proxy server (handles Claude API auth)
2. `npx vite` -- starts the dev server with HMR

The proxy server picks an available port automatically. Vite proxies `/chat`, `/session/*`, `/sessions`, and `/upload` to the proxy.

**Key files**:
- `src/conduction_optics.jsx` -- main lesson component (all tabs, graphs, chatbot)
- `src/main.jsx` -- React entry point
- `server/proxy.js` -- Claude API proxy server
- `test_lesson.cjs` -- 17-test automated QA suite

**Graphs** (3 SVG components, parameterized via `DEFAULT_GRAPH_PARAMS`):
1. `SeebeckCoefficient` -- S vs T for copper (diffusion + phonon drag)
2. `RefractiveIndexDispersion` -- n vs wavelength using Sellmeier equation
3. `FresnelReflection` -- Rs and Rp vs angle of incidence with Brewster angle

**Testing**: `node test_lesson.cjs src/conduction_optics.jsx` (requires @babel/parser)
