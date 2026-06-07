(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RoadmapEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SELF_DOUBT = [
    'not technical', 'not cut out', 'not built', 'not smart', 'i cannot', "i can't",
    'imposter', 'gave up', 'quit', 'stupid', 'bad at', 'not capable', 'failed'
  ];
  const ACTION_WORDS = [
    'built', 'tried', 'course', 'tutorial', 'prototype', 'automation', 'project',
    'spent', 'paid', 'hours', 'week', 'youtube', 'learned'
  ];

  function text(value) {
    return String(value || '').trim();
  }

  function includesAny(value, words) {
    const normalized = text(value).toLowerCase();
    return words.some((word) => normalized.includes(word));
  }

  function answerArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function scoreDiagnostic(answers) {
    let profile = 0;
    if (answers.path === 'nontechnical' || answers.path === 'switcher') profile += 1;
    if (answers.employment === 'employed' || answers.employment === 'worried') profile += 1;
    if (answers.shipping === 'never' || answers.shipping === 'help') profile += 1;

    let identity = 0;
    const identityText = [answers.builder_identity, answers.break_response, answers.blocker].join(' ');
    if (includesAny(answers.break_response, SELF_DOUBT)) identity += 2;
    else if (text(answers.break_response).length >= 60) identity += 1;
    if (text(identityText).length >= 160) identity += 1;
    identity = Math.min(3, identity);

    let intent = 0;
    const attempts = answerArray(answers.attempts);
    if (attempts.some((item) => ['tutorials', 'course', 'paid', 'built'].includes(item))) intent += 1;
    if (includesAny(answers.prior_effort, ACTION_WORDS) && text(answers.prior_effort).length >= 50) intent += 1;
    if (answers.commitment === 'yes' && text(answers.why_now).length >= 50 && text(answers.seat_case).length >= 45) intent += 1;

    let clarity = 0;
    if (text(answers.workflow).length >= 45 && text(answers.desired_build).length >= 35) clarity = 1;

    const flags = [];
    if (answers.shipping === 'regular') flags.push('already-ships-regularly');
    if (answers.commitment === 'unsure') flags.push('commitment-uncertain');
    if (text(answers.seat_case).length < 45) flags.push('low-detail-seat-case');
    if (answers.commitment === 'unsure' && text(answers.seat_case).length < 45) flags.push('manual-review-priority');

    const participant = {
      shippingReadiness: answers.shipping === 'regular' ? 5 : answers.shipping === 'few' ? 4 : answers.shipping === 'help' ? 2 : 1,
      builderConfidence: includesAny(identityText, SELF_DOUBT) ? 1 : text(identityText).length >= 160 ? 3 : 2,
      actionMomentum: Math.min(5, Math.max(1, attempts.filter((item) => item !== 'nothing').length + (includesAny(answers.prior_effort, ACTION_WORDS) ? 1 : 0))),
      workflowClarity: clarity ? 5 : text(answers.workflow).length >= 25 ? 3 : 1,
      sprintReadiness: answers.commitment === 'yes' ? 5 : answers.commitment === 'mostly' ? 3 : 1
    };

    const total = profile + identity + intent + clarity;
    let readinessState = 'Starting Line';
    if (participant.shippingReadiness >= 4) readinessState = 'Active Builder';
    else if (participant.actionMomentum >= 3 && participant.builderConfidence <= 2) readinessState = 'Stalled Experimenter';
    else if (participant.actionMomentum >= 3 || participant.workflowClarity >= 4) readinessState = 'Emerging Shipper';

    return {
      internal: { profileFit: profile, identitySignal: identity, intent, personalizationClarity: clarity, total, flags },
      participant,
      readinessState
    };
  }

  function getToolLabel(answers) {
    const labels = {
      notion: 'Notion', jira: 'Jira or Linear', sheets: 'Sheets', slack: 'Slack or Teams',
      email: 'email', figma: 'Figma', analytics: 'your analytics tool', crm: 'your CRM'
    };
    const tools = answerArray(answers.tools).map((tool) => labels[tool]).filter(Boolean);
    if (text(answers.tools_other)) tools.push(text(answers.tools_other));
    return tools.slice(0, 2).join(' and ') || 'the tools you already use';
  }

  function generateRoadmap(answers, diagnostic) {
    const workflow = text(answers.workflow) || 'your repetitive workflow';
    const desired = text(answers.desired_build) || 'a useful working prototype';
    const tools = getToolLabel(answers);
    const slot = {
      morning: 'early-morning hour', lunch: 'lunch-hour block', evening: 'evening block',
      late: 'late-night block', weekend: 'weekend focus block'
    }[answers.focus_time] || 'focused hour';

    const supportNote = diagnostic.participant.builderConfidence <= 2
      ? 'Write down every break as a system observation, not a verdict on your ability.'
      : 'Record the decisions you make so the build becomes repeatable.';

    return [
      { day: 1, title: 'Map the job, not the feature', detail: `Turn “${workflow}” into a simple before-and-after workflow. Define one measurable sign that it improved.` },
      { day: 2, title: 'Make the inputs real', detail: `Collect three representative examples from ${tools}. Mark the minimum input your v1 needs and the exact output it should create.` },
      { day: 3, title: 'Build the narrow happy path', detail: `Create the smallest version that produces “${desired}” for one clean example. Ignore integrations and polish.` },
      { day: 4, title: 'Connect your actual workflow', detail: `Move one real input through the prototype using ${tools}. Keep manual copy-paste steps if they help you finish.` },
      { day: 5, title: 'Design for the break', detail: `Test missing, messy, and ambiguous inputs. Add one recovery path. ${supportNote}` },
      { day: 6, title: 'Run it on real work', detail: `Use the build on a task you genuinely need to complete. Measure time saved, corrections needed, and where trust drops.` },
      { day: 7, title: 'Package the proof', detail: `Use your ${slot} to prepare a three-minute demo: the old workflow, the working build, the evidence, and the next improvement.` }
    ];
  }

  function normalizePhone(countryCode, phone) {
    const code = text(countryCode).replace(/[^\d+]/g, '');
    let digits = text(phone).replace(/\D/g, '');
    if (code === '+91' && digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    const normalizedCode = code.startsWith('+') ? code : `+${code}`;
    const result = `${normalizedCode}${digits}`;
    if (!/^\+[1-9]\d{9,14}$/.test(result)) return null;
    return result;
  }

  function validateAnswers(answers, questions) {
    const errors = {};
    questions.forEach((question) => {
      const value = answers[question.id];
      if (question.type === 'multi') {
        if (!Array.isArray(value) || !value.length) errors[question.id] = 'Choose at least one option.';
        return;
      }
      if (!text(value)) {
        errors[question.id] = 'Answer this question to continue.';
        return;
      }
      if (question.minLength && text(value).length < question.minLength) {
        errors[question.id] = `Add a little more detail (at least ${question.minLength} characters).`;
      }
    });
    return errors;
  }

  return { scoreDiagnostic, generateRoadmap, normalizePhone, validateAnswers, includesAny };
});
