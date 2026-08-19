import type { Card } from "./study-data";

export const hkexSqlAdvancedCards: Card[] = [
  {
    id: "hkex-sql-advanced-temporal-classification",
    category: "HKEX SQL Advanced",
    question: "Join every trade to the security classification that was valid at trade time.",
    code: `-- PostgreSQL; valid_to is an exclusive boundary and NULL means open-ended.
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint,
  traded_at timestamptz,
  turnover numeric
)
security_classification_history(
  version_id bigint PRIMARY KEY,
  security_id bigint,
  sector text,
  valid_from timestamptz,
  valid_to timestamptz
)

-- Output: trade_id, traded_at, turnover, sector.
-- A trade with no valid classification must remain visible as UNCLASSIFIED.`,
    answerSeconds: 720,
    answer: `Use a half-open temporal range so an exact boundary belongs to one version, and keep the temporal predicates in the join. This query assumes history rows for one security never overlap; that invariant needs a separate quality check or database constraint.

Reference SQL:
SELECT t.trade_id,
       t.traded_at,
       t.turnover,
       COALESCE(h.sector, 'UNCLASSIFIED') AS sector
FROM trades t
LEFT JOIN security_classification_history h
  ON h.security_id = t.security_id
 AND t.traded_at >= h.valid_from
 AND (t.traded_at < h.valid_to OR h.valid_to IS NULL)
ORDER BY t.traded_at, t.trade_id;

Index the history table around the actual engine and workload; a starting B-tree candidate is (security_id, valid_from), but range joins and overlap enforcement may justify PostgreSQL range types plus GiST. Reconcile output row count to trade count to detect multiplication.`,
    signals: ["As-of temporal join", "Half-open interval", "Unclassified preservation", "No-overlap invariant"],
    trap: "Joining only on security_id and selecting the latest current classification, which rewrites historical trades using today's sector.",
    followUp: "What HKEX process should happen when a late correction changes a classification interval already used in published reports?",
    priority: "Advanced",
  },
  {
    id: "hkex-sql-advanced-participant-retention",
    category: "HKEX SQL Advanced",
    question: "Build a monthly participant-retention matrix from each participant's first executed-trade month, including zero-retention cells.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  participant_id bigint,
  trading_date date,
  status text
)

-- $1 = analysis_end_month; $2 = maximum month_number.
-- Output: cohort_month, month_number, cohort_size,
--         retained_participants, retention_pct.`,
    answerSeconds: 720,
    answer: `Deduplicate participant-month activity, derive the first active month once, then scaffold every eligible cohort-offset cell before counting retained participants.

Reference SQL:
WITH activity AS (
  SELECT DISTINCT participant_id,
         date_trunc('month', trading_date)::date AS activity_month
  FROM trades
  WHERE status = 'EXECUTED'
    AND trading_date < date_trunc('month', $1::date) + interval '1 month'
), firsts AS (
  SELECT participant_id, MIN(activity_month) AS cohort_month
  FROM activity
  GROUP BY participant_id
), cohort_sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size
  FROM firsts
  GROUP BY cohort_month
), offsets AS (
  SELECT generate_series(0, $2::int) AS month_number
), grid AS (
  SELECT c.cohort_month, o.month_number, c.cohort_size
  FROM cohort_sizes c
  CROSS JOIN offsets o
  WHERE c.cohort_month + o.month_number * interval '1 month'
        <= date_trunc('month', $1::date)
), retained AS (
  SELECT f.cohort_month,
         ((EXTRACT(YEAR FROM a.activity_month) - EXTRACT(YEAR FROM f.cohort_month)) * 12
          + EXTRACT(MONTH FROM a.activity_month) - EXTRACT(MONTH FROM f.cohort_month))::int AS month_number,
         COUNT(DISTINCT a.participant_id) AS retained_participants
  FROM firsts f
  JOIN activity a ON a.participant_id = f.participant_id
  GROUP BY f.cohort_month, month_number
)
SELECT g.cohort_month,
       g.month_number,
       g.cohort_size,
       COALESCE(r.retained_participants, 0) AS retained_participants,
       100.0 * COALESCE(r.retained_participants, 0) / NULLIF(g.cohort_size, 0) AS retention_pct
FROM grid g
LEFT JOIN retained r
  ON r.cohort_month = g.cohort_month
 AND r.month_number = g.month_number
ORDER BY g.cohort_month, g.month_number;

