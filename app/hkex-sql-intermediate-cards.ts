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
  {
    id: "hkex-sql-intermediate-status-pivot",
    category: "HKEX SQL Intermediate",
    question: "Return one row per market with executed, cancelled and rejected trade counts for a date, including markets with no trades.",
    code: `-- PostgreSQL
markets(market text PRIMARY KEY)
trades(
  trade_id bigint PRIMARY KEY,
  market text REFERENCES markets,
  trading_date date NOT NULL,
  status text NOT NULL,
  quantity numeric,
  price numeric
)

-- Parameter: $1 = trading_date
-- Output: market, executed_count, cancelled_count, rejected_count,
--         executed_turnover`,
    answerSeconds: 600,
    answer: `Aggregate the filtered fact rows first, using conditional aggregates for the different statuses. Then left join the result to the complete market dimension so a market with no activity still appears.

Reference SQL:
WITH daily AS (
  SELECT market,
         COUNT(*) FILTER (WHERE status = 'EXECUTED') AS executed_count,
         COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count,
         COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_count,
         SUM(quantity * price) FILTER (WHERE status = 'EXECUTED') AS executed_turnover
  FROM trades
  WHERE trading_date = $1
  GROUP BY market
)
SELECT m.market,
       COALESCE(d.executed_count, 0) AS executed_count,
       COALESCE(d.cancelled_count, 0) AS cancelled_count,
       COALESCE(d.rejected_count, 0) AS rejected_count,
       COALESCE(d.executed_turnover, 0::numeric) AS executed_turnover
FROM markets m
LEFT JOIN daily d ON d.market = m.market
ORDER BY m.market;

In a dialect without FILTER, use SUM(CASE WHEN status = ... THEN 1 ELSE 0 END).`,
    signals: ["Conditional aggregation", "Zero-market preservation", "Fact pre-filtering", "Portable CASE alternative"],
    trap: "Starting from trades or applying the trade date in a final WHERE clause, which removes markets with no matching activity.",
    followUp: "How would you distinguish a genuine zero-count market from a missing daily source partition?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-no-executed-trades",
    category: "HKEX SQL Intermediate",
    question: "Find securities that are currently listed but had no executed trades during a requested date range.",
    code: `-- PostgreSQL
securities(
  security_id bigint PRIMARY KEY,
  symbol text NOT NULL,
  listed_on date NOT NULL,
  delisted_on date
)
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint REFERENCES securities,
  trading_date date NOT NULL,
  status text NOT NULL
)

-- Parameters: $1 = start_date, $2 = end_date, both inclusive.
-- "Currently listed" means listed at the end of $2.`,
    answerSeconds: 480,
    answer: `Use NOT EXISTS with the qualifying trade predicates inside the correlated subquery. This expresses the anti-join directly and is safe even when nullable values exist elsewhere in the trade table.

Reference SQL:
SELECT s.security_id, s.symbol
FROM securities s
WHERE s.listed_on <= $2
  AND (s.delisted_on IS NULL OR s.delisted_on > $2)
  AND NOT EXISTS (
    SELECT 1
    FROM trades t
    WHERE t.security_id = s.security_id
      AND t.status = 'EXECUTED'
      AND t.trading_date BETWEEN $1 AND $2
  )
ORDER BY s.security_id;

An index beginning with security_id and then the selective date or status columns can support the existence check; confirm with the actual plan and data distribution.`,
    signals: ["NOT EXISTS anti-join", "Correlated key", "Listing-date semantics", "Predicate placement"],
    trap: "Using NOT IN against a nullable subquery, or treating a security with only cancelled trades as having executed activity.",
    followUp: "How would your listing predicate change if the requirement meant active at any point in the range rather than active on the end date?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-top-three-securities",
    category: "HKEX SQL Intermediate",
    question: "Return exactly the top three securities by executed turnover in each market and trading date.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  market text NOT NULL,
  security_id bigint NOT NULL,
  trading_date date NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL
)

-- Parameters: $1 = start_date, $2 = end_date.
-- Break equal-turnover ties by lower security_id.`,
    answerSeconds: 600,
    answer: `Aggregate to security-day grain before ranking. ROW_NUMBER is appropriate because the requirement asks for exactly three rows and supplies a deterministic tie-breaker.

Reference SQL:
WITH totals AS (
  SELECT market,
         trading_date,
         security_id,
         SUM(quantity * price) AS turnover
  FROM trades
  WHERE status = 'EXECUTED'
    AND trading_date BETWEEN $1 AND $2
  GROUP BY market, trading_date, security_id
), ranked AS (
  SELECT totals.*,
         ROW_NUMBER() OVER (
           PARTITION BY market, trading_date
           ORDER BY turnover DESC, security_id
         ) AS position
  FROM totals
)
SELECT market, trading_date, security_id, turnover, position
FROM ranked
WHERE position <= 3
ORDER BY trading_date, market, position;

