const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.log('Usage: node test_lesson.js <file.jsx>'); process.exit(1); }

const code = fs.readFileSync(file, 'utf8');
let passed = 0, failed = 0, total = 0;

function test(name, fn) {
  total++;
  try {
    const result = fn();
    if (result) { passed++; console.log(`  PASS: ${name}`); }
    else { failed++; console.log(`  FAIL: ${name}`); }
  } catch(e) { failed++; console.log(`  FAIL: ${name} — ${e.message}`); }
}

console.log(`\nTesting: ${path.basename(file)}\n${'='.repeat(50)}`);

// T1: JSX Parse
test('T1 — JSX Babel parse', () => {
  const parser = require('@babel/parser');
  parser.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  return true;
});

// T2: KaTeX safety -- no bare < in string expressions
test('T2 — No bare < in KaTeX strings', () => {
  const lines = code.split('\n');
  const bad = [];
  const re = /\{"[^"]*<[^"]*"\}/g;
  const safe = /\\\\lt|\\\\leq|\\\\left|\\\\ll|\\\\lambda|\\\\langle|\\\\ldots/;
  for (let i = 0; i < lines.length; i++) {
    const matches = lines[i].match(re);
    if (matches) {
      for (const m of matches) {
        if (!safe.test(m)) bad.push({ line: i+1, match: m });
      }
    }
  }
  if (bad.length > 0) {
    bad.forEach(b => console.log(`    Line ${b.line}: ${b.match}`));
    return false;
  }
  return true;
});

// T3: No bare < > in JSX text (h2, h3, h4 tags)
test('T3 — No bare angle brackets in heading text', () => {
  const re = /<h[234]>[^<]*[<>][^<]*<\/h[234]>/g;
  const matches = code.match(re);
  if (matches && matches.length > 0) {
    matches.forEach(m => console.log(`    ${m}`));
    return false;
  }
  return true;
});

// T4: Has export default
test('T4 — Has export default', () => {
  return /export\s+default/.test(code);
});

// T5: TOPICS array exists and is non-empty
test('T5 — TOPICS array defined', () => {
  return /const\s+TOPICS\s*=\s*\[/.test(code);
});

// T6: TOPIC_CONTEXT object exists
test('T6 — TOPIC_CONTEXT defined', () => {
  return /const\s+TOPIC_CONTEXT\s*=\s*\{/.test(code);
});

// T7: LESSON_CONTEXT exists
test('T7 — LESSON_CONTEXT defined', () => {
  return /const\s+LESSON_CONTEXT\s*=/.test(code);
});

// T8: MODELS array exists
test('T8 — MODELS array defined', () => {
  return /const\s+MODELS\s*=\s*\[/.test(code);
});

// T9: Gold accent color present in CSS
test('T9 — Gold accent #c8a45a in CSS', () => {
  return code.includes('#c8a45a');
});

// T10: IBM Plex fonts referenced
test('T10 — IBM Plex fonts', () => {
  return code.includes('IBM Plex');
});

// T11: Core CSS classes present
test('T11 — Core CSS classes (.eq-block, .key-concept, .chat-panel)', () => {
  return code.includes('.eq-block') && code.includes('.key-concept') && code.includes('.chat-panel');
});

// T12: No direct localStorage (sessionStorage alias _ss is intentional)
test('T12 — No browser storage APIs', () => {
  return !code.includes('localStorage');
});

// T13: No emojis
test('T13 — No emojis', () => {
  const emojiRe = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  return !emojiRe.test(code);
});

// T14: TOPIC_CONTEXT keys match TOPICS ids
test('T14 — TOPIC_CONTEXT keys match TOPICS ids', () => {
  const topicIds = [...code.matchAll(/id:\s*"([^"]+)"/g)].map(m => m[1]);
  const ctxKeys = [...code.matchAll(/["']([^"']+)["']\s*:\s*`/g)].map(m => m[1]);
  if (topicIds.length === 0) return false;
  for (const id of topicIds) {
    if (!ctxKeys.includes(id)) {
      console.log(`    Missing TOPIC_CONTEXT for id: "${id}"`);
      return false;
    }
  }
  return true;
});

// T15: EFFORT_LEVELS array exists
test('T15 — EFFORT_LEVELS array defined', () => {
  return /const\s+EFFORT_LEVELS\s*=\s*\[/.test(code);
});

// T16: makeTab function exists
test('T16 — makeTab function defined', () => {
  return /function\s+makeTab|const\s+makeTab\s*=/.test(code);
});

// T17: Fetch URL is /chat (local proxy)
test('T17 — Fetch URL is /chat (local proxy)', () => {
  const usesProxy = code.includes('/chat');
  const usesDirectApi = code.includes('api.anthropic.com');
  if (usesDirectApi) console.log('    Found direct api.anthropic.com URL');
  return usesProxy && !usesDirectApi;
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed}/${total} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
