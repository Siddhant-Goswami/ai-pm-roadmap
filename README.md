# The Applied AI Roadmap for PMs

A framework-free webinar assessment based on the OPT framework: operating
model, process, and task. Participants answer eight focused questions, provide
their WhatsApp details at the end, and receive an assessment summary with
learning priorities. The team reviews the submitted context before sending a
personalized seven-day plan.

## Run locally

```bash
npm run serve
npm run check
```

Open `http://localhost:4173`. Content lives in `js/data.js`; assessment scoring,
topic ranking, and phone normalization live in `js/engine.js`.

## Production services

- Vercel: `https://ai-pm-roadmap-delta.vercel.app`
- Supabase project: `bapgzlmgeudrcqikbttf`
- Edge Function: `submit-application`

The Edge Function validates the eight-answer contract, recomputes all stats and
learning priorities, and upserts by `webinar_id + phone_e164`. The browser never
receives a service-role key.

## Review

Use `public.webinar_applications` in the Supabase dashboard. Relevant fields:

- `answers`: role, builder baseline, OPT context, and availability.
- `assessment_stats`: seven participant-facing dimensions.
- `learning_priorities`: three ranked applied AI topics.
- `review_flags`: conditions that need closer human review.
- `assessment_version`: scoring contract version.

RLS is enabled with no public table policies. Participant writes happen only
through the Edge Function.
