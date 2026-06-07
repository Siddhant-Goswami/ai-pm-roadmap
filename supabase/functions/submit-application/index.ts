import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const productionOrigin = 'https://ai-pm-roadmap-delta.vercel.app';
const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || productionOrigin;
const assessmentVersion = 'opt-v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const requiredAnswerIds = [
  'role', 'shipping', 'break_response', 'success_metrics',
  'users_customers', 'core_processes', 'systems_data', 'commitment'
];

const selfDoubtTerms = [
  'not technical', 'not cut out', 'not built', 'not smart', 'i cannot', "i can't",
  'imposter', 'gave up', 'quit', 'stupid', 'bad at', 'not capable', 'failed'
];

const topicRules = [
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
  return requiredAnswerIds.every((id) => cleanText(answers[id]).length > 0);
}

function detailScore(value: unknown, thresholds: [number, number, number]) {
  const length = cleanText(value).length;
  if (length >= thresholds[2]) return 5;
  if (length >= thresholds[1]) return 4;
  if (length >= thresholds[0]) return 3;
  return length ? 2 : 1;
}

function scoreAssessment(answers: Record<string, unknown>) {
  const breakResponse = cleanText(answers.break_response);
  const stats = {
    shippingExperience: answers.shipping === 'regular' ? 5 : answers.shipping === 'few' ? 4 : answers.shipping === 'help' ? 2 : 1,
    builderConfidence: includesAny(breakResponse, selfDoubtTerms) ? 1 : breakResponse.length >= 100 ? 4 : 3,
    goalClarity: detailScore(answers.success_metrics, [45, 90, 160]),
    userClarity: detailScore(answers.users_customers, [45, 90, 160]),
    processClarity: detailScore(answers.core_processes, [70, 140, 240]),
    systemClarity: detailScore(answers.systems_data, [35, 75, 140]),
    sprintAvailability: answers.commitment === 'yes' ? 5 : answers.commitment === 'mostly' ? 3 : 1
  };

  const flags: string[] = [];
  if (answers.shipping === 'regular') flags.push('already-ships-regularly');
  if (answers.commitment === 'unsure') flags.push('availability-uncertain');
  if (stats.processClarity <= 2) flags.push('process-detail-low');
  if (stats.goalClarity <= 2) flags.push('success-metric-detail-low');

  const values = Object.values(stats);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  let readinessState = 'Foundation';
  if (average >= 4) readinessState = 'Ready to scope';
  else if (average >= 3) readinessState = 'Promising starting point';

  return { stats, readinessState, flags };
}

function rankLearningPriorities(answers: Record<string, unknown>) {
  const context = [
    answers.success_metrics, answers.users_customers,
    answers.core_processes, answers.systems_data
  ].map((value) => cleanText(value)).join(' ').toLowerCase();

  return [
    {
      id: 'ai-system-design', label: 'AI system design',
      description: 'Break an AI product into models, data, tools, state, and human decision points.',
      score: 6
    },
    {
      id: 'evals', label: 'Evals',
      description: 'Define measurable checks for quality before an AI workflow reaches real users.',
      score: 5
    },
    ...topicRules.map((topic) => ({
      ...topic,
      score: topic.terms.reduce((score, term) => score + (context.includes(term) ? 2 : 0), 0)
    }))
  ]
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 3)
    .map(({ id, label, description }) => ({ id, label, description }));
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const requestOrigin = request.headers.get('origin');
  if (requestOrigin && requestOrigin !== allowedOrigin) return json({ error: 'Origin not allowed.' }, 403);

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
    return json({ error: 'Please take enough time to complete the assessment.' }, 400);
  }

  const webinarId = cleanText(payload.webinarId, 120);
  const name = cleanText(payload.name, 100);
  const phone = validPhone(payload.phone);
  const consent = payload.consent === true;
  const answers = payload.answers && typeof payload.answers === 'object'
    ? payload.answers as Record<string, unknown>
    : {};

  if (!webinarId || name.length < 2 || !phone || !consent || !hasRequiredAnswers(answers)) {
    return json({ error: 'Required assessment fields are missing or invalid.' }, 400);
  }

  const assessment = scoreAssessment(answers);
  const learningPriorities = rankLearningPriorities(answers);
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
    readiness_state: assessment.readinessState,
    participant_scores: assessment.stats,
    assessment_version: assessmentVersion,
    assessment_stats: assessment.stats,
    learning_priorities: learningPriorities,
    profile_fit: null,
    identity_signal: null,
    intent_score: null,
    personalization_clarity: null,
    total_score: null,
    review_flags: assessment.flags,
    roadmap: null,
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
    console.error('assessment insert failed', error);
    return json({ error: 'Your assessment could not be saved. Please retry.' }, 500);
  }

  return json({ id: data.id, assessment, learningPriorities });
});
