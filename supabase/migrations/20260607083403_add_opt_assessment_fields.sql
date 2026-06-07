alter table public.webinar_applications
  alter column roadmap drop not null,
  alter column profile_fit drop not null,
  alter column identity_signal drop not null,
  alter column intent_score drop not null,
  alter column personalization_clarity drop not null,
  alter column total_score drop not null;

alter table public.webinar_applications
  add column if not exists assessment_version text,
  add column if not exists assessment_stats jsonb,
  add column if not exists learning_priorities jsonb;

alter table public.webinar_applications
  add constraint webinar_applications_learning_priorities_array
  check (learning_priorities is null or jsonb_typeof(learning_priorities) = 'array');
