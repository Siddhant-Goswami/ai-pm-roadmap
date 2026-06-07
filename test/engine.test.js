const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const engine = require('../js/engine.js');

const dataContext = {};
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), dataContext);
const questions = vm.runInContext('ROADMAP_DATA.questions', dataContext);

function targetAnswers(overrides = {}) {
  return {
    role: 'Product Manager',
    path: 'nontechnical',
    employment: 'worried',
    shipping: 'never',
    builder_identity: 'I am the kind of person who has ideas but assumes I am not technical enough to finish them.',
    break_response: 'I told myself I was not cut out for this, closed the laptop, and gave up on the build.',
    attempts: ['tutorials', 'course', 'built'],
    prior_effort: 'I spent several weeks watching tutorials, started a course, and tried to build a prototype before getting stuck.',
    workflow: 'I manually sort customer interview notes into themes and turn them into a weekly product insight document.',
    tools: ['notion', 'slack'],
    desired_build: 'A working assistant that groups interview notes and drafts a traceable insight summary.',
    focus_time: 'evening',
    commitment: 'yes',
    why_now: 'My role is changing quickly and I need concrete evidence that I can own the complete path from problem to working output.',
    seat_case: 'I have a real workflow ready to use and will protect the daily hour. I will test the build on live work and report the failures honestly.',
    ...overrides
  };
}

test('the streamlined diagnostic contains exactly 15 required questions', () => {
  assert.equal(questions.length, 15);
  const errors = engine.validateAnswers(targetAnswers(), questions);
  assert.deepEqual(errors, {});
});

test('the exact target receives full internal rubric marks', () => {
  const result = engine.scoreDiagnostic(targetAnswers());
  assert.deepEqual(result.internal, {
    profileFit: 3,
    identitySignal: 3,
    intent: 3,
    personalizationClarity: 1,
    total: 10,
    flags: []
  });
  assert.equal(result.readinessState, 'Stalled Experimenter');
});

test('a regular shipper is identified without exposing a rejection label', () => {
  const result = engine.scoreDiagnostic(targetAnswers({
    path: 'technical',
    employment: 'independent',
    shipping: 'regular',
    break_response: 'I isolated the failing input, changed the implementation, and tested the workflow again.'
  }));
  assert.equal(result.readinessState, 'Active Builder');
  assert.ok(result.internal.flags.includes('already-ships-regularly'));
  assert.doesNotMatch(result.readinessState, /reject|disqualif/i);
});

test('uncertain commitment and a short seat case receive review flags', () => {
  const result = engine.scoreDiagnostic(targetAnswers({
    commitment: 'unsure',
    seat_case: 'I am interested.'
  }));
  assert.ok(result.internal.flags.includes('commitment-uncertain'));
  assert.ok(result.internal.flags.includes('low-detail-seat-case'));
  assert.ok(result.internal.flags.includes('manual-review-priority'));
});

test('roadmap uses the participant workflow, tools, desired build, and schedule', () => {
  const answers = targetAnswers();
  const result = engine.scoreDiagnostic(answers);
  const roadmap = engine.generateRoadmap(answers, result);
  const rendered = roadmap.map((day) => day.detail).join(' ');

  assert.equal(roadmap.length, 7);
  assert.match(rendered, /customer interview notes/);
  assert.match(rendered, /Notion and Slack or Teams/);
  assert.match(rendered, /working assistant/);
  assert.match(rendered, /evening block/);
});

test('phone normalization supports India defaults and international E.164', () => {
  assert.equal(engine.normalizePhone('+91', '098765 43210'), '+919876543210');
  assert.equal(engine.normalizePhone('+1', '(415) 555-2671'), '+14155552671');
  assert.equal(engine.normalizePhone('+91', '123'), null);
});

test('required and minimum-length validation catches incomplete answers', () => {
  const answers = targetAnswers({ workflow: 'Too short', tools: [] });
  const errors = engine.validateAnswers(answers, questions);
  assert.match(errors.workflow, /at least 25/);
  assert.equal(errors.tools, 'Choose at least one option.');
});

