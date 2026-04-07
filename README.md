# ECE 109 Interactive Lessons

![Lesson screenshot](images/Screenshot%202026-04-07%20163944.png)

Tabbed React apps for ECE 109 (Principles of Electronic Materials), Winter 2026. KaTeX equations, inline SVG graphs, animations, and an embedded Claude tutor chatbot.

## Prerequisites

You need **Node.js** (version 18 or higher) and **npm** (comes bundled with Node.js).

### Installing Node.js

1. Go to [https://nodejs.org](https://nodejs.org) and download the **LTS** version.
2. Run the installer and follow the prompts (defaults are fine).
3. Verify it worked by opening a terminal and running:

```bash
node --version
npm --version
```

Both should print a version number.

### Opening a terminal

- **Windows:** Press `Win + R`, type `cmd`, and hit Enter. Or search for "Terminal" in the Start menu.
- **Mac:** Press `Cmd + Space`, type "Terminal", and hit Enter.
- **Linux:** `Ctrl + Alt + T` on most distros.

### Cloning this repo

If you have [Git](https://git-scm.com/downloads) installed:

```bash
git clone https://github.com/ihsan-sa/ECE-109-Review.git
cd ECE-109-Review
```

Or click the green **Code** button on GitHub and select **Download ZIP**, then extract it.

## Lessons

| Folder | Topic |
|--------|-------|
| `qm-waves` | Waves, Schrodinger equation, infinite well |
| `qm-atoms` | Finite wells, tunneling, hydrogen atom |
| `bonding-crystals` | Bonding, crystal structures, defects |
| `band-theory` | Band theory, semiconductors, Fermi-Dirac |
| `conduction-optics` | Metallic conduction, thermoelectrics, optics |
| `dielectrics` | Polarization, piezoelectricity |
| `photonics` | Lasers, waveguides, modulators, photodetectors -- **NOT ON THE EXAM; built for personal curiosity only** |

## Running a Lesson

Content, graphs, and animations work on their own. The chatbot panel will appear but won't connect unless you also run the proxy (see below).

1. Open a terminal and navigate into a lesson folder:

```bash
cd claude_lessons/qm-waves
```

2. Install dependencies (only needed the first time):

```bash
npm install
```

3. Start the dev server:

```bash
npx vite
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser. If you run multiple lessons, ports auto-increment (5174, 5175, ...).

## Enabling the Chatbot (requires Claude Code)

The AI tutor chatbot needs [Claude Code](https://claude.ai/claude-code) installed. In the lesson folder, run the proxy in one terminal and Vite in another:

**Terminal 1:**
```bash
cd claude_lessons/qm-waves
node server/proxy.js
```

**Terminal 2:**
```bash
cd claude_lessons/qm-waves
npx vite
```

To launch all 7 lessons at once, paste this into Claude Code:

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

## Suggestions?

Email [me@ihsan.cc](mailto:me@ihsan.cc) or DM me on Instagram or [LinkedIn](https://www.linkedin.com/in/ihsan-sa/).
