(function () {
  'use strict';

  const STORAGE_KEY = 'applied-ai-roadmap.opt-v1';
  const RECEIPT_KEY = 'applied-ai-roadmap.receipt.opt-v1';
  const config = window.APP_CONFIG;
  const data = window.ROADMAP_DATA;
  const engine = window.RoadmapEngine;
  const steps = [
    ...data.introSteps,
    ...data.questions,
    { id: 'contact', module: 'contact', type: 'contact' },
    { id: 'result', module: 'result', type: 'result' }
  ];
  const questionNumber = new Map(data.questions.map((question, index) => [question.id, index + 1]));
  const moduleStarts = {};
  steps.forEach((step, index) => {
    if (moduleStarts[step.module] === undefined) moduleStarts[step.module] = index;
  });

  const state = loadState();
  state.answers = state.answers && typeof state.answers === 'object' ? state.answers : {};
  state.contact = state.contact && typeof state.contact === 'object' ? state.contact : {};
  state.startedAt = Number.isFinite(state.startedAt) ? state.startedAt : Date.now();
  state.pos = Number.isInteger(state.pos) ? Math.max(0, Math.min(steps.length - 1, state.pos)) : 0;
  state.maxReached = Number.isInteger(state.maxReached) ? Math.max(state.pos, Math.min(steps.length - 1, state.maxReached)) : state.pos;
  state.submitted = Boolean(state.submitted);
  state.assessment = state.assessment || null;
  state.learningPriorities = Array.isArray(state.learningPriorities) ? state.learningPriorities : null;
  if (!state.submitted && steps[state.pos].type === 'result') state.pos = steps.length - 2;

  const stage = document.querySelector('#stage');
  const footer = document.querySelector('#stepFooter');
  const continueButton = document.querySelector('#continueBtn');
  const backButton = document.querySelector('#backBtn');
  const sidebar = document.querySelector('#sidebar');
  const scrim = document.querySelector('#scrim');
  const menuButton = document.querySelector('#menuBtn');

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app remains usable if browser storage is unavailable.
    }
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toast(message) {
    const node = document.querySelector('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(node.timer);
    node.timer = setTimeout(() => node.classList.remove('show'), 2400);
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    scrim.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  function goTo(index) {
    const target = Math.max(0, Math.min(steps.length - 1, index));
    if (target > state.maxReached || (steps[target].type === 'result' && !state.submitted)) return;
    state.pos = target;
    persist();
    closeSidebar();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    stage.focus({ preventScroll: true });
  }

  function unlockNext() {
    const next = Math.min(steps.length - 1, state.pos + 1);
    state.maxReached = Math.max(state.maxReached, next);
    state.pos = next;
    persist();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    stage.focus({ preventScroll: true });
  }

  function valueIsComplete(question) {
    const value = state.answers[question.id];
    if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
    const normalized = String(value || '').trim();
    if (!normalized) return false;
    return !question.minLength || normalized.length >= question.minLength;
  }

  function renderNavigation() {
    const nav = document.querySelector('#moduleNav');
    nav.innerHTML = '';
    const currentModule = steps[state.pos].module;

    data.modules.forEach((module) => {
      const start = moduleStarts[module.id];
      const unlocked = start <= state.maxReached && !(module.id === 'result' && !state.submitted);
      const nextStart = data.modules
        .map((item) => moduleStarts[item.id])
        .find((value) => value > start);
      const done = nextStart !== undefined ? state.maxReached >= nextStart : state.submitted;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `mod${currentModule === module.id ? ' active' : ''}${done ? ' done' : ''}`;
      button.disabled = !unlocked;
      if (currentModule === module.id) button.setAttribute('aria-current', 'step');
      button.innerHTML = `<span class="mod-num">${done ? '✓' : module.number}</span><span class="mod-label">${escapeHtml(module.title)}</span>`;
      button.addEventListener('click', () => goTo(start));
      nav.appendChild(button);
    });
  }

  function renderProgress() {
    const progressEnd = steps.length - 2;
    const current = Math.min(state.pos, progressEnd);
    const percent = state.submitted ? 100 : Math.round((current / progressEnd) * 100);
    document.querySelector('#progressFill').style.width = `${percent}%`;
    document.querySelector('#progressBar').setAttribute('aria-valuenow', String(percent));
    document.querySelector('#progressLabel').textContent = state.submitted ? 'Complete' : `${percent}%`;
  }

  function renderIntro(step) {
    return `
      <section class="step hero">
        <div class="hero-mark" aria-hidden="true">AI</div>
        <span class="eyebrow">The Applied AI Roadmap for PMs</span>
        <h1>${escapeHtml(step.title)}</h1>
        <p class="subtitle">${escapeHtml(step.subtitle)}</p>
        <p class="body-copy">${escapeHtml(step.body)}</p>
        <div class="promise-grid">
          <div class="promise"><b>8 focused questions</b><span>Only the context needed to review your starting point.</span></div>
          <div class="promise"><b>OPT context</b><span>Goals, users, processes, systems, and the tasks inside them.</span></div>
          <div class="promise"><b>Team review</b><span>Your seven-day plan is prepared after a person reviews your answers.</span></div>
        </div>
      </section>`;
  }

  function renderOpt(step) {
    return `
      <section class="step">
        <span class="eyebrow">${escapeHtml(step.eyebrow)}</span>
        <h1>${escapeHtml(step.title)}</h1>
        <p class="subtitle">${escapeHtml(step.body)}</p>
        <div class="comparison">
          <div class="compare-card"><span class="eyebrow">Operating model</span><h3>What success means</h3><p>For an instructor: students understand the material and can apply it.</p></div>
          <div class="compare-card"><span class="eyebrow">Process</span><h3>How the work repeats</h3><p>Prepare a lesson, teach it, review questions, and assess understanding.</p></div>
          <div class="compare-card active"><span class="eyebrow">Task</span><h3>What may be automated</h3><p>Group recurring student questions and draft a review worksheet.</p></div>
        </div>
        <p class="body-copy">The next questions capture the operating context before narrowing toward a task.</p>
        <a class="btn btn--secondary" href="${escapeHtml(data.optPromptUrl)}" target="_blank" rel="noopener noreferrer">Read the OPT Coach prompt ↗</a>
      </section>`;
  }

  function renderConcept(step) {
    const visual = step.variant === 'comparison'
      ? `<div class="comparison">
          <div class="compare-card"><span class="eyebrow">Old mode</span><h3>Spec writer</h3><ul><li>Defines the feature</li><li>Coordinates the handoff</li><li>Waits to see it work</li></ul></div>
          <div class="compare-card active"><span class="eyebrow">AI-native mode</span><h3>Shipper</h3><ul><li>Frames the workflow</li><li>Builds the first version</li><li>Brings evidence to the room</li></ul></div>
        </div>`
      : `<div class="promise-grid">
          <div class="promise"><b>Learn to code</b><span>Useful in context, too slow as an identity prerequisite.</span></div>
          <div class="promise"><b>Wait and watch</b><span>The capability gap compounds while the role keeps moving.</span></div>
          <div class="promise"><b>Prompt harder</b><span>Better drafts do not create end-to-end ownership.</span></div>
        </div>`;

    return `
      <section class="step">
        <span class="eyebrow">${escapeHtml(step.eyebrow)}</span>
        <h1>${escapeHtml(step.title)}</h1>
        <p class="subtitle">${escapeHtml(step.body)}</p>
        <div class="callout"><span class="callout-icon" aria-hidden="true">→</span><p><strong>The question is not “Can I code?”</strong><br />It is “Can I get one useful workflow to a working first version?”</p></div>
        ${visual}
      </section>`;
  }

  function renderQuestion(question) {
    const number = questionNumber.get(question.id);
    const value = state.answers[question.id];
    let control = '';

    if (question.type === 'single' || question.type === 'multi') {
      const selected = question.type === 'multi' && Array.isArray(value) ? value : [];
      control = `<div class="choices ${question.type === 'multi' ? 'multi' : ''}" role="${question.type === 'single' ? 'radiogroup' : 'group'}">
        ${question.options.map(([optionValue, label]) => {
          const isSelected = question.type === 'single' ? value === optionValue : selected.includes(optionValue);
          return `<button class="choice${isSelected ? ' selected' : ''}" type="button" data-value="${escapeHtml(optionValue)}" aria-pressed="${isSelected}">
            <span class="choice-mark" aria-hidden="true">${isSelected ? '✓' : ''}</span>
            <span class="choice-text">${escapeHtml(label)}</span>
          </button>`;
        }).join('')}
      </div>
      ${question.other ? `<div class="other-field"><label class="label" for="otherInput">Something else</label><input class="input" id="otherInput" maxlength="100" placeholder="Add another tool" value="${escapeHtml(state.answers[`${question.id}_other`] || '')}" /></div>` : ''}`;
    } else {
      const tag = question.type === 'long' ? 'textarea' : 'input';
      const attributes = question.type === 'long'
        ? `class="textarea" rows="5"`
        : `class="input" type="text"`;
      control = `<${tag} ${attributes} id="answerInput" maxlength="${question.maxLength || 500}" placeholder="${escapeHtml(question.placeholder || '')}">${tag === 'textarea' ? escapeHtml(value || '') : ''}</${tag}>`;
      if (tag === 'input') {
        control = `<input class="input" type="text" id="answerInput" maxlength="${question.maxLength || 500}" placeholder="${escapeHtml(question.placeholder || '')}" value="${escapeHtml(value || '')}" />`;
      }
      control += `<div class="char-count"><span id="charCount">${String(value || '').length}</span> / ${question.maxLength || 500}</div>`;
    }

    return `
      <section class="step">
        <span class="question-index">Question ${number} of ${data.questions.length}</span>
        <h2>${escapeHtml(question.title)}</h2>
        ${question.help ? `<p class="question-help">${escapeHtml(question.help)}</p>` : ''}
        ${control}
        <p id="questionError" class="field-error" role="alert"></p>
      </section>`;
  }

  function attachQuestionEvents(question) {
    if (question.type === 'single' || question.type === 'multi') {
      document.querySelectorAll('.choice').forEach((button) => {
        button.addEventListener('click', () => {
          const option = button.dataset.value;
          if (question.type === 'single') {
            state.answers[question.id] = option;
          } else {
            let values = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];
            if (option === 'nothing') {
              values = values.includes('nothing') ? [] : ['nothing'];
            } else {
              values = values.filter((item) => item !== 'nothing');
              values = values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
            }
            state.answers[question.id] = values;
          }
          persist();
          render();
        });
      });
      const other = document.querySelector('#otherInput');
      if (other) {
        other.addEventListener('input', () => {
          state.answers[`${question.id}_other`] = other.value;
          persist();
        });
      }
    } else {
      const input = document.querySelector('#answerInput');
      input.addEventListener('input', () => {
        state.answers[question.id] = input.value;
        const count = document.querySelector('#charCount');
        if (count) count.textContent = input.value.length;
        document.querySelector('#questionError').textContent = '';
        persist();
        updateContinueState();
      });
      setTimeout(() => input.focus(), 0);
    }
  }

  function contactFieldError(id, message) {
    const node = document.querySelector(`[data-error-for="${id}"]`);
    if (node) node.textContent = message || '';
  }

  function renderContact() {
    return `
      <section class="step">
        <span class="eyebrow">Your answers are complete</span>
        <h1>Send your assessment for review.</h1>
        <p class="subtitle">Add the same name and WhatsApp number you used for the webinar. Our team will review the operating context before preparing your seven-day plan.</p>
        <form id="contactForm" class="contact-card" novalidate>
          <div class="form-grid">
            <div class="field full">
              <label class="label" for="fullName">Name used for the webinar</label>
              <input class="input" id="fullName" name="fullName" autocomplete="name" maxlength="100" value="${escapeHtml(state.contact.name || '')}" placeholder="Your full name" />
              <p class="field-error" data-error-for="name"></p>
            </div>
            <div class="field full">
              <label class="label" for="phone">WhatsApp number used to sign up</label>
              <div class="phone-row">
                <input class="input country-code" id="countryCode" name="countryCode" type="tel" inputmode="tel" autocomplete="tel-country-code" maxlength="5" aria-label="Country calling code" value="${escapeHtml(state.contact.countryCode || '+91')}" placeholder="+91" />
                <input class="input" id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel-national" maxlength="18" value="${escapeHtml(state.contact.phone || '')}" placeholder="98765 43210" />
              </div>
              <p class="help">Use your international calling code, for example +91, +1, +44, or +971.</p>
              <p class="field-error" data-error-for="phone"></p>
            </div>
            <div class="field full honeypot" aria-hidden="true">
              <label for="companyWebsite">Company website</label>
              <input id="companyWebsite" name="companyWebsite" tabindex="-1" autocomplete="off" />
            </div>
            <div class="field full">
              <label class="consent">
                <input id="consent" name="consent" type="checkbox"${state.contact.consent ? ' checked' : ''} />
                <span>I agree to receive my reviewed seven-day plan and sprint updates on WhatsApp. I can opt out at any time.</span>
              </label>
              <p class="field-error" data-error-for="consent"></p>
            </div>
            <div class="field full privacy-note">
              <span aria-hidden="true">🔒</span>
              <span>Your answers are used for this review and are not displayed publicly.</span>
            </div>
            <div class="field full">
              <button id="submitButton" class="btn btn--primary" type="submit">Submit for review →</button>
              <div id="submitStatus" class="submit-status" role="status" aria-live="polite"></div>
              <div id="submitError" class="error-summary" hidden></div>
            </div>
          </div>
        </form>
      </section>`;
  }

  function attachContactEvents() {
    const form = document.querySelector('#contactForm');
    const fields = ['fullName', 'phone', 'countryCode', 'consent'];
    fields.forEach((id) => {
      document.querySelector(`#${id}`).addEventListener('change', saveContactDraft);
      document.querySelector(`#${id}`).addEventListener('input', saveContactDraft);
    });
    form.addEventListener('submit', submitApplication);
  }

  function saveContactDraft() {
    state.contact = {
      name: document.querySelector('#fullName').value,
      phone: document.querySelector('#phone').value,
      countryCode: document.querySelector('#countryCode').value,
      consent: document.querySelector('#consent').checked
    };
    persist();
  }

  function validateContact() {
    saveContactDraft();
    const errors = {};
    if (state.contact.name.trim().length < 2) errors.name = 'Enter the name you used for the webinar.';
    const normalizedPhone = engine.normalizePhone(state.contact.countryCode, state.contact.phone);
    if (!normalizedPhone) errors.phone = 'Enter a valid WhatsApp number with country code.';
    if (!state.contact.consent) errors.consent = 'Consent is required so we can send the reviewed plan on WhatsApp.';
    ['name', 'phone', 'consent'].forEach((id) => contactFieldError(id, errors[id]));
    return { errors, normalizedPhone };
  }

  async function submitApplication(event) {
    event.preventDefault();
    const answerErrors = engine.validateAnswers(state.answers, data.questions);
    if (Object.keys(answerErrors).length) {
      const firstId = Object.keys(answerErrors)[0];
      const firstIndex = steps.findIndex((step) => step.id === firstId);
      toast('One assessment answer needs attention.');
      goTo(firstIndex);
      return;
    }

    const { errors, normalizedPhone } = validateContact();
    if (Object.keys(errors).length) return;

    const submitButton = document.querySelector('#submitButton');
    const status = document.querySelector('#submitStatus');
    const errorBox = document.querySelector('#submitError');
    const honeypot = document.querySelector('#companyWebsite').value;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
    status.textContent = 'Saving your assessment for review.';
    errorBox.hidden = true;

    const assessment = engine.scoreAssessment(state.answers);
    const learningPriorities = engine.rankLearningPriorities(state.answers);
    const payload = {
      webinarId: config.webinarId,
      name: state.contact.name.trim(),
      phone: normalizedPhone,
      consent: true,
      answers: state.answers,
      clientAssessment: assessment,
      clientLearningPriorities: learningPriorities,
      startedAt: new Date(state.startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      elapsedSeconds: Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)),
      website: honeypot
    };

    try {
      let responseData = null;
      if (config.allowLocalDemo && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        responseData = { id: `local-${Date.now()}`, assessment, learningPriorities, demo: true };
      } else if (config.submissionEndpoint) {
        const response = await fetch(config.submissionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        responseData = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(responseData.error || 'Your assessment could not be submitted.');
      } else {
        throw new Error('Submissions are not configured yet. Please tell the host.');
      }

      state.submitted = true;
      state.submissionId = responseData.id;
      state.assessment = responseData.assessment || assessment;
      state.learningPriorities = responseData.learningPriorities || learningPriorities;
      state.maxReached = steps.length - 1;
      state.pos = steps.length - 1;
      persist();
      localStorage.setItem(RECEIPT_KEY, JSON.stringify({
        id: state.submissionId,
        webinarId: config.webinarId,
        submittedAt: new Date().toISOString()
      }));
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      submitButton.disabled = false;
      submitButton.textContent = 'Try again →';
      status.textContent = '';
      errorBox.textContent = error.message || 'Something went wrong. Your answers are still saved on this device.';
      errorBox.hidden = false;
    }
  }

  function renderResult() {
    const assessment = state.assessment || engine.scoreAssessment(state.answers);
    const learningPriorities = state.learningPriorities || engine.rankLearningPriorities(state.answers);
    const participant = assessment.stats;
    const scores = [
      ['Shipping experience', participant.shippingExperience],
      ['Builder confidence', participant.builderConfidence],
      ['Goal clarity', participant.goalClarity],
      ['User clarity', participant.userClarity],
      ['Process clarity', participant.processClarity],
      ['System clarity', participant.systemClarity],
      ['Sprint availability', participant.sprintAvailability]
    ];
    const firstName = escapeHtml((state.contact.name || '').trim().split(/\s+/)[0]);

    return `
      <section class="step result-step">
        <div class="result-head">
          <div>
            <span class="result-badge">${escapeHtml(assessment.readinessState)}</span>
            <h1>${firstName ? `${firstName}, your assessment is with our team.` : 'Your assessment is with our team.'}</h1>
            <p class="subtitle">These scores describe the detail in your current answers. They help us decide what to clarify before shaping a seven-day plan around your work.</p>
          </div>
          <button id="printButton" class="btn btn--secondary" type="button">Print / save PDF</button>
        </div>
        <div class="score-grid">
          ${scores.map(([label, score]) => `<div class="score-card"><strong>${score}/5</strong><span>${escapeHtml(label)}</span><div class="score-bar"><i style="width:${score * 20}%"></i></div></div>`).join('')}
        </div>
        <span class="eyebrow">Learning priorities</span>
        <h2>Topics worth understanding for your next build.</h2>
        <div class="roadmap">
          ${learningPriorities.map((item, index) => `<article class="day-card"><div class="day-num">0${index + 1}</div><div><h3>${escapeHtml(item.label)}</h3><p>${escapeHtml(item.description)}</p></div></article>`).join('')}
        </div>
        <div class="next-box">
          <h3>What happens next</h3>
          <p>We will review your goals, users, processes, systems, and builder baseline. Your seven-day plan will be sent on WhatsApp after that review.</p>
        </div>
      </section>`;
  }

  function updateContinueState() {
    const step = steps[state.pos];
    if (data.questions.includes(step)) continueButton.disabled = !valueIsComplete(step);
    else continueButton.disabled = false;
  }

  function renderFooter() {
    const step = steps[state.pos];
    const hidden = step.type === 'contact' || step.type === 'result';
    footer.style.display = hidden ? 'none' : 'flex';
    if (hidden) return;

    backButton.style.visibility = state.pos === 0 ? 'hidden' : 'visible';
    backButton.onclick = () => goTo(state.pos - 1);
    continueButton.textContent = state.pos === steps.length - 3 ? 'Add contact details →' : 'Continue →';
    continueButton.onclick = () => {
      if (data.questions.includes(step) && !valueIsComplete(step)) {
        const error = document.querySelector('#questionError');
        error.textContent = step.minLength
          ? `Add a little more detail (at least ${step.minLength} characters).`
          : 'Answer this question to continue.';
        return;
      }
      unlockNext();
    };
    updateContinueState();

    const moduleStepIndexes = steps
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.module === step.module);
    document.querySelector('#stepDots').innerHTML = moduleStepIndexes
      .map(({ index }) => `<span class="step-dot${index < state.pos ? ' done' : ''}${index === state.pos ? ' current' : ''}"></span>`)
      .join('');
  }

  function render() {
    const step = steps[state.pos];
    renderNavigation();
    renderProgress();

    if (step.type === 'intro') stage.innerHTML = renderIntro(step);
    else if (step.type === 'concept') stage.innerHTML = renderConcept(step);
    else if (step.type === 'opt') stage.innerHTML = renderOpt(step);
    else if (step.type === 'contact') stage.innerHTML = renderContact();
    else if (step.type === 'result') stage.innerHTML = renderResult();
    else stage.innerHTML = renderQuestion(step);

    if (data.questions.includes(step)) attachQuestionEvents(step);
    if (step.type === 'contact') attachContactEvents();
    if (step.type === 'result') document.querySelector('#printButton').addEventListener('click', () => window.print());
    renderFooter();
  }

  document.querySelector('#homeLink').addEventListener('click', () => goTo(0));
  menuButton.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    scrim.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeSidebar);
  document.querySelector('#resetBtn').addEventListener('click', () => {
    if (!window.confirm('Clear your answers and restart the assessment?')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(RECEIPT_KEY);
    window.location.reload();
  });

  render();
})();
