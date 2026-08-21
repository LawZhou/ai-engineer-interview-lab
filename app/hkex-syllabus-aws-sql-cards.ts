import type { Card } from "./study-data";

export const hkexSyllabusAwsSqlCards: Card[] = [
  {
    id: "hkex-aws-basic-dynamodb-gsi",
    category: "HKEX AWS Basic",
    question: "A DynamoDB table is keyed by customer_id, but the application must also look up a customer efficiently by email. What should you add?",
    code: `Choose ONE
A. Scan the table and add a FilterExpression for email.
B. Add a global secondary index whose partition key is email, then query that index.
C. Store the email address in an EC2 security group.
D. Create one DynamoDB table for each email domain.`,
    answerSeconds: 35,
    answer: "Correct answer: B. A global secondary index provides an additional key-based access pattern and can be queried efficiently by its partition key. A Scan still reads across the table before filtering. Security groups control network traffic, and one table per domain is not a sensible access-pattern design. GSI reads are eventually consistent, so an immediate authoritative read-after-write requirement may need a different key design or a retry contract.",
    signals: ["Answer B", "GSI access pattern", "Query rather than Scan", "Eventually consistent GSI"],
    trap: "Assuming a FilterExpression makes a full-table Scan efficient.",
    followUp: "What attributes would you project into the index, and what read pattern determines that choice?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-quicksight-athena",
    category: "HKEX AWS Advanced",
    question: "Partitioned Parquet trade data is already queryable through Athena. What is the most direct way to build a QuickSight dashboard from it?",
    code: `Choose ONE
A. Create a QuickSight Athena data source and dataset, then use direct query or import the dataset into SPICE.
B. Attach the S3 bucket to QuickSight as an EBS volume.
C. Copy the Parquet files into a Lambda layer and render charts inside Lambda.
D. Put the analysts in an EC2 security group and point the dashboard at that group.`,
    answerSeconds: 45,
    answer: "Correct answer: A. QuickSight can use Athena as a data source for governed tables over S3 data. The dataset can query the source directly or be imported into SPICE depending on freshness, performance and cost requirements. EBS, Lambda layers and EC2 security groups do not provide the stated analytics integration. QuickSight permissions and the Athena/S3 access role must also be configured.",
    signals: ["Answer A", "Athena data source", "QuickSight dataset", "SPICE versus direct query"],
    trap: "Treating network controls or compute packaging as a substitute for an analytics data source.",
    followUp: "When would direct query be preferable to SPICE, and what tradeoff would you accept?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-cli-s3-sync",
    category: "HKEX AWS Advanced",
    question: "Which AWS CLI command uploads a local reports directory to an S3 prefix while transferring only changed files?",
    code: `Choose ONE
A. aws sts get-caller-identity ./reports s3://analytics/reports/
B. aws s3 sync ./reports s3://analytics/reports/
C. aws dms start-replication-task ./reports s3://analytics/reports/
D. aws s3 ls ./reports --upload`,
    answerSeconds: 30,
    answer: "Correct answer: B. aws s3 sync compares the source and destination and copies new or changed objects recursively. STS reports caller identity, DMS migrates databases, and s3 ls lists objects. Before a consequential sync, confirm the active caller and destination, use --dryrun when appropriate, and treat --delete carefully because it removes destination objects absent from the source.",
    signals: ["Answer B", "aws s3 sync", "Changed-file transfer", "Dry-run safety"],
    trap: "Adding --delete casually without checking whether the destination contains files owned by another process.",
    followUp: "Which command should you run first to confirm the active AWS account and role?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-scalar-subquery-share",
    category: "HKEX SQL Intermediate",
    question: "Use a scalar subquery in SELECT to return each market's executed turnover and its percentage of the day's total turnover.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  market text NOT NULL,
  trading_date date NOT NULL,
  turnover numeric NOT NULL,
  status text NOT NULL
)

-- Parameter: $1 = trading_date.
-- Output: market, market_turnover, day_turnover_pct.`,
    answerSeconds: 600,
    answer: `The outer query aggregates at market grain. A scalar subquery in SELECT calculates one day-level denominator that is used by every market row.

Reference SQL:
SELECT t.market,
       SUM(t.turnover) AS market_turnover,
       100.0 * SUM(t.turnover) / NULLIF((
         SELECT SUM(all_t.turnover)
         FROM trades all_t
         WHERE all_t.trading_date = $1
           AND all_t.status = 'EXECUTED'
       ), 0) AS day_turnover_pct
FROM trades t
WHERE t.trading_date = $1
  AND t.status = 'EXECUTED'
GROUP BY t.market
ORDER BY t.market;

The repeated predicates ensure numerator and denominator use the same population. The scalar subquery must return one value; NULLIF defines the zero-denominator behavior.`,
    signals: ["Scalar SELECT subquery", "Matching populations", "Market aggregation", "Zero-denominator handling"],
    trap: "Using a subquery that returns one row per market where the SELECT expression requires one scalar value.",
    followUp: "How would you rewrite this with a window function, and why is that version classified as advanced in the supplied syllabus?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-derived-table-average",
    category: "HKEX SQL Intermediate",
    question: "Use a subquery in FROM to calculate the average executed security turnover within each market for a date.",
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

-- Parameter: $1 = trading_date.
-- Average only securities with at least one qualifying trade.`,
    answerSeconds: 600,
    answer: `The inner derived table produces one row per market and security. The outer query then averages those security-level totals at market grain.

Reference SQL:
SELECT x.market,
       AVG(x.security_turnover) AS average_security_turnover
FROM (
  SELECT market,
         security_id,
         SUM(quantity * price) AS security_turnover
  FROM trades
  WHERE trading_date = $1
    AND status = 'EXECUTED'
  GROUP BY market, security_id
) AS x
GROUP BY x.market
ORDER BY x.market;

AVG(quantity * price) over raw trades would answer a different question: average trade notional rather than average security turnover.`,
    signals: ["FROM subquery", "Two aggregation grains", "Derived-table alias", "Defined average population"],
    trap: "Collapsing the two aggregation levels and accidentally averaging individual trades.",
    followUp: "How would the result change if every listed security, including zero-trade securities, belonged in the average?",
    priority: "Core",
  },
  {
    id: "hkex-sql-intermediate-composite-index",
    category: "HKEX SQL Intermediate",
    question: "Create an index for a query that fetches one security's most recent trades in a time range, then explain how you would prove it helps.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint NOT NULL,
  executed_at timestamptz NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL
)