The analysis-end boundary prevents partially observed future cells. In another dialect, replace generate_series and the month-difference expression with a calendar table and the engine's date-difference function.`,
    signals: ["First-activity cohort", "Distinct participant-month", "Complete cohort-offset grid", "Observation-window boundary"],
    trap: "Dividing activity rows by cohort size without deduplicating participant-months, or treating not-yet-observable cells as zero retention.",
    followUp: "How would HKEX distinguish true participant churn from a market holiday or a source outage that suppressed all activity?",
    priority: "Build",
  },
  {
    id: "hkex-sql-advanced-overlapping-validity",
    category: "HKEX SQL Advanced",
    question: "Detect every classification-history row whose validity interval overlaps any earlier row for the same security.",
    code: `-- PostgreSQL; valid_to is exclusive and NULL means infinity.
security_classification_history(
  version_id bigint PRIMARY KEY,
  security_id bigint,
  valid_from timestamptz,
  valid_to timestamptz,
  sector text
)

-- Adjacent intervals where prior valid_to = current valid_from are valid.
-- A long earlier interval may cover several later rows.`,
    answerSeconds: 720,
    answer: `LAG(valid_to) is insufficient because the immediately preceding interval may end early while an even earlier interval still covers the current start. Compare each start with the running maximum end of all prior rows.

Reference SQL:
WITH ordered AS (
  SELECT h.*,
         MAX(COALESCE(valid_to, 'infinity'::timestamptz)) OVER (
           PARTITION BY security_id
           ORDER BY valid_from, version_id
           ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
         ) AS prior_max_end
  FROM security_classification_history h
)
SELECT version_id,
       security_id,
       valid_from,
       valid_to,
       prior_max_end
FROM ordered
WHERE prior_max_end IS NOT NULL
  AND valid_from < prior_max_end
ORDER BY security_id, valid_from, version_id;

Also reject valid_to <= valid_from. In PostgreSQL, a range exclusion constraint can prevent overlap at write time rather than merely report it later.`,
    signals: ["Running prior maximum", "Exclusive end boundary", "Open-ended infinity", "Prevent as well as detect"],
    trap: "Checking only the immediately previous valid_to with LAG, which misses nested and long-running overlaps.",
    followUp: "How would HKEX repair overlapping versions without silently changing the classification used by historical reports?",
    priority: "Advanced",
  },
  {
    id: "hkex-sql-advanced-lineage-recursion",
    category: "HKEX SQL Advanced",
    question: "Use a recursive CTE to list every downstream dataset affected by a failed source, without looping forever on bad lineage data.",
    code: `-- PostgreSQL
dataset_lineage(
  parent_dataset text,
  child_dataset text,
  PRIMARY KEY(parent_dataset, child_dataset)
)

-- Parameter: $1 = failed source dataset
-- Output each downstream dataset once with minimum dependency depth.
-- The graph may contain an accidental cycle.`,
    answerSeconds: 900,
    answer: `Carry a path array through the recursion and refuse an edge whose child already appears in that path. Different valid paths may still reach the same dataset, so aggregate to its minimum depth in the final result.

Reference SQL:
WITH RECURSIVE impact(dataset, depth, path) AS (
  SELECT $1::text, 0, ARRAY[$1::text]

  UNION ALL

  SELECT l.child_dataset,
         i.depth + 1,
         i.path || l.child_dataset
  FROM impact i
  JOIN dataset_lineage l
    ON l.parent_dataset = i.dataset
  WHERE NOT (l.child_dataset = ANY(i.path))
    AND i.depth < 100
)
SELECT dataset,
       MIN(depth) AS minimum_depth
FROM impact
WHERE depth > 0
GROUP BY dataset
ORDER BY minimum_depth, dataset;

This makes impact traversal terminate, but the number of simple paths can still grow exponentially. In production, add an agreed maximum depth, statement timeout or row budget and use a graph/catalog service when repeated large traversals matter. Cycle detection should also produce a separate data-quality alert because silently skipping a cycle leaves the catalog invalid. Engines without arrays need a visited-path encoding or native cycle-detection feature.`,
    signals: ["Recursive CTE", "Path-based cycle guard", "Multiple-path deduplication", "Minimum impact depth"],
    trap: "Using UNION instead of a path guard and assuming it solves every cycle; rows with different depths or paths can remain distinct and recurse repeatedly.",
    followUp: "Which HKEX owners and reports should be notified first when the same source reaches them through several lineage paths?",
    priority: "Advanced",
  },
  {
    id: "hkex-sql-advanced-latest-quote-plan",
    category: "HKEX SQL Advanced",
    question: "Rewrite and index this latest-quote query, then explain when the original correlated plan might still win.",
    code: `-- PostgreSQL
securities(security_id bigint PRIMARY KEY, market text)
quotes(
  quote_id bigint PRIMARY KEY,
  security_id bigint,
  quoted_at timestamptz NOT NULL,
  price numeric
)

SELECT s.security_id,
       (SELECT q.price
          FROM quotes q
         WHERE q.security_id = s.security_id
         ORDER BY q.quoted_at DESC
         LIMIT 1) AS latest_price
FROM securities s;`,
    answerSeconds: 900,
    answer: `First make ties deterministic with quote_id. A set-oriented PostgreSQL rewrite can select one latest row per security, then join it to the complete security list.

Reference SQL:
WITH latest AS (
  SELECT DISTINCT ON (security_id)
         security_id,
         price,
         quoted_at,
         quote_id
  FROM quotes
  ORDER BY security_id, quoted_at DESC, quote_id DESC
)
SELECT s.security_id, l.price AS latest_price
FROM securities s
LEFT JOIN latest l ON l.security_id = s.security_id
ORDER BY s.security_id;

Candidate index:
CREATE INDEX quotes_latest_idx
ON quotes(security_id, quoted_at DESC, quote_id DESC)
INCLUDE (price);

Use EXPLAIN (ANALYZE, BUFFERS) on representative data. With a small outer security set and this index, the original correlated query can perform efficient limited index probes and beat a scan of all quotes. With many securities or a reusable full latest snapshot, the set-oriented plan may win. Optimization is evidence-driven, not a syntax rule. In a dialect without DISTINCT ON, use ROW_NUMBER() OVER (PARTITION BY security_id ORDER BY quoted_at DESC, quote_id DESC) and keep row number one. If quoted_at can be NULL, define its business meaning and use NULLS LAST consistently in both query and index rather than allowing it to rank as newest.`,
    signals: ["Deterministic latest row", "Covering composite index", "Plan and buffer evidence", "Correlated-plan nuance"],
    trap: "Claiming correlated subqueries are always slow, or using MAX(quoted_at) without resolving equal-timestamp ties.",
    followUp: "What HKEX freshness timestamp and stale-price rule should accompany latest_price so downstream analysts do not mistake old data for a current quote?",
    priority: "Advanced",
  },
];