If the business instead wants all tied third-place securities, use RANK or DENSE_RANK and accept that more than three rows may be returned.`,
    signals: ["Aggregate before rank", "ROW_NUMBER partition", "Deterministic tie-break", "Tie-policy distinction"],
    trap: "Ranking individual trades instead of security totals, or using DENSE_RANK while still promising exactly three output rows.",
    followUp: "When would RANK and DENSE_RANK produce different fourth-place values after a tie?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-latest-successful-load",
    category: "HKEX SQL Intermediate",
    question: "Return every dataset and its latest successful load, including datasets that have never loaded successfully.",
    code: `-- PostgreSQL
datasets(dataset_id bigint PRIMARY KEY, dataset_name text NOT NULL)
dataset_loads(
  load_id bigint PRIMARY KEY,
  dataset_id bigint REFERENCES datasets,
  status text NOT NULL,
  completed_at timestamptz,
  row_count bigint
)

-- A successful load must have completed_at populated.
-- Break timestamp ties by higher load_id.`,
    answerSeconds: 600,
    answer: `Rank only valid successful loads, then left join rank one to the dataset dimension. Filtering status after the left join would either rank failures or remove datasets without successes.

Reference SQL:
WITH successful AS (
  SELECT l.*,
         ROW_NUMBER() OVER (
           PARTITION BY dataset_id
           ORDER BY completed_at DESC, load_id DESC
         ) AS rn
  FROM dataset_loads l
  WHERE status = 'SUCCEEDED'
    AND completed_at IS NOT NULL
)
SELECT d.dataset_id,
       d.dataset_name,
       s.load_id,
       s.completed_at,
       s.row_count
FROM datasets d
LEFT JOIN successful s
  ON s.dataset_id = d.dataset_id
 AND s.rn = 1
ORDER BY d.dataset_id;