SELECT trade_id, executed_at, quantity, price
FROM trades
WHERE security_id = $1
  AND executed_at >= $2
  AND executed_at < $3
ORDER BY executed_at DESC, trade_id DESC
LIMIT 100;`,
    answerSeconds: 600,
    answer: `Put the equality column first, followed by the range and ordering columns. Include payload columns only when the workload and database support justify a covering index.

Reference SQL:
CREATE INDEX trades_security_time_idx
ON trades(security_id, executed_at DESC, trade_id DESC)
INCLUDE (quantity, price);

Run EXPLAIN (ANALYZE, BUFFERS) on representative data before and after the index. Look for bounded index access, fewer buffers and acceptable write/storage cost. The optimizer may still prefer a sequential scan for a tiny table or an unselective range; creating an index does not force its use.`,
    signals: ["Equality column first", "Range and order alignment", "EXPLAIN evidence", "Write and storage cost"],
    trap: "Creating separate single-column indexes and assuming the database will always combine them as effectively as the aligned composite index.",
    followUp: "Why might this index become less useful when the query omits security_id?",
    priority: "Build",
  },
  {
    id: "hkex-sql-intermediate-executed-trades-view",
    category: "HKEX SQL Intermediate",
    question: "Create and query a view that exposes executed trades with symbol and calculated turnover.",
    code: `-- PostgreSQL
securities(security_id bigint PRIMARY KEY, symbol text NOT NULL)
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint REFERENCES securities,
  trading_date date NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL,
  status text NOT NULL
)

-- Create executed_trade_values, then return daily turnover by symbol.`,
    answerSeconds: 600,
    answer: `A regular view stores a reusable query definition and can simplify downstream SQL while centralizing the executed-status rule.

