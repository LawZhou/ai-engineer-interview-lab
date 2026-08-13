# Forge — AI Interview Lab

Forge is a serious study app for AI Engineer, LLM Engineer, ML Engineer, Applied AI, and ML Platform interviews.

## Live website

**https://lawzhou.github.io/ai-engineer-interview-lab/**

It contains:

- **202 primary interview questions** grounded in the supplied study plan, including 40 focused AI, ML, data engineering and data science rapid-fire drills
- **Three follow-up questions per primary question**
- Interview-ready answer frames, key signals, common traps, and mastery ratings
- Timed mock answers and saved weak-point notes
- ML and LLM system-design frameworks
- A 10-week roadmap and readiness gate
- Copyable coaching prompts that work with any AI—no API key required

Progress and notes stay in the browser on each device. Forge has no account, login, cloud database, API key, or OpenAI hosting configuration.

## One-click launch on Mac

Double-click:

**`Launch Forge.command`**

On the first launch, Forge installs its local dependencies if needed. It then opens automatically in the default browser. Keep the Terminal window open while studying; closing it stops the local site.

If macOS asks how to open the launcher, right-click it once and choose **Open**.

## Terminal launch

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Study method

Every primary question follows the same serious interview frame:

1. Define it clearly.
2. Give a concrete example.
3. Explain a tradeoff.
4. Name a failure mode.
5. Connect it to production.
6. Defend the answer through the three-question follow-up ladder.

The goal is not to finish every card. Start applying when the ten readiness-gate answers are consistently green.
