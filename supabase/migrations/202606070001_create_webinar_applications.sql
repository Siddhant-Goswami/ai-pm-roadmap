create extension if not exists pgcrypto;

create table if not exists public.webinar_applications (
  id uuid primary key default gen_random_uuid(),
  webinar_id text not null,
  name text not null,
  phone_e164 text not null,
  whatsapp_consent boolean not null default false,
  answers jsonb not null,
  readiness_state text not null,
  participant_scores jsonb not null,
  profile_fit smallint not null check (profile_fit between 0 and 3),
  identity_signal smallint not null check (identity_signal between 0 and 3),
  intent_score smallint not null check (intent_score between 0 and 3),
  personalization_clarity smallint not null check (personalization_clarity between 0 and 1),
  total_score smallint not null check (total_score between 0 and 10),
  review_flags text[] not null default '{}',
  roadmap jsonb not null,
  elapsed_seconds integer,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (webinar_id, phone_e164)
);

create index if not exists webinar_applications_score_idx
  on public.webinar_applications (webinar_id, total_score desc, submitted_at asc);

create index if not exists webinar_applications_flags_idx
  on public.webinar_applications using gin (review_flags);

alter table public.webinar_applications enable row level security;

-- No public policies are intentional. The Edge Function writes with the service
-- role, while review and CSV export happen through the authenticated dashboard.

