import type { Card } from "./study-data";

export const hkexSqlIntermediateCards: Card[] = [
  {
    id: "hkex-sql-intermediate-issuer-turnover",
    category: "HKEX SQL Intermediate",
    question: "Return every issuer's executed turnover for one trading date, including issuers with zero turnover.",
    code: `-- PostgreSQL
issuers(issuer_id bigint PRIMARY KEY, issuer_name text)
securities(security_id bigint PRIMARY KEY, issuer_id bigint REFERENCES issuers)
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint REFERENCES securities,
  trading_date date,
  quantity numeric,
  price numeric,
  status text
)

-- Parameters: $1 = trading_date
-- Output: issuer_id, issuer_name, executed_turnover`,
    answerSeconds: 600,
    answer: `Pre-aggregate the fact table at issuer grain, then left join that bounded result to the complete issuer dimension. This preserves issuers with no securities as well as issuers whose securities had no qualifying trades.

Reference SQL:
WITH daily AS (
  SELECT s.issuer_id, SUM(t.quantity * t.price) AS executed_turnover
  FROM trades t
  JOIN securities s ON s.security_id = t.security_id
  WHERE t.trading_date = $1
    AND t.status = 'EXECUTED'
  GROUP BY s.issuer_id
)
SELECT i.issuer_id,
       i.issuer_name,
       COALESCE(d.executed_turnover, 0::numeric) AS executed_turnover
FROM issuers i
LEFT JOIN daily d ON d.issuer_id = i.issuer_id
ORDER BY i.issuer_id;`,
    signals: ["Fact pre-aggregation", "Correct output grain", "Zero-row preservation", "Numeric turnover"],
    trap: "Joining all three tables with inner joins, or putting trade filters in a final WHERE clause and silently removing zero-activity issuers.",
    followUp: "Which HKEX control totals would you calculate to prove that the issuer aggregation neither lost nor multiplied executed trades?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-conflicting-duplicates",
    category: "HKEX SQL Intermediate",
    question: "Find duplicate market-data business keys and distinguish exact replays from conflicting payloads.",
    code: `-- PostgreSQL
market_events(
  provider text,
  security_id bigint,
  event_time timestamptz,
  sequence_no bigint,
  payload_hash text NOT NULL,
  ingested_at timestamptz
)

-- Business key: provider, security_id, sequence_no
-- Output only duplicated keys with row_count and distinct_payload_count.`,
    answerSeconds: 480,
    answer: `Group at the declared business-key grain and use HAVING to keep groups with multiple arrivals. COUNT(DISTINCT payload_hash) separates byte- or canonical-payload replays from a source conflict, assuming the hash was computed consistently.

Reference SQL:
SELECT provider,
       security_id,
       sequence_no,
       COUNT(*) AS row_count,
       COUNT(DISTINCT payload_hash) AS distinct_payload_count,
       MIN(ingested_at) AS first_seen_at,
       MAX(ingested_at) AS last_seen_at
FROM market_events
GROUP BY provider, security_id, sequence_no
HAVING COUNT(*) > 1
ORDER BY provider, security_id, sequence_no;

A distinct_payload_count greater than one should be quarantined or escalated rather than resolved by arbitrary arrival order.`,
    signals: ["Declared business key", "GROUP BY and HAVING", "Payload conflict distinction", "Deterministic escalation"],
    trap: "Using SELECT DISTINCT to hide the extra rows; it neither reports the quality failure nor resolves conflicting versions.",
    followUp: "What additional HKEX source contract would you need before choosing an authoritative record from a conflicting duplicate group?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-above-market-average",
    category: "HKEX SQL Intermediate",
    question: "Return securities whose daily turnover is above the average security turnover in the same market and date.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  market text,
  security_id bigint,
  trading_date date,
  quantity numeric,
  price numeric,
  status text
)

-- Parameters: $1 = start_date, $2 = end_date
-- Average is across securities with at least one EXECUTED trade that day.`,
    answerSeconds: 600,
    answer: `First aggregate raw trades to one row per market, date and security. The correlated subquery then compares each security total with the peer average at that already-correct grain.

Reference SQL:
WITH security_totals AS (
  SELECT market,
         trading_date,
         security_id,
         SUM(quantity * price) AS turnover
  FROM trades
  WHERE status = 'EXECUTED'
    AND trading_date BETWEEN $1 AND $2
  GROUP BY market, trading_date, security_id
)
SELECT t.market, t.trading_date, t.security_id, t.turnover
FROM security_totals t
WHERE t.turnover > (
  SELECT AVG(p.turnover)
  FROM security_totals p
  WHERE p.market = t.market
    AND p.trading_date = t.trading_date
)
ORDER BY t.trading_date, t.market, t.turnover DESC, t.security_id;`,
    signals: ["Aggregate before comparison", "Correlated peer group", "Explicit population", "Deterministic ordering"],
    trap: "Taking AVG(quantity * price) over individual trades, which compares a security total with an average trade rather than an average security.",
    followUp: "How would the HKEX business definition change if zero-trade listed securities must be included in the daily average?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-current-archive-union",
    category: "HKEX SQL Intermediate",
    question: "Combine current and archive trade tables without dropping legitimate duplicate-valued rows or double counting the retention boundary.",
    code: `-- PostgreSQL
trade_current(trade_id bigint, trading_date date, market text, turnover numeric)
trade_archive(trade_id bigint, trading_date date, market text, turnover numeric)

-- Contract
-- Archive is authoritative before $1::date.
-- Current is authoritative on and after $1::date.
-- Return daily market trade_count and turnover from $2 through $3.`,
    answerSeconds: 480,
    answer: `Make the source ranges disjoint, then use UNION ALL. UNION would add a potentially expensive global deduplication and could wrongly collapse two distinct trades that happen to share all projected values.

Reference SQL:
WITH all_trades AS (
  SELECT trade_id, trading_date, market, turnover
  FROM trade_archive
  WHERE trading_date >= $2
    AND trading_date <= $3
    AND trading_date < $1

  UNION ALL

  SELECT trade_id, trading_date, market, turnover
  FROM trade_current
  WHERE trading_date >= $2
    AND trading_date <= $3
    AND trading_date >= $1
)
SELECT trading_date,
       market,
       COUNT(*) AS trade_count,
       SUM(turnover) AS turnover
FROM all_trades
GROUP BY trading_date, market
ORDER BY trading_date, market;`,
    signals: ["Disjoint source predicates", "UNION ALL", "Inclusive boundary policy", "Reconciled aggregation"],
    trap: "Using UNION as an undocumented deduplication policy instead of proving that the archive/current ownership ranges do not overlap.",
    followUp: "What daily HKEX reconciliation would alert you if the archival process violated the stated cutoff contract?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-monthly-turnover-change",
    category: "HKEX SQL Intermediate",
    question: "Return monthly turnover and month-over-month change for every market, including months with no trades.",
    code: `-- PostgreSQL
markets(market text PRIMARY KEY)
trades(
  trade_id bigint PRIMARY KEY,
  market text REFERENCES markets,
  trading_date date,
  turnover numeric,
  status text
)

-- Parameters: $1 = first month, $2 = last month, both inclusive.
-- Output: market, month_start, turnover, prior_turnover, mom_pct.`,
    answerSeconds: 600,
    answer: `Build the complete market-month grain before applying LAG; otherwise an inactive month disappears and the comparison skips to an older month.

Reference SQL:
WITH months AS (
  SELECT generate_series(
           date_trunc('month', $1::date),
           date_trunc('month', $2::date),
           interval '1 month'
         )::date AS month_start
), monthly AS (
  SELECT market,
         date_trunc('month', trading_date)::date AS month_start,
         SUM(turnover) AS turnover
  FROM trades
  WHERE status = 'EXECUTED'
    AND trading_date >= date_trunc('month', $1::date)
    AND trading_date < date_trunc('month', $2::date) + interval '1 month'
  GROUP BY market, date_trunc('month', trading_date)::date
), series AS (
  SELECT m.market,
         mo.month_start,
         COALESCE(x.turnover, 0::numeric) AS turnover
  FROM markets m
  CROSS JOIN months mo
  LEFT JOIN monthly x
    ON x.market = m.market
   AND x.month_start = mo.month_start
), compared AS (
  SELECT series.*,
         LAG(turnover) OVER (
           PARTITION BY market ORDER BY month_start
         ) AS prior_turnover
  FROM series
)
SELECT market,
       month_start,
       turnover,
       prior_turnover,
       100 * (turnover - prior_turnover) / NULLIF(prior_turnover, 0) AS mom_pct
FROM compared
ORDER BY market, month_start;

The first month and any month following zero turnover have a NULL percentage because the rate is undefined; do not silently convert it to zero. In another dialect, use its calendar table or sequence generator instead of generate_series.`,
    signals: ["Complete month scaffold", "Pre-aggregated turnover", "LAG after gap filling", "Zero-denominator policy"],
    trap: "Applying LAG to only observed trade months, which reports a two-month change as if it were month over month.",
    followUp: "How would HKEX distinguish a genuine zero-turnover month from an incomplete or late source load?",
    priority: "Build",
  },
];
