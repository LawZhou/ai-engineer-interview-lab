"use client";

import { useEffect, useMemo, useState } from "react";
import {
  cadence,
  cards,
  projectStories,
  readinessGate,
  systemDesignFrames,
  weeks,
} from "./study-data";

type View = "Today" | "Concepts" | "Interview lab" | "Roadmap";
type Mastery = 0 | 1 | 2;
type StudyState = {
  mastery: Record<string, Mastery>;
  completedWeeks: number[];
  gate: boolean[];
  attempts: number;
  minutes: number;
  notes: Record<string, string>;
};

const EMPTY_STATE: StudyState = {
  mastery: {},
  completedWeeks: [],
  gate: readinessGate.map(() => false),
  attempts: 0,
  minutes: 0,
  notes: {},
};

const masteryLabel: Record<Mastery, string> = {
  0: "Needs repair",
  1: "Can explain",
  2: "Interview ready",
};

const followUpByCategory: Record<string, [string, string]> = {
  Positioning: [
    "What did you personally own, and what evidence shows the result?",
    "What would you do differently if you faced the same situation now?",
  ],
  "Python + SQL": [
    "What are the time and space complexity, and which assumption makes them valid?",
    "Which edge case would break a naive implementation?",
  ],
  "ML fundamentals": [
    "How would you validate this choice and monitor it in production?",
    "How would your answer change under severe class imbalance or data drift?",
  ],
  "LLM core": [
    "What is the most important production failure mode here?",
    "How would you test this behavior rather than rely on a good demo?",
  ],
  RAG: [
    "How would you determine whether retrieval or generation caused a bad answer?",
    "What changes when the documents are private and frequently updated?",
  ],
  Evaluation: [
    "How would you build a representative evaluation set and slice the results?",
    "Which regression would block release or trigger rollback?",
  ],
  "Cloud + MLOps": [
    "How does the design change under burst traffic and a strict latency target?",
    "What happens during a partial outage, and how do you recover safely?",
  ],
  "System design": [
    "What becomes the first bottleneck at ten times the traffic?",
    "What would you deliberately leave out of version one, and why?",
  ],
  "Advanced LLM": [
    "Which hardware or memory constraint most affects this decision?",
    "How would you benchmark quality, latency, throughput and cost together?",
  ],
};

function getFollowUps(card: (typeof cards)[number]) {
  const contextual = followUpByCategory[card.category] ?? [
    "What tradeoff would make you choose a different approach?",
    "How would you validate and monitor this in production?",
  ];
  return [card.followUp, ...contextual];
}

function buildAiCoachPrompt(card: (typeof cards)[number], learnerNote?: string) {
  const followUps = getFollowUps(card);
  return `Act as a rigorous AI/ML engineering interview coach.

Interview question:
${card.question}

${learnerNote?.trim() ? `My draft answer or weak-point notes:\n${learnerNote.trim()}\n\n` : ""}Reference answer frame:
${card.answer}

Important signals:
${card.signals.map((signal) => `- ${signal}`).join("\n")}

Common trap:
${card.trap}

Follow-up ladder:
${followUps.map((question, index) => `${index + 1}. ${question}`).join("\n")}

Please:
1. Rate the answer Red, Yellow, or Green. Green requires a clear definition, concrete example, tradeoff, failure mode, and production concern.
2. Identify anything missing, vague, or technically incorrect.
3. Give me a stronger 60–90 second answer in natural spoken language.
4. Ask the follow-up questions one at a time, waiting for my response before continuing.

Do not invent personal experience for me. Use [ADD YOUR EXAMPLE] where my own project evidence is needed.`;
}