Reference SQL:
CREATE OR REPLACE VIEW executed_trade_values AS
SELECT t.trade_id,
       t.trading_date,
       t.security_id,
       s.symbol,
       t.quantity,
       t.price,
       t.quantity * t.price AS turnover
FROM trades t
JOIN securities s ON s.security_id = t.security_id
WHERE t.status = 'EXECUTED';

SELECT trading_date,
       symbol,
       SUM(turnover) AS daily_turnover
FROM executed_trade_values
GROUP BY trading_date, symbol
ORDER BY trading_date, symbol;

A normal view does not normally store or refresh result rows; performance still depends on the underlying query and indexes. Permissions and schema-change dependencies also need governance.`,
    signals: ["CREATE VIEW", "Reusable business rule", "Query through view", "Not materialized by default"],
    trap: "Assuming a normal view automatically caches results or makes an inefficient underlying query fast.",
    followUp: "When would a materialized view be more appropriate, and what freshness problem would it introduce?",
    priority: "Build",
  },
  {
    id: "hkex-sql-intermediate-account-transfer-transaction",
    category: "HKEX SQL Intermediate",
    question: "Write a transaction skeleton that transfers funds between two accounts and records an audit row atomically.",
    code: `-- PostgreSQL
accounts(
  account_id bigint PRIMARY KEY,
  balance numeric NOT NULL CHECK (balance >= 0)
)
transfers(
  transfer_id bigint PRIMARY KEY,
  from_account_id bigint REFERENCES accounts,
  to_account_id bigint REFERENCES accounts,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL
)

-- Parameters: $1 = from_account, $2 = to_account,
--             $3 = amount, $4 = transfer_id.`,
    answerSeconds: 600,
    answer: `All three writes must commit or roll back together. Lock accounts in deterministic order, validate that both exist and the amount is valid, then perform the debit, credit and audit insert.

Reference skeleton:
BEGIN;

SELECT account_id, balance
FROM accounts
WHERE account_id IN ($1, $2)
ORDER BY account_id
FOR UPDATE;

UPDATE accounts
SET balance = balance - $3
WHERE account_id = $1;

UPDATE accounts
SET balance = balance + $3
WHERE account_id = $2;

INSERT INTO transfers(
  transfer_id, from_account_id, to_account_id, amount, created_at
)
VALUES ($4, $1, $2, $3, CURRENT_TIMESTAMP);

COMMIT;

On a missing account, invalid amount, constraint error or any application validation failure, issue ROLLBACK. The nonnegative balance constraint prevents an insufficient-funds debit from committing, while deterministic locking reduces deadlock risk. In real code, check affected-row counts and use an idempotent transfer identifier.`,
    signals: ["BEGIN and COMMIT", "Rollback on failure", "Row locking", "Atomic audit record"],
    trap: "Committing the debit before attempting the credit, leaving balances inconsistent when the second operation fails.",
    followUp: "What isolation anomaly remains possible if the balance is checked outside this transaction?",
    priority: "Build",
  },
  {
    id: "hkex-sql-advanced-function-procedure",
    category: "HKEX SQL Advanced",
    question: "Create a reusable SQL function for trade notional and a stored procedure that rebuilds one day's market summary.",
    code: `-- PostgreSQL
trades(trading_date date, market text, quantity numeric, price numeric, status text)
daily_market_summary(
  trading_date date,
  market text,
  trade_count bigint,
  turnover numeric,
  PRIMARY KEY (trading_date, market)
)

-- The procedure should replace only the requested date.`,
    answerSeconds: 900,
    answer: `Use a pure SQL function for the reusable calculation and a procedure for the multi-statement data-maintenance operation.

