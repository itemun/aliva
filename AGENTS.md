# Aliva: continuity instructions

Read `DECISIONS.md` before changes. User instructions take precedence.

## Current project

- Repository root is this directory. Shipped page: `index.html`.
- Edit `src/` and `concepts/function/`, then run `npm run build`. Do not hand-edit generated HTML.
- The build creates ignored local files `aliva-landing.html` and `aliva-concept-function.html`; the latter preserves the existing local preview URL. Only `index.html` and `favicon.svg` are committed build outputs.
- Run `npm test` after changes to rules, PDF or application logic. Medical implementation is not independent clinical validation.
- Preserve the approved cream/terracotta design, sprout logo, compact steps, typography, rounded controls and keyboard focus. For UI changes check desktop and narrow/mobile states; do not hide overflow to conceal inaccessible content.

## Medical content and privacy

- Read `RULES.md` before clinical changes. Record exact source/version, applicability, exclusions, missing data and rationale; add meaningful boundary tests.
- Do not invent diagnoses, results, dates, menopause status, risk scores or missing answers.
- Do not store or transmit medical answers, put them in URLs, analytics, logs or browser storage, or send them to an LLM. Use synthetic profiles for checks.
- Preserve the short initial questionnaire. Do not add fields without user direction. The optional three-question refinement belongs after the result; cancellation must not apply its draft.
- Maintain local/offline PDF generation with embedded assets. Do not introduce remote runtime dependencies.
- Preserve existing user decisions, including removal of feedback and of the separate first-page discussion-priority block. Those topics remain in the doctor-visit details. The reference section is named «Глоссарий».

## Archives and repository hygiene

- At the user's request, old screenshots, abandoned concepts and frozen snapshots were removed from the current Git tree on 23.11.2026.
- Their byte-identical local archive is at `../aliva-local-archive/2026-11-23-repository-cleanup/` (relative to this repository). The latest approved historical visual baseline inside it is `snapshots/2026-11-23-approved-typography/`; prior snapshots remain too. Do not modify archived snapshots.
- Do not re-add screenshots, archives, obsolete concepts, secrets or generated intermediate HTML to Git.
- Required image/font/PDF-library assets and their licenses remain versioned. Source texts in `research/` support the medical audit trail.
- GitHub repo and progress board are linked from `PROJECT.md`. Code hosting does not imply public deployment of the site.
