import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const productionOrigin = 'https://ai-pm-roadmap-delta.vercel.app';
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || productionOrigin;

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const selfDoubtTerms = [
  'not technical', 'not cut out', 'not built', 'not smart', 'i cannot', "i can't",
  'imposter', 'gave up', 'quit', 'stupid', 'bad at', 'not capable', 'failed'
];

const actionTerms = [
  'built', 'tried', 'course', 'tutorial', 'prototype', 'automation', 'project',
  'spent', 'paid', 'hours', 'week', 'youtube', 'learned'
];

const requiredAnswerIds = [
  'role', 'path', 'employment', 'shipping', 'builder_identity',
  'break_response', 'attempts', 'prior_effort', 'workflow', 'tools',
  'desired_build', 'focus_time', 'commitment', 'why_now', 'seat_case'
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

function cleanText(value: unknown, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

function includesAny(value: unknown, terms: string[]) {
  const normalized = cleanText(value).toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function list(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => cleanText(item, 100)).filter(Boolean) : [];
}

function validPhone(value: unknown) {
  const phone = cleanText(value, 20);
  return /^\+[1-9]\d{9,14}$/.test(phone) ? phone : null;
}

function validIsoDate(value: unknown) {
  const candidate = cleanText(value, 40);
  if (!candidate) return null;
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function hasRequiredAnswers(answers: Record<string, unknown>) {
  return requiredAnswerIds.every((id) => {
    const value = answers[id];
    return Array.isArray(value) ? value.length > 0 : cleanText(value).length > 0;
  });
}

function scoreDiagnostic(answers: Record<string, unknown>) {
  let profileFit = 0;
  if (answers.path === 'nontechnical' || answers.path === 'switcher') profileFit += 1;
  if (answers.employment === 'employed' || answers.employment === 'worried') profileFit += 1;
  if (answers.shipping === 'never' || answers.shipping === 'help') profileFit += 1;

  const identityText = [answers.builder_identity, answers.break_response].map((value) => cleanText(value)).join(' ');
  let identitySignal = 0;
  if (includesAny(answers.break_response, selfDoubtTerms)) identitySignal += 2;
  else if (cleanText(answers.break_response).length >= 60) identitySignal += 1;
  if (identityText.length >= 160) identitySignal += 1;
  identitySignal = Math.min(3, identitySignal);

  const attempts = list(answers.attempts);
  let intent = 0;
  if (attempts.some((item) => ['tutorials', 'course', 'paid', 'built'].includes(item))) intent += 1;
  if (includesAny(answers.prior_effort, actionTerms) && cleanText(answers.prior_effort).length >= 50) intent += 1;
  if (answers.commitment === 'yes' && cleanText(answers.why_now).length >= 50 && cleanText(answers.seat_case).length >= 45) intent += 1;

  const personalizationClarity =
    cleanText(answers.workflow).length >= 45 && cleanText(answers.desired_build).length >= 35 ? 1 : 0;

  const reviewFlags: string[] = [];
  if (answers.shipping === 'regular') reviewFlags.push('already-ships-regularly');
  if (answers.commitment === 'unsure') reviewFlags.push('commitment-uncertain');
  if (cleanText(answers.seat_case).length < 45) reviewFlags.push('low-detail-seat-case');
  if (answers.commitment === 'unsure' && cleanText(answers.seat_case).length < 45) reviewFlags.push('manual-review-priority');

  const participantScores = {
    shippingReadiness: answers.shipping === 'regular' ? 5 : answers.shipping === 'few' ? 4 : answers.shipping === 'help' ? 2 : 1,
    builderConfidence: includesAny(identityText, selfDoubtTerms) ? 1 : identityText.length >= 160 ? 3 : 2,
    actionMomentum: Math.min(5, Math.max(1, attempts.filter((item) => item !== 'nothing').length + (includesAny(answers.prior_effort, actionTerms) ? 1 : 0))),
    workflowClarity: personalizationClarity ? 5 : cleanText(answers.workflow).length >= 25 ? 3 : 1,
    sprintReadiness: answers.commitment === 'yes' ? 5 : answers.commitment === 'mostly' ? 3 : 1
  };

  let readinessState = 'Starting Line';
  if (participantScores.shippingReadiness >= 4) readinessState = 'Active Builder';
  else if (participantScores.actionMomentum >= 3 && participantScores.builderConfidence <= 2) readinessState = 'Stalled Experimenter';
  else if (participantScores.actionMomentum >= 3 || participantScores.workflowClarity >= 4) readinessState = 'Emerging Shipper';

  return {
    internal: {
      profileFit,
      identitySignal,
      intent,
      personalizationClarity,
      total: profileFit + identitySignal + intent + personalizationClarity,
      flags: reviewFlags
    },
    participant: participantScores,
    readinessState
  };
}

function toolLabel(answers: Record<string, unknown>) {
  const labels: Record<string, string> = {
    notion: 'Notion', jira: 'Jira or Linear', sheets: 'Sheets',
    slack: 'Slack or Teams', email: 'email', figma: 'Figma',
    analytics: 'your analytics tool', crm: 'your CRM'
  };
  const tools = list(answers.tools).map((tool) => labels[tool]).filter(Boolean);
  const other = cleanText(answers.tools_other, 100);
  if (other) tools.push(other);
  return tools.slice(0, 2).join(' and ') || 'the tools you already use';
}

function generateRoadmap(answers: Record<string, unknown>, diagnostic: ReturnType<typeof scoreDiagnostic>) {
  const workflow = cleanText(answers.workflow, 800) || 'your repetitive workflow';
  const desiredBuild = cleanText(answers.desired_build, 700) || 'a useful working prototype';
  const tools = toolLabel(answers);
  const focusSlots: Record<string, string> = {
    morning: 'early-morning hour', lunch: 'lunch-hour block', evening: 'evening block',
    late: 'late-night block', weekend: 'weekend focus block'
  };
  const focusSlot = focusSlots[cleanText(answers.focus_time)] || 'focused hour';
  const supportNote = diagnostic.participant.builderConfidence <= 2
    ? 'Write down every break as a system observation, not a verdict on your ability.'
    : 'Record the decisions you make so the build becomes repeatable.';

  return [
    { day: 1, title: 'Map the job, not the feature', detail: `Turn "${workflow}" into a simple before-and-after workflow. Define one measurable sign that it improved.` },
    { day: 2, title: 'Make the inputs real', detail: `Collect three representative examples from ${tools}. Mark the minimum input your v1 needs and the exact output it should create.` },
    { day: 3, title: 'Build the narrow happy path', detail: `Create the smallest version that produces "${desiredBuild}" for one clean example. Ignore integrations and polish.` },
    { day: 4, title: 'Connect your actual workflow', detail: `Move one real input through the prototype using ${tools}. Keep manual copy-paste steps if they help you finish.` },
    { day: 5, title: 'Design for the break', detail: `Test missing, messy, and ambiguous inputs. Add one recovery path. ${supportNote}` },
    { day: 6, title: 'Run it on real work', detail: 'Use the build on a task you genuinely need to complete. Measure time saved, corrections needed, and where trust drops.' },
    { day: 7, title: 'Package the proof', detail: `Use your ${focusSlot} to prepare a three-minute demo: the old workflow, the working build, the evidence, and the next improvement.` }
  ];
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== allowedOrigin) {
    return json({ error: 'Origin not allowed.' }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 50_000) return json({ error: 'Submission is too large.' }, 413);
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  if (cleanText(payload.website)) return json({ error: 'Submission rejected.' }, 400);
  const elapsedSeconds = Number(payload.elapsedSeconds);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 20) {
    return json({ error: 'Please take enough time to complete the diagnostic.' }, 400);
  }

  const webinarId = cleanText(payload.webinarId, 120);
  const name = cleanText(payload.name, 100);
  const phone = validPhone(payload.phone);
  const consent = payload.consent === true;
  const answers = payload.answers && typeof payload.answers === 'object'
    ? payload.answers as Record<string, unknown>
    : {};

  if (!webinarId || name.length < 2 || !phone || !consent || !hasRequiredAnswers(answers)) {
    return json({ error: 'Required application fields are missing or invalid.' }, 400);
  }

  const diagnostic = scoreDiagnostic(answers);
  const roadmap = generateRoadmap(answers, diagnostic);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Submission service is not configured.' }, 503);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const row = {
    webinar_id: webinarId,
    name,
    phone_e164: phone,
    whatsapp_consent: consent,
    answers,
    readiness_state: diagnostic.readinessState,
    participant_scores: diagnostic.participant,
    profile_fit: diagnostic.internal.profileFit,
    identity_signal: diagnostic.internal.identitySignal,
    intent_score: diagnostic.internal.intent,
    personalization_clarity: diagnostic.internal.personalizationClarity,
    total_score: diagnostic.internal.total,
    review_flags: diagnostic.internal.flags,
    roadmap,
    elapsed_seconds: elapsedSeconds,
    started_at: validIsoDate(payload.startedAt),
    submitted_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('webinar_applications')
    .upsert(row, { onConflict: 'webinar_id,phone_e164' })
    .select('id')
    .single();

  if (error) {
    console.error('application insert failed', error);
    return json({ error: 'Your application could not be saved. Please retry.' }, 500);
  }

  return json({ id: data.id, diagnostic, roadmap });
});
