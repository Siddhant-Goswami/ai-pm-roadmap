# The Applied AI Roadmap for PMs

A framework-free webinar companion and diagnostic. Participants move through a
short teaching flow, answer 15 questions, and provide their name and WhatsApp
number only after completing the diagnostic. The app then shows a deterministic,
personalized seven-day build roadmap.

## Run locally

```bash
npm run serve
```

Open `http://localhost:4173`. Localhost uses a demo submission path when no
Supabase endpoint is configured, so the full journey can be tested without
writing participant data anywhere.

Run checks with:

```bash
npm run check
```

## Configure the webinar

Edit `js/config.js`:

- `webinarId`: stable identifier used for deduplication and filtering.
- `seatCap`, `applicationsClose`, and `sprintStarts`: event configuration.
- `submissionEndpoint`: deployed Supabase Edge Function URL.
- `allowLocalDemo`: keep `true` for local testing. Demo mode never activates on
  a deployed hostname.

Content and questions live in `js/data.js`. Scoring and roadmap generation live
in `js/engine.js`.

## Configure Supabase

1. Create or link a Supabase project.
2. Apply `supabase/migrations/202606070001_create_webinar_applications.sql`.
3. Deploy the public Edge Function:

   ```bash
   supabase functions deploy submit-application --no-verify-jwt
   ```

4. Set `ALLOWED_ORIGIN` to the production app origin. Supabase provides
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions.
5. Put the deployed function URL in `js/config.js`, for example:

   ```js
   submissionEndpoint: 'https://PROJECT_REF.supabase.co/functions/v1/submit-application'
   ```

The browser never receives the service-role key. The Edge Function validates
the payload, recomputes all scores and the roadmap, then upserts by
`webinar_id + phone_e164`.

## Review and export

Use the Supabase table editor for review. Useful columns are:

- `total_score` for initial ordering.
- `profile_fit`, `identity_signal`, `intent_score`, and
  `personalization_clarity` for the rubric.
- `review_flags` for manual-review conditions.
- `answers` and `roadmap` for personalization.

The table editor can export the filtered rows as CSV. Row-level security is
enabled with no public read policy.

## Project structure

```text
index.html                 App shell
css/                       100x design tokens and responsive UI
js/data.js                 Teaching screens and questions
js/engine.js               Scoring, validation, phone, and roadmap rules
js/app.js                  Player, persistence, form, and submission flow
supabase/functions/        Secure application endpoint
supabase/migrations/       Application table and indexes
test/                      Node regression tests
```
