const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const engine = require('../js/engine.js');
const dataContext = {};
vm.createContext(dataContext);
vm.runInContext(fs.readFileSync('js/data.js', 'utf8'), dataContext);
const questions = vm.runInContext('ROADMAP_DATA.questions', dataContext);

function answers(overrides = {}) {
  return {
    role: 'Product Manager',
    shipping: 'help',
    break_response: 'I assumed I was not technical enough and stopped when the integration failed.',
    success_metrics: 'Increase qualified activation from 32% to 42% while reducing the time to first useful outcome.',
    users_customers: 'New product managers who need a clear first result without learning every internal system.',
    core_processes: 'We review research, prioritize onboarding issues, write experiments, coordinate delivery, and inspect activation every week.',
    systems_data: 'Notion research notes, Jira, Slack, product analytics, customer support tickets, and our CRM.',
    commitment: 'yes',
    ...overrides
  };
}

test('the OPT assessment contains exactly eight required questions', () => {
  assert.equal(questions.length, 8);
  assert.deepEqual(engine.validateAnswers(answers(), questions), {});
});

test('assessment produces seven bounded stats and review flags', () => {
  const result = engine.scoreAssessment(answers());
  assert.equal(Object.keys(result.stats).length, 7);
  Object.values(result.stats).forEach((score) => assert.ok(score >= 1 && score <= 5));
  assert.equal(result.stats.builderConfidence, 1);
  assert.equal(result.stats.sprintAvailability, 5);
});

test('learning priorities always include system design and respond to OPT context', () => {
  const priorities = engine.rankLearningPriorities(answers({
    core_processes: 'We review and score customer support conversations against quality criteria and compliance policy documents.',
    systems_data: 'Support tickets, policy documents, a knowledge base, and CRM records.'
  }));
  const ids = priorities.map((item) => item.id);
  assert.equal(priorities.length, 3);
  assert.ok(ids.includes('ai-system-design'));
  assert.ok(ids.includes('rag') || ids.includes('llm-as-judge') || ids.includes('guardrails'));
});

test('custom international calling codes normalize to E.164', () => {
  assert.equal(engine.normalizePhone('+91', '098765 43210'), '+919876543210');
  assert.equal(engine.normalizePhone('+358', '40 123 4567'), '+358401234567');
  assert.equal(engine.normalizePhone('1', '(415) 555-2671'), '+14155552671');
  assert.equal(engine.normalizePhone('+12345', '5551234567'), null);
});

test('short answers are accepted while blank answers are rejected', () => {
  assert.deepEqual(engine.validateAnswers(answers({
    role: 'PM',
    break_response: 'Stopped',
    success_metrics: 'Retention',
    users_customers: 'PMs',
    core_processes: 'Research',
    systems_data: 'Slack'
  }), questions), {});

  const errors = engine.validateAnswers(answers({ core_processes: '   ' }), questions);
  assert.equal(errors.core_processes, 'Answer this question to continue.');
});