Reference SQL:
CREATE OR REPLACE FUNCTION trade_notional(
  p_quantity numeric,
  p_price numeric
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT p_quantity * p_price
$$;

CREATE OR REPLACE PROCEDURE rebuild_daily_market_summary(p_date date)
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM daily_market_summary
  WHERE trading_date = p_date;

  INSERT INTO daily_market_summary(
    trading_date, market, trade_count, turnover
  )
  SELECT trading_date,
         market,
         COUNT(*),
         SUM(trade_notional(quantity, price))
  FROM trades
  WHERE trading_date = p_date
    AND status = 'EXECUTED'
  GROUP BY trading_date, market;
END;
$$;

CALL rebuild_daily_market_summary(DATE '2026-08-20');

Run CALL inside an explicit transaction when the caller needs a clear commit boundary. Define ownership, execution permissions and deployment versioning; reusable database logic can otherwise become an invisible application dependency.`,
    signals: ["Function versus procedure", "Volatility and null contract", "Multi-statement rebuild", "Transactional call boundary"],
    trap: "Marking a function IMMUTABLE when it reads tables or depends on session state, which lets the optimizer make invalid assumptions.",
    followUp: "When would you keep this logic in application or transformation code instead of the database?",
    priority: "Advanced",
  },
  {
    id: "hkex-sql-advanced-trade-allocation-constraints",
    category: "HKEX SQL Advanced",
    question: "Define trade-allocation constraints that enforce identity, parent existence, uniqueness, positive quantity and valid status.",
    code: `-- PostgreSQL
trades(trade_id bigint PRIMARY KEY)

-- Create trade_allocations with:
-- allocation_id identity
-- trade_id parent reference
-- allocation_no unique within a trade
-- positive quantity
-- status limited to PENDING, BOOKED or CANCELLED.`,
    answerSeconds: 720,
    answer: `Put stable row-level invariants in declarative constraints so every writer receives the same protection.

Reference SQL:
CREATE TABLE trade_allocations (
  allocation_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trade_id bigint NOT NULL
    REFERENCES trades(trade_id),
  allocation_no integer NOT NULL,
  quantity numeric NOT NULL
    CHECK (quantity > 0),
  status text NOT NULL
    CHECK (status IN ('PENDING', 'BOOKED', 'CANCELLED')),
  UNIQUE (trade_id, allocation_no)
);

The primary key identifies the allocation, the foreign key rejects orphan allocations, UNIQUE prevents duplicate allocation numbers within one trade, and CHECK constraints reject invalid values. Cross-row rules such as total allocated quantity not exceeding trade quantity require a different design, careful locking or deferred validation; a simple row CHECK cannot query other rows.`,
    signals: ["Primary and foreign keys", "Composite UNIQUE", "CHECK constraints", "Cross-row boundary"],
    trap: "Assuming NOT NULL or an application dropdown alone prevents every invalid status from every writer.",
    followUp: "How would you enforce or validate that allocations sum exactly to the parent trade quantity?",
    priority: "Advanced",
  },
  {
    id: "hkex-sql-advanced-prepared-statement",
    category: "HKEX SQL Advanced",
    question: "Create, execute and deallocate a prepared statement for a parameterized security-and-time-range trade query.",
    code: `-- PostgreSQL
trades(
  trade_id bigint PRIMARY KEY,
  security_id bigint NOT NULL,
  executed_at timestamptz NOT NULL,
  quantity numeric NOT NULL,
  price numeric NOT NULL
)

-- Parameters: security_id, start timestamp, end timestamp.`,
    answerSeconds: 720,
    answer: `Prepare the statement with declared parameter types and placeholders, execute it with values, then deallocate it when the session no longer needs it.

Reference SQL:
PREPARE trades_in_range(bigint, timestamptz, timestamptz) AS
SELECT trade_id, executed_at, quantity, price
FROM trades
WHERE security_id = $1
  AND executed_at >= $2
  AND executed_at < $3
ORDER BY executed_at, trade_id;

EXECUTE trades_in_range(
  7001,
  TIMESTAMPTZ '2026-08-20 09:00:00+08',
  TIMESTAMPTZ '2026-08-20 17:00:00+08'
);

DEALLOCATE trades_in_range;

Parameters separate values from SQL syntax, reducing injection risk and avoiding repeated parsing. They do not parameterize identifiers such as a table or column name; dynamic identifiers require an allowlist and safe identifier construction. Plan reuse can help or hurt depending on data skew and the database's custom-versus-generic plan behavior.`,
    signals: ["PREPARE and typed parameters", "EXECUTE", "DEALLOCATE", "Values not identifiers"],
    trap: "Concatenating user input into SQL because prepared placeholders cannot represent a table name.",
    followUp: "Why can one cached generic plan perform poorly when different security IDs have very different row counts?",
    priority: "Advanced",
  },
];
