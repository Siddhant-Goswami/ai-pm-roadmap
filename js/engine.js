(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RoadmapEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SELF_DOUBT = [
    'not technical', 'not cut out', 'not built', 'not smart', 'i cannot', "i can't",
    'imposter', 'gave up', 'quit', 'stupid', 'bad at', 'not capable', 'failed'
  ];

  const TOPIC_RULES = [
    {
      id: 'rag', label: 'RAG',
      description: 'Ground model responses in the documents and knowledge your work depends on.',
      terms: ['document', 'knowledge', 'research', 'notes', 'policy', 'content', 'search', 'notion', 'drive', 'wiki']
    },
    {
      id: 'llm-as-judge', label: 'LLM-as-judge',
      description: 'Use models to review, classify, compare, or score outputs against explicit criteria.',
      terms: ['review', 'classif', 'score', 'quality', 'priorit', 'triage', 'assess', 'rank', 'evaluate']
    },
    {
      id: 'guardrails', label: 'Guardrails',
      description: 'Set boundaries for sensitive, customer-facing, or consequential model behavior.',
      terms: ['customer', 'user', 'support', 'sensitive', 'private', 'compliance', 'decision', 'approval', 'risk']
    },
    {
      id: 'observability', label: 'Observability',
      description: 'Trace multi-step AI workflows so failures, latency, and cost are visible.',
      terms: ['integration', 'api', 'workflow', 'handoff', 'system', 'automation', 'slack', 'jira', 'crm', 'pipeline']
    }
  ];

  function text(value) {
    return String(value || '').trim();
  }

  function includesAny(value, words) {
    const normalized = text(value).toLowerCase();
    return words.some((word) => normalized.includes(word));
  }

  function detailScore(value, thresholds) {
    const length = text(value).length;
    if (length >= thresholds[2]) return 5;
    if (length >= thresholds[1]) return 4;
    if (length >= thresholds[0]) return 3;
    return length ? 2 : 1;
  }

  function scoreAssessment(answers) {
    const identityText = text(answers.break_response);
    const stats = {
      shippingExperience: answers.shipping === 'regular' ? 5 : answers.shipping === 'few' ? 4 : answers.shipping === 'help' ? 2 : 1,
      builderConfidence: includesAny(identityText, SELF_DOUBT) ? 1 : identityText.length >= 100 ? 4 : 3,
      goalClarity: detailScore(answers.success_metrics, [45, 90, 160]),
      userClarity: detailScore(answers.users_customers, [45, 90, 160]),
      processClarity: detailScore(answers.core_processes, [70, 140, 240]),
      systemClarity: detailScore(answers.systems_data, [35, 75, 140]),
      sprintAvailability: answers.commitment === 'yes' ? 5 : answers.commitment === 'mostly' ? 3 : 1
    };

    const flags = [];
    if (answers.shipping === 'regular') flags.push('already-ships-regularly');
    if (answers.commitment === 'unsure') flags.push('availability-uncertain');
    if (stats.processClarity <= 2) flags.push('process-detail-low');
    if (stats.goalClarity <= 2) flags.push('success-metric-detail-low');

    const average = Object.values(stats).reduce((sum, value) => sum + value, 0) / Object.keys(stats).length;
    let readinessState = 'Foundation';
    if (average >= 4) readinessState = 'Ready to scope';
    else if (average >= 3) readinessState = 'Promising starting point';

    return { stats, readinessState, flags };
  }

  function rankLearningPriorities(answers) {
    const context = [
      answers.success_metrics,
      answers.users_customers,
      answers.core_processes,
      answers.systems_data
    ].join(' ').toLowerCase();

    const candidates = [
      {
        id: 'ai-system-design',
        label: 'AI system design',
        description: 'Break an AI product into models, data, tools, state, and human decision points.',
        score: 6
      },
      {
        id: 'evals',
        label: 'Evals',
        description: 'Define measurable checks for quality before an AI workflow reaches real users.',
        score: 5
      },
      ...TOPIC_RULES.map((topic) => ({
        ...topic,
        score: topic.terms.reduce((score, term) => score + (context.includes(term) ? 2 : 0), 0)
      }))
    ];

    return candidates
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 3)
      .map(({ id, label, description }) => ({ id, label, description }));
  }

  function normalizePhone(countryCode, phone) {
    const codeDigits = text(countryCode).replace(/\D/g, '');
    let phoneDigits = text(phone).replace(/\D/g, '');
    if (!codeDigits || codeDigits.length > 4) return null;
    if (codeDigits === '91' && phoneDigits.length === 11 && phoneDigits.startsWith('0')) phoneDigits = phoneDigits.slice(1);
    const result = `+${codeDigits}${phoneDigits}`;
    if (!/^\+[1-9]\d{9,14}$/.test(result)) return null;
    return result;
  }

  function validateAnswers(answers, questions) {
    const errors = {};
    questions.forEach((question) => {
      const value = answers[question.id];
      if (!text(value)) {
        errors[question.id] = 'Answer this question to continue.';
      }
    });
    return errors;
  }

  return { scoreAssessment, rankLearningPriorities, normalizePhone, validateAnswers, includesAny };
});