The null load columns for a dataset with no successful run are meaningful and should not be replaced with a fabricated load identifier.`,
    signals: ["Filter before ranking", "ROW_NUMBER", "Deterministic latest row", "Preserve never-successful datasets"],
    trap: "Taking MAX(completed_at) and selecting unrelated load_id or row_count values, or placing rn = 1 in a WHERE clause after the left join.",
    followUp: "How would you report the latest attempt alongside the latest successful load without mixing their columns?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-trades-above-vwap",
    category: "HKEX SQL Intermediate",
    question: "Return executed trades priced above their security's volume-weighted average price for the same trading date.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint NOT NULL,
  trading_date date NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL
)

-- Ignore non-positive quantities as invalid for this exercise.
-- Parameters: $1 = start_date, $2 = end_date.`,
    answerSeconds: 600,
    answer: `Compute VWAP at security-day grain as total notional divided by total quantity, then join that benchmark back to the qualifying trades.

Reference SQL:
WITH valid_trades AS (
  SELECT *
  FROM trades
  WHERE status = 'EXECUTED'
    AND quantity > 0
    AND trading_date BETWEEN $1 AND $2
), daily_vwap AS (
  SELECT security_id,
         trading_date,
         SUM(quantity * price) / NULLIF(SUM(quantity), 0) AS vwap
  FROM valid_trades
  GROUP BY security_id, trading_date
)
SELECT t.trade_id,
       t.security_id,
       t.trading_date,
       t.quantity,
       t.price,
       v.vwap
FROM valid_trades t
JOIN daily_vwap v
  ON v.security_id = t.security_id
 AND v.trading_date = t.trading_date
WHERE t.price > v.vwap
ORDER BY t.trading_date, t.security_id, t.trade_id;

AVG(price) is not VWAP because it gives a one-share trade and a million-share trade equal influence.`,
    signals: ["Weighted-average formula", "Correct benchmark grain", "Invalid-quantity policy", "Join back to facts"],
    trap: "Using AVG(price), or calculating one market-wide VWAP instead of one per security and date.",
    followUp: "Should the trade being tested contribute to its own VWAP benchmark, and how would you calculate a leave-one-out version?",
    priority: "Build",
  },
  {
    id: "hkex-sql-intermediate-active-participants",
    category: "HKEX SQL Intermediate",
    question: "Find participants with executed trades on at least five distinct trading dates and turnover above a threshold.",
    code: `-- PostgreSQL
participants(participant_id bigint PRIMARY KEY, participant_name text NOT NULL)
trades(
  trade_id bigint PRIMARY KEY,
  participant_id bigint REFERENCES participants,
  trading_date date NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL
)

-- Parameters: $1 = start_date, $2 = end_date, $3 = minimum_turnover.`,
    answerSeconds: 480,
    answer: `WHERE restricts the input rows; GROUP BY produces one row per participant; HAVING applies conditions to those groups.

Reference SQL:
SELECT p.participant_id,
       p.participant_name,
       COUNT(DISTINCT t.trading_date) AS active_days,
       COUNT(*) AS executed_trade_count,
       SUM(t.quantity * t.price) AS turnover
FROM participants p
JOIN trades t ON t.participant_id = p.participant_id
WHERE t.status = 'EXECUTED'
  AND t.trading_date BETWEEN $1 AND $2
GROUP BY p.participant_id, p.participant_name
HAVING COUNT(DISTINCT t.trading_date) >= 5
   AND SUM(t.quantity * t.price) >= $3
ORDER BY turnover DESC, p.participant_id;

COUNT(DISTINCT trading_date) measures active dates, not number of trades.`,
    signals: ["WHERE versus HAVING", "Distinct active dates", "Participant grain", "Turnover threshold"],
    trap: "Using COUNT(*) >= 5 and accidentally treating five trades on one date as five active trading dates.",
    followUp: "How would you include participants with no executed trades if the output also needed an eligibility status for everyone?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-summary-reconciliation",
    category: "HKEX SQL Intermediate",
    question: "Reconcile source and warehouse daily market summaries and classify missing or mismatched rows.",
    code: `-- PostgreSQL
source_daily(
  trading_date date,
  market text,
  trade_count bigint NOT NULL,
  turnover numeric NOT NULL,
  PRIMARY KEY (trading_date, market)
)
warehouse_daily(
  trading_date date,
  market text,
  trade_count bigint NOT NULL,
  turnover numeric NOT NULL,
  PRIMARY KEY (trading_date, market)
)

-- Parameters: $1 = start_date, $2 = end_date, $3 = turnover_tolerance.
-- Return only exceptions.`,
    answerSeconds: 600,
    answer: `Use a FULL OUTER JOIN so keys missing from either side remain visible. Classify absence before comparing measures, and use an explicit tolerance for numeric turnover.

Reference SQL:
WITH compared AS (
  SELECT COALESCE(s.trading_date, w.trading_date) AS trading_date,
         COALESCE(s.market, w.market) AS market,
         s.trade_count AS source_trade_count,
         w.trade_count AS warehouse_trade_count,
         s.turnover AS source_turnover,
         w.turnover AS warehouse_turnover,
         CASE
           WHEN s.market IS NULL THEN 'MISSING_IN_SOURCE'
           WHEN w.market IS NULL THEN 'MISSING_IN_WAREHOUSE'
           WHEN s.trade_count <> w.trade_count
             OR ABS(s.turnover - w.turnover) > $3 THEN 'MISMATCH'
           ELSE 'MATCH'
         END AS result
  FROM source_daily s
  FULL OUTER JOIN warehouse_daily w
    ON w.trading_date = s.trading_date
   AND w.market = s.market
  WHERE COALESCE(s.trading_date, w.trading_date) BETWEEN $1 AND $2
)
SELECT *
FROM compared
WHERE result <> 'MATCH'
ORDER BY trading_date, market;

The primary keys make market non-null, so null on one side safely indicates an absent row. If measures may be null, define their comparison policy explicitly instead of relying on three-valued logic.`,
    signals: ["FULL OUTER JOIN", "Missing-side classification", "Explicit tolerance", "Exception-only output"],
    trap: "Using an inner join, which makes the most serious exceptions—keys missing from one side—disappear.",
    followUp: "Which raw-level control would you run next when counts match but turnover does not?",
    priority: "Build",
  },
  {
    id: "hkex-sql-intermediate-order-fill-summary",
    category: "HKEX SQL Intermediate",
    question: "Return every order with filled quantity, remaining quantity and fill status, including orders with no fills.",
    code: `-- PostgreSQL
orders(
  order_id bigint PRIMARY KEY,
  participant_id bigint NOT NULL,
  order_date date NOT NULL,
  order_quantity numeric NOT NULL
)
fills(
  fill_id bigint PRIMARY KEY,
  order_id bigint REFERENCES orders,
  fill_quantity numeric NOT NULL,
  fill_status text NOT NULL
)

-- Parameters: $1 = start_date, $2 = end_date.
-- Count only fills with fill_status = 'VALID'; valid quantities are positive.`,
    answerSeconds: 600,
    answer: `Aggregate valid fills to one row per order before joining them to orders. This avoids multiplying order-level measures and naturally preserves unfilled orders.

Reference SQL:
WITH fill_totals AS (
  SELECT order_id,
         SUM(fill_quantity) AS filled_quantity
  FROM fills
  WHERE fill_status = 'VALID'
  GROUP BY order_id
)
SELECT o.order_id,
       o.participant_id,
       o.order_quantity,
       COALESCE(f.filled_quantity, 0::numeric) AS filled_quantity,
       o.order_quantity - COALESCE(f.filled_quantity, 0::numeric) AS remaining_quantity,
       CASE
         WHEN COALESCE(f.filled_quantity, 0) = 0 THEN 'UNFILLED'
         WHEN f.filled_quantity < o.order_quantity THEN 'PARTIAL'
         WHEN f.filled_quantity = o.order_quantity THEN 'FILLED'
         ELSE 'OVERFILLED'
       END AS fill_status
FROM orders o
LEFT JOIN fill_totals f ON f.order_id = o.order_id
WHERE o.order_date BETWEEN $1 AND $2
ORDER BY o.order_id;

OVERFILLED is surfaced as a data-quality exception rather than hidden by clamping remaining quantity to zero.`,
    signals: ["Child pre-aggregation", "Left join", "COALESCE for no fills", "Overfill exception"],
    trap: "Joining raw fills and summing order_quantity, which repeats the order quantity once per fill and corrupts the result.",
    followUp: "How would cancellations or fill reversals change the authoritative filled-quantity calculation?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-previous-trade-gap",
    category: "HKEX SQL Intermediate",
    question: "For each executed trade, show the previous executed trade time and elapsed seconds for the same security.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint NOT NULL,
  executed_at timestamptz,
  status text NOT NULL
)