async function copyForAi(card: (typeof cards)[number], learnerNote?: string) {
  const prompt = buildAiCoachPrompt(card, learnerNote);
  try {
    await navigator.clipboard.writeText(prompt);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = prompt;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export default function Home() {
  const [view, setView] = useState<View>("Today");
  const [state, setState] = useState<StudyState>(EMPTY_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [todayIndex, setTodayIndex] = useState(0);

  useEffect(() => {
    const loadState = window.setTimeout(() => {
      const saved = window.localStorage.getItem("forge-study-state");
      if (saved) {
        try {
          setState({ ...EMPTY_STATE, ...JSON.parse(saved) });
        } catch {
          setState(EMPTY_STATE);
        }
      }
      setTodayIndex((new Date().getDay() + 6) % 7);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(loadState);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("forge-study-state", JSON.stringify(state));
  }, [state, hydrated]);

  const readyCards = Object.values(state.mastery).filter((score) => score === 2).length;
  const readiness = Math.round(
    ((readyCards / cards.length) * 0.55 +
      (state.completedWeeks.length / weeks.length) * 0.2 +
      (state.gate.filter(Boolean).length / readinessGate.length) * 0.25) *
      100,
  );

  const updateMastery = (id: string, score: Mastery) => {
    setState((current) => ({ ...current, mastery: { ...current.mastery, [id]: score } }));
  };

  const toggleWeek = (week: number) => {
    setState((current) => ({
      ...current,
      completedWeeks: current.completedWeeks.includes(week)
        ? current.completedWeeks.filter((item) => item !== week)
        : [...current.completedWeeks, week],
    }));
  };

  const updateNote = (id: string, note: string) => {
    setState((current) => ({ ...current, notes: { ...current.notes, [id]: note } }));
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("Today")} aria-label="Go to today">
          <span className="brand-mark">F</span>
          <span><strong>FORGE</strong><small>AI INTERVIEW LAB</small></span>
        </button>
        <nav aria-label="Primary navigation">
          {(["Today", "Concepts", "Interview lab", "Roadmap"] as View[]).map((item) => (
            <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>
              {item}
            </button>
          ))}
        </nav>
        <div className="readiness-chip" aria-label={`${readiness} percent interview ready`}>
          <span>{readiness}%</span>
          <small>READINESS</small>
        </div>
      </header>

      <main>
        {view === "Today" && (
          <TodayView
            state={state}
            todayIndex={todayIndex}
            readiness={readiness}
            setView={setView}
            updateMastery={updateMastery}
            setState={setState}
          />
        )}
        {view === "Concepts" && <ConceptsView mastery={state.mastery} updateMastery={updateMastery} />}
        {view === "Interview lab" && (
          <InterviewLab
            notes={state.notes}
            mastery={state.mastery}
            updateNote={updateNote}
            updateMastery={updateMastery}
            recordAttempt={() => setState((current) => ({ ...current, attempts: current.attempts + 1 }))}
          />
        )}
        {view === "Roadmap" && (
          <RoadmapView state={state} toggleWeek={toggleWeek} setState={setState} />
        )}
      </main>

      <footer>
        <span>FORGE / BUILT FOR PRACTICE, NOT BROWSING</span>
        <span>Your progress stays on this device.</span>
      </footer>
    </div>
  );
}

function TodayView({
  state,
  todayIndex,
  readiness,
  setView,
  updateMastery,
  setState,
}: {
  state: StudyState;
  todayIndex: number;
  readiness: number;
  setView: (view: View) => void;
  updateMastery: (id: string, score: Mastery) => void;
  setState: React.Dispatch<React.SetStateAction<StudyState>>;
}) {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const focusCard = cards[(todayIndex * 3 + state.attempts) % cards.length];
  const currentWeek = weeks.find((week) => !state.completedWeeks.includes(week.week)) ?? weeks[9];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          setState((current) => ({ ...current, minutes: current.minutes + 25 }));
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, setState]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const remainder = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <section className="hero-section">
        <div className="eyebrow">TODAY’S PRACTICE / {cadence[todayIndex][0]}</div>
        <div className="hero-grid">
          <div className="hero-copy">
            <h1>Interview readiness is a <em>performance</em>, not a reading list.</h1>
            <p>
              Learn the concept. Say it under pressure. Connect it to production. Repair what breaks.
            </p>
            <div className="hero-actions">
              <button className="primary" onClick={() => setView("Interview lab")}>Start a mock answer <span>→</span></button>
              <button className="text-button" onClick={() => setView("Roadmap")}>See the 10-week plan</button>
            </div>
          </div>
          <div className="readiness-panel">
            <div className="score-ring" style={{ "--score": `${readiness * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{readiness}</strong><span>/100</span></div>
            </div>
            <div>
              <small>CURRENT SIGNAL</small>
              <h2>{readiness < 35 ? "Build the core" : readiness < 70 ? "Close the gaps" : "Pressure test"}</h2>
              <p>{state.gate.filter(Boolean).length}/10 readiness questions are green.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mission-section">
        <div className="section-heading">
          <div><span>01</span><h2>Today’s mission</h2></div>
          <p>{cadence[todayIndex][1]} · {cadence[todayIndex][2]}</p>
        </div>
        <div className="mission-grid">
          <article className="focus-card accent-card">
            <div className="card-kicker">ACTIVE RECALL · {focusCard.category}</div>
            <h3>{focusCard.question}</h3>
            {!revealed ? (
              <div className="recall-prompt">
                <p>Answer out loud before revealing. Aim for 60–90 seconds.</p>
                <button className="dark-button" onClick={() => setRevealed(true)}>Reveal answer frame</button>
              </div>
            ) : (
              <div className="revealed-answer">
                <p>{focusCard.answer}</p>
                <ul>{focusCard.signals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
                <div className="rating-row">
                  <span>How did it sound?</span>
                  <button onClick={() => updateMastery(focusCard.id, 0)}>Repair</button>
                  <button onClick={() => updateMastery(focusCard.id, 1)}>Clear</button>
                  <button onClick={() => updateMastery(focusCard.id, 2)}>Ready</button>
                </div>
              </div>
            )}
          </article>

          <article className="focus-card timer-card">
            <div className="card-kicker">DEEP WORK TIMER</div>
            <div className="timer-display">{minutes}<span>:</span>{remainder}</div>
            <p>One topic. One spoken answer. One weak point captured.</p>
            <div className="timer-actions">
              <button className="primary" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : "Start focus"}</button>
              <button className="icon-button" aria-label="Reset timer" onClick={() => { setRunning(false); setSeconds(25 * 60); }}>↺</button>
            </div>
            <small>{state.minutes} focused minutes logged</small>
          </article>

          <article className="focus-card week-card">
            <div className="card-kicker">CURRENT BLOCK · WEEK {currentWeek.week}</div>
            <h3>{currentWeek.title}</h3>
            <p>{currentWeek.focus}</p>
            <div className="topic-tags">{currentWeek.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
            <button className="text-button" onClick={() => setView("Roadmap")}>Open this week →</button>
          </article>
        </div>
      </section>

      <section className="proof-section">
        <div className="section-heading light">
          <div><span>02</span><h2>Your proof bank</h2></div>
          <p>Concepts become credible when tied to shipped work.</p>
        </div>
        <div className="story-grid">
          {projectStories.map((story, index) => (
            <article key={story.name}>
              <span>0{index + 1}</span>
              <h3>{story.name}</h3>
              <p>{story.proof}</p>
              <div>{story.structure.map((item) => <small key={item}>{item}</small>)}</div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function ConceptsView({ mastery, updateMastery }: { mastery: Record<string, Mastery>; updateMastery: (id: string, score: Mastery) => void }) {
  const categories = ["All", ...Array.from(new Set(cards.map((card) => card.category)))];
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [priority, setPriority] = useState("Core first");
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const handleCopy = async (card: (typeof cards)[number]) => {
    if (await copyForAi(card)) {
      setCopiedCard(card.id);
      window.setTimeout(() => setCopiedCard(null), 1800);
    }
  };

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase();
    return cards
      .filter((card) => category === "All" || card.category === category)
      .filter((card) => `${card.question} ${card.answer} ${card.category}`.toLowerCase().includes(normalized))
      .sort((a, b) => {
        if (priority === "Core first") return ["Core", "Build", "Advanced"].indexOf(a.priority) - ["Core", "Build", "Advanced"].indexOf(b.priority);
        if (priority === "Weak first") return (mastery[a.id] ?? 0) - (mastery[b.id] ?? 0);
        return a.category.localeCompare(b.category);
      });
  }, [category, mastery, priority, query]);

  return (
    <section className="page-section concepts-page">
      <div className="page-title">
        <div className="eyebrow">KNOWLEDGE / ACTIVE RECALL</div>
        <h1>Know it well enough to <em>defend it.</em></h1>
        <p>Every card includes the answer signal, the common trap and a three-question follow-up ladder.</p>
      </div>
      <div className="filter-bar">
        <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts, e.g. chunking" /></label>
        <select aria-label="Sort concept cards" value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option>Core first</option><option>Weak first</option><option>By category</option>
        </select>
      </div>
      <div className="category-strip" role="group" aria-label="Concept categories">
        {categories.map((item) => <button className={category === item ? "active" : ""} key={item} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="library-summary">
        <span>{filtered.length} concepts</span>
        <span>{Object.values(mastery).filter((value) => value === 2).length} interview ready</span>
      </div>
      <div className="concept-list">
        {filtered.map((card, index) => {
          const isOpen = openCard === card.id;
          const score = mastery[card.id] ?? 0;
          return (
            <article className={`concept-row ${isOpen ? "open" : ""}`} key={card.id}>
              <button className="concept-summary" onClick={() => setOpenCard(isOpen ? null : card.id)} aria-expanded={isOpen}>
                <span className="concept-number">{String(index + 1).padStart(2, "0")}</span>
                <span className="concept-title"><small>{card.category} · {card.priority}</small><strong>{card.question}</strong></span>
                <span className={`mastery-dot m${score}`}>{masteryLabel[score]}</span>
                <span className="expand">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && (
                <div className="concept-detail">
                  <div className="answer-column">
                    <div className="answer-tools"><small>INTERVIEW-READY FRAME</small><button onClick={() => handleCopy(card)} title="Copy the question, answer frame, traps and coaching instructions">{copiedCard === card.id ? "Copied ✓" : "Copy Q+A for AI"}</button></div>
                    <p>{card.answer}</p>
                    <div className="signal-list">{card.signals.map((signal) => <span key={signal}>{signal}</span>)}</div>
                  </div>
                  <div className="pressure-column">
                    <div><small>COMMON TRAP</small><p>{card.trap}</p></div>
                    <div className="follow-up-block"><small>FOLLOW-UP LADDER</small><ol>{getFollowUps(card).map((question) => <li key={question}>{question}</li>)}</ol></div>
                    <div className="rating-row vertical">
                      <small>RATE YOUR SPOKEN ANSWER</small>
                      <div><button className={score === 0 ? "selected" : ""} onClick={() => updateMastery(card.id, 0)}>Repair</button><button className={score === 1 ? "selected" : ""} onClick={() => updateMastery(card.id, 1)}>Clear</button><button className={score === 2 ? "selected" : ""} onClick={() => updateMastery(card.id, 2)}>Ready</button></div>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InterviewLab({
  notes,
  mastery,
  updateNote,
  updateMastery,
  recordAttempt,
}: {
  notes: Record<string, string>;
  mastery: Record<string, Mastery>;
  updateNote: (id: string, note: string) => void;
  updateMastery: (id: string, score: Mastery) => void;
  recordAttempt: () => void;
}) {
  const [mode, setMode] = useState<"Mock answer" | "Design frame">("Mock answer");
  const [category, setCategory] = useState("All");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seconds, setSeconds] = useState(90);
  const [running, setRunning] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [rubric, setRubric] = useState([false, false, false, false, false]);
  const [frameType, setFrameType] = useState<keyof typeof systemDesignFrames>("LLM system");
  const [frameChecks, setFrameChecks] = useState<boolean[]>(systemDesignFrames["LLM system"].map(() => false));
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  const categories = ["All", ...Array.from(new Set(cards.map((card) => card.category)))];
  const pool = cards.filter((card) => category === "All" || card.category === category);
  const current = pool[questionIndex % pool.length] ?? cards[0];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { setRunning(false); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const nextQuestion = () => {
    setQuestionIndex((value) => (value + 1) % Math.max(pool.length, 1));
    setSeconds(90); setRunning(false); setShowCoach(false); setRubric([false, false, false, false, false]);
  };

  const submitAttempt = () => {
    const score = rubric.filter(Boolean).length;
    updateMastery(current.id, score >= 4 ? 2 : score >= 2 ? 1 : 0);
    recordAttempt();
    setShowCoach(true);
  };

  const handleCopy = async () => {
    const copied = await copyForAi(current, notes[current.id]);
    setCopyStatus(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  };

  const switchFrame = (type: keyof typeof systemDesignFrames) => {
    setFrameType(type);
    setFrameChecks(systemDesignFrames[type].map(() => false));
  };

  return (
    <section className="page-section lab-page">
      <div className="lab-header">
        <div className="page-title compact">
          <div className="eyebrow">PRACTICE / INTERVIEW PRESSURE</div>
          <h1>Make the answer <em>land.</em></h1>
        </div>
        <div className="segmented">
          <button className={mode === "Mock answer" ? "active" : ""} onClick={() => setMode("Mock answer")}>Mock answer</button>
          <button className={mode === "Design frame" ? "active" : ""} onClick={() => setMode("Design frame")}>Design frame</button>
        </div>
      </div>

      {mode === "Mock answer" ? (
        <div className="mock-layout">
          <aside className="mock-controls">
            <label>QUESTION SET<select value={category} onChange={(event) => { setCategory(event.target.value); setQuestionIndex(0); }}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select></label>
            <div className="mini-stat"><span>{mastery[current.id] ?? 0}/2</span><small>CURRENT MASTERY</small></div>
            <div className="coach-rule"><strong>THE GREEN ANSWER</strong><p>Definition → example → tradeoff → failure mode → production concern.</p></div>
          </aside>
          <div className="mock-stage">
            <div className="question-meta"><span>{current.category}</span><span>{String(questionIndex + 1).padStart(2, "0")} / {String(pool.length).padStart(2, "0")}</span></div>
            <h2>{current.question}</h2>
            <div className={`answer-timer ${seconds <= 15 ? "urgent" : ""}`}><span>{String(Math.floor(seconds / 60)).padStart(2, "0")}</span>:<span>{String(seconds % 60).padStart(2, "0")}</span></div>
            <div className="mock-actions"><button className="primary" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : seconds === 90 ? "Start 90-second answer" : "Resume"}</button><button className="copy-ai-button" onClick={handleCopy} title="Copy the question, your notes, answer frame and coaching instructions">{copyStatus === "copied" ? "Copied for AI ✓" : copyStatus === "failed" ? "Copy failed—try again" : "Copy Q+A for AI"}</button><button className="text-button" onClick={nextQuestion}>Skip question →</button></div>
            <label className="notes-field"><span>Capture only what broke—not a transcript.</span><textarea value={notes[current.id] ?? ""} onChange={(event) => updateNote(current.id, event.target.value)} placeholder="Example: I defined it, but missed the tradeoff and production failure..." /></label>
            <div className="rubric-checks">
              {[
                "Clear definition", "Concrete example", "Tradeoff", "Failure mode", "Production concern",
              ].map((item, index) => (
                <label key={item}><input type="checkbox" checked={rubric[index]} onChange={() => setRubric((values) => values.map((value, position) => position === index ? !value : value))} /><span>{item}</span></label>
              ))}
            </div>
            <button className="dark-button full" onClick={submitAttempt}>Score this attempt</button>
            {showCoach && (
              <div className="coach-answer">
                <small>COACH’S ANSWER FRAME</small><p>{current.answer}</p>
                <div className="coach-grid"><div><strong>Signals to hit</strong>{current.signals.map((item) => <span key={item}>{item}</span>)}</div><div><strong>Follow-up ladder</strong><ol>{getFollowUps(current).map((question) => <li key={question}>{question}</li>)}</ol></div></div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="design-workbench">
          <div className="frame-intro">
            <div className="segmented small"><button className={frameType === "LLM system" ? "active" : ""} onClick={() => switchFrame("LLM system")}>LLM system</button><button className={frameType === "ML system" ? "active" : ""} onClick={() => switchFrame("ML system")}>ML system</button></div>
            <h2>{frameType === "LLM system" ? "Design an enterprise RAG platform." : "Design a recommendation system."}</h2>
            <p>Use the frame as guardrails, not a script. Speak for 30–45 minutes and make each transition explicit.</p>
            <div className="design-callout"><strong>Start here</strong><p>“Before I draw the architecture, I want to clarify the user, scale, latency, quality and security requirements.”</p></div>
          </div>
          <div className="frame-list">
            <div className="frame-progress"><span>{frameChecks.filter(Boolean).length}/{frameChecks.length} covered</span><div><i style={{ width: `${(frameChecks.filter(Boolean).length / frameChecks.length) * 100}%` }} /></div></div>
            {systemDesignFrames[frameType].map((item, index) => <label key={item} className={frameChecks[index] ? "done" : ""}><input type="checkbox" checked={frameChecks[index]} onChange={() => setFrameChecks((values) => values.map((value, position) => position === index ? !value : value))} /><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong></label>)}
          </div>
        </div>
      )}
    </section>
  );
}

function RoadmapView({ state, toggleWeek, setState }: { state: StudyState; toggleWeek: (week: number) => void; setState: React.Dispatch<React.SetStateAction<StudyState>> }) {
  const [tab, setTab] = useState<"10-week plan" | "Readiness gate">("10-week plan");
  return (
    <section className="page-section roadmap-page">
      <div className="roadmap-hero">
        <div className="page-title compact"><div className="eyebrow">PLAN / 10 WEEKS</div><h1>Study in the order that <em>wins interviews.</em></h1><p>60–90 minutes on weekdays. One serious mock every Saturday. Apply before the plan is “finished.”</p></div>
        <div className="roadmap-stat"><strong>{state.completedWeeks.length}</strong><span>/ 10 weeks complete</span><div><i style={{ width: `${state.completedWeeks.length * 10}%` }} /></div></div>
      </div>
      <div className="roadmap-tabs"><button className={tab === "10-week plan" ? "active" : ""} onClick={() => setTab("10-week plan")}>10-week plan</button><button className={tab === "Readiness gate" ? "active" : ""} onClick={() => setTab("Readiness gate")}>Readiness gate <span>{state.gate.filter(Boolean).length}/10</span></button></div>
      {tab === "10-week plan" ? (
        <>
          <div className="cadence-grid">{cadence.map(([day, focus, output]) => <div key={day} className={day === cadence[(new Date().getDay() + 6) % 7][0] ? "today" : ""}><strong>{day}</strong><span>{focus}</span><small>{output}</small></div>)}</div>
          <div className="timeline">
            {weeks.map((week) => {
              const complete = state.completedWeeks.includes(week.week);
              return <article key={week.week} className={complete ? "complete" : ""}>
                <button className="week-check" aria-label={`${complete ? "Mark incomplete" : "Complete"} week ${week.week}`} onClick={() => toggleWeek(week.week)}>{complete ? "✓" : week.week}</button>
                <div className="week-copy"><small>{week.phase}</small><h2>{week.title}</h2><p>{week.focus}</p><div>{week.topics.map((topic) => <span key={topic}>{topic}</span>)}</div></div>
                <div className="week-outcome"><small>EXIT TEST</small><p>{week.outcome}</p><button onClick={() => toggleWeek(week.week)}>{complete ? "Completed" : "Mark complete"}</button></div>
              </article>;
            })}
          </div>
        </>
      ) : (
        <div className="gate-layout">
          <div className="gate-intro"><span className="gate-score">{state.gate.filter(Boolean).length}<small>/10</small></span><h2>Start applying when these are solid.</h2><p>A green answer is clear, grounded in your experience, honest about tradeoffs, and ready for follow-up pressure.</p><div className="traffic-light"><span>RED <small>Definition only</small></span><span>YELLOW <small>Example, little depth</small></span><span>GREEN <small>Tradeoffs + production</small></span></div></div>
          <div className="gate-list">{readinessGate.map((item, index) => <label key={item} className={state.gate[index] ? "done" : ""}><input type="checkbox" checked={state.gate[index] ?? false} onChange={() => setState((current) => ({ ...current, gate: current.gate.map((value, position) => position === index ? !value : value) }))} /><span>{String(index + 1).padStart(2, "0")}</span><strong>{item}</strong><small>{state.gate[index] ? "GREEN" : "NOT YET"}</small></label>)}</div>
        </div>
      )}
    </section>
  );
}
