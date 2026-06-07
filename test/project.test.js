const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('participant-facing sources do not mention a paid program', () => {
  const sources = ['index.html', 'js/config.js', 'js/data.js', 'js/app.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(sources, /paid\s+(21-day\s+track|cohort|program)/i);
});

test('contact collection appears after every diagnostic question', () => {
  const app = fs.readFileSync('js/app.js', 'utf8');
  assert.match(
    app,
    /\.\.\.data\.questions,\s*\{ id: 'contact', module: 'contact', type: 'contact' \}/
  );
});

test('the Edge Function recomputes results and upserts the unique webinar phone', () => {
  const source = fs.readFileSync('supabase/functions/submit-application/index.ts', 'utf8');
  assert.match(source, /const diagnostic = scoreDiagnostic\(answers\)/);
  assert.match(source, /const roadmap = generateRoadmap\(answers, diagnostic\)/);
  assert.match(source, /onConflict: 'webinar_id,phone_e164'/);
});