-- Ignore rows with a null executed_at.
-- Break timestamp ties by trade_id.`,
    answerSeconds: 480,
    answer: `Filter to the population that defines "previous" before applying LAG. Include trade_id in the window order so equal timestamps have deterministic sequence.

Reference SQL:
WITH sequenced AS (
  SELECT trade_id,
         security_id,
         executed_at,
         LAG(executed_at) OVER (
           PARTITION BY security_id
           ORDER BY executed_at, trade_id
         ) AS previous_executed_at
  FROM trades
  WHERE status = 'EXECUTED'
    AND executed_at IS NOT NULL
)
SELECT trade_id,
       security_id,
       executed_at,
       previous_executed_at,
       EXTRACT(EPOCH FROM executed_at - previous_executed_at) AS seconds_since_previous
FROM sequenced
ORDER BY security_id, executed_at, trade_id;

The first trade per security has null previous time and null elapsed seconds; that is correct rather than zero.`,
    signals: ["Filter before window", "LAG partition", "Deterministic ordering", "First-row null semantics"],
    trap: "Applying LAG before removing cancelled rows, so the reported previous event may not be an executed trade.",
    followUp: "How would you flag sessions separated by more than 30 minutes using this result?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-notional-buckets",
    category: "HKEX SQL Intermediate",
    question: "Bucket executed trades by notional and calculate each bucket's percentage of that trading date's trades.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  trading_date date NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL
)

-- Quantity and price are positive for this exercise.
-- Buckets: under 10,000; 10,000 through under 100,000; 100,000 or more.
-- Parameters: $1 = start_date, $2 = end_date.`,
    answerSeconds: 600,
    answer: `Assign every qualifying trade to one mutually exclusive bucket, aggregate the counts, then use a window over those aggregate counts for the daily percentage.

Reference SQL:
WITH labeled AS (
  SELECT trading_date,
         CASE
           WHEN quantity * price < 10000 THEN 'UNDER_10K'
           WHEN quantity * price < 100000 THEN '10K_TO_100K'
           ELSE '100K_PLUS'
         END AS notional_bucket,
         CASE
           WHEN quantity * price < 10000 THEN 1
           WHEN quantity * price < 100000 THEN 2
           ELSE 3
         END AS bucket_order
  FROM trades
  WHERE status = 'EXECUTED'
    AND trading_date BETWEEN $1 AND $2
), bucketed AS (
  SELECT trading_date,
         notional_bucket,
         bucket_order,
         COUNT(*) AS trade_count
  FROM labeled
  GROUP BY trading_date, notional_bucket, bucket_order
)
SELECT trading_date,
       notional_bucket,
       trade_count,
       100.0 * trade_count
         / NULLIF(SUM(trade_count) OVER (PARTITION BY trading_date), 0) AS trade_pct
FROM bucketed
ORDER BY trading_date, bucket_order;

The ordered CASE clauses make 10,000 belong to the middle bucket and 100,000 belong to the upper bucket. Using 100.0 avoids integer division in dialects where integer divided by integer truncates.`,
    signals: ["Mutually exclusive CASE", "Boundary correctness", "Window denominator", "Non-integer division"],
    trap: "Using overlapping BETWEEN conditions, or dividing integer counts without forcing decimal arithmetic.",
    followUp: "How would you return zero-count buckets for dates where a bucket has no trades?",
    priority: "Build",
  },
];
