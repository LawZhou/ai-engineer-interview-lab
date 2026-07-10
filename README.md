# Forge — AI Interview Lab

A focused study app for AI Engineer, LLM Engineer, ML Engineer, Applied AI, and ML Platform interviews.

Forge turns a 10-week interview plan into four practice loops:

- **Today:** one concrete daily mission, active-recall prompt, and 25-minute focus timer
- **Concepts:** interview-ready explanations, common traps, follow-up pressure, and self-rated mastery
- **Interview lab:** timed 90-second answers, saved weak-point notes, and a five-part answer rubric
- **Roadmap:** a 10-week curriculum, weekly cadence, and a 10-question readiness gate

Progress and notes are stored in the browser on the learner's device. No account or backend is required.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal.

## Quality checks

```bash
npm run build
npx eslint app/page.tsx app/study-data.ts app/layout.tsx
```

## Study method

Every concept follows the same serious interview frame:

1. Define it clearly.
2. Give a concrete example.
3. Explain a tradeoff.
4. Name a failure mode.
5. Connect it to production.

The goal is not to finish every card. Start applying when the ten readiness-gate answers are consistently green.
