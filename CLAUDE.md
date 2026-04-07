# CLAUDE.md

ECE 109 (Principles of Electronic Materials) interactive lesson apps. React + Vite + KaTeX + inline SVG + Claude CLI chatbot.

## Building and Launching All Lessons

When the user asks to install, build, or launch lessons:

1. **Install dependencies:** For each lesson directory under `claude_lessons/*/`, run `npm install` (parallelize with background Bash commands).
2. **Launch processes:** For each lesson, fire two background Bash commands:
   - `cd "<lesson_root>" && node ./server/proxy.js`
   - `cd "<lesson_root>" && npx vite`
   Launch all in parallel in a single message.
3. **Open browser:** After launching, run: `start chrome http://localhost:5173 http://localhost:5174 ...` (ports 5173+ sequentially, one per lesson).
4. **Display port table:** Show each lesson name, proxy port (3001+), and Vite port (5173+). Actual ports may differ; check `server/.proxy-port` for the real proxy port.

## Lesson Slugs

| Slug | Topic |
|------|-------|
| qm-waves | Waves, Schrodinger equation, infinite well |
| qm-atoms | Finite wells, tunneling, hydrogen atom |
| bonding-crystals | Bonding, crystal structures, defects |
| band-theory | Band theory, semiconductors, Fermi-Dirac |
| conduction-optics | Metallic conduction, thermoelectrics, optics |
| dielectrics | Polarization, piezoelectricity |
| photonics | Lasers, waveguides, modulators, photodetectors |

## Project Structure Per Lesson

- `src/<slug_with_underscores>.jsx` -- Lesson component (content, graphs, chatbot, animations)
- `src/main.jsx` -- React entry
- `server/proxy.js` -- Claude CLI proxy (Express, spawns `claude` CLI with `--resume`)
- `test_lesson.cjs` -- Validation suite (17 tests)
- `vite.config.js` -- Vite config with proxy routing to `server/.proxy-port`
- `index.html` -- HTML shell

## Running Tests

```bash
cd claude_lessons/<slug>
node test_lesson.cjs src/<slug_with_underscores>.jsx
```

Tests validate: JSX parse, no bare `<` in KaTeX, export default, TOPICS/TOPIC_CONTEXT/LESSON_CONTEXT/MODELS/EFFORT_LEVELS, gold accent `#c8a45a`, IBM Plex fonts, core CSS classes, no localStorage, no emojis, TOPIC_CONTEXT keys match TOPICS ids, makeTab, fetch to `/chat`.

## Key Conventions

- **Design:** Dark theme, gold accent `#c8a45a`, IBM Plex Sans/Mono
- **CSS classes:** `.eq-block`, `.key-concept`, `.chat-panel` required
- **Graphs:** Inline SVG in the JSX file, not separate files
- **Equations:** `katex.renderToString` + `dangerouslySetInnerHTML`
- **No localStorage/sessionStorage.** No emojis in lesson code.
- **Chat proxy:** All chat through `/chat` (local proxy), never direct to API

## Course Materials

Lecture PDFs (`w26-lecture*.pdf`) and textbooks in `course_materials/` (gitignored). Primary textbook: Kasap, 4th ed.
