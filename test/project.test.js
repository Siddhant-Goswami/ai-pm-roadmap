const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('participant-facing sources do not mention a paid program', () => {
  const sources = ['index.html', 'js/config.js', 'js/data.js', 'js/app.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(sources, /paid\s+(21-day\s+track|cohort|program)/i);
});

test('contact collection appears after every assessment question', () => {
  const app = fs.readFileSync('js/app.js', 'utf8');
  assert.match(
    app,
    /\.\.\.data\.questions,\s*\{ id: 'contact', module: 'contact', type: 'contact' \}/
  );
});

test('no participant-facing roadmap is generated or rendered', () => {
  const sources = ['js/engine.js', 'js/app.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(sources, /generateRoadmap|Your personalized build path|Seven days\. One working proof/);
});

test('generic conversion copy is absent', () => {
  const sources = ['js/config.js', 'js/data.js', 'js/app.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(sources, /Unlock your roadmap|Applications close soon|Show my 7-day roadmap/i);
});

test('assessment questions do not enforce minimum response lengths', () => {
  const sources = ['js/data.js', 'js/engine.js', 'js/app.js']
    .map((path) => fs.readFileSync(path, 'utf8'))
    .join('\n');
  assert.doesNotMatch(sources, /minLength|Add a little more detail|at least \d+ characters/);
});

test('the Edge Function recomputes assessment and upserts the unique webinar phone', () => {
  const source = fs.readFileSync('supabase/functions/submit-application/index.ts', 'utf8');
  assert.match(source, /const assessment = scoreAssessment\(answers\)/);
  assert.match(source, /const learningPriorities = rankLearningPriorities\(answers\)/);
  assert.match(source, /onConflict: 'webinar_id,phone_e164'/);
  assert.match(source, /roadmap: null/);
});
