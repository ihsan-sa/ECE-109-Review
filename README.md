# ECE 109 Interactive Lessons

Tabbed React apps for ECE 109 (Principles of Electronic Materials), Winter 2026. KaTeX equations, inline SVG graphs, animations, and an embedded Claude tutor chatbot.

**Requires:** Node.js 18+

## Lessons

| Folder | Topic |
|--------|-------|
| `qm-waves` | Waves, Schrodinger equation, infinite well |
| `qm-atoms` | Finite wells, tunneling, hydrogen atom |
| `bonding-crystals` | Bonding, crystal structures, defects |
| `band-theory` | Band theory, semiconductors, Fermi-Dirac |
| `conduction-optics` | Metallic conduction, thermoelectrics, optics |
| `dielectrics` | Polarization, piezoelectricity |
| `photonics` | Lasers, waveguides, modulators, photodetectors |

## Standalone (no Claude Code)

Content, graphs, and animations work without Claude Code. The chatbot panel appears but cannot connect.

```bash
cd claude_lessons/qm-waves
npm install && npx vite
```

Open `http://localhost:5173`. Multiple lessons auto-increment ports (5174, 5175, ...).

## With Claude Code

Enables the AI tutor chatbot via a local proxy that spawns `claude` CLI sessions.

```bash
cd claude_lessons/qm-waves
npm install
node server/proxy.js &
npx vite
```

To launch all 7 lessons at once, paste into Claude Code:

> **Install dependencies for all lessons, then launch all proxy servers and Vite dev servers in parallel, and open them in Chrome.**

## Structure

Each lesson under `claude_lessons/<slug>/`:

```
src/<slug>.jsx      Lesson component (content, graphs, chatbot, animations)
src/main.jsx        React entry
server/proxy.js     Claude CLI proxy (Express)
test_lesson.cjs     Validation suite (17 tests)
vite.config.js      Vite config with proxy routing
index.html          HTML shell
```

## Tests

```bash
cd claude_lessons/<slug>
node test_lesson.cjs src/<slug_with_underscores>.jsx
```

## Tech Stack

React 19, Vite 6, KaTeX (CDN), Express, inline SVG. Dark theme, gold accent `#c8a45a`, IBM Plex Sans/Mono.
