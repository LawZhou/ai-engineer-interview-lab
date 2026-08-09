import type { Card } from "./study-data";

export const codingCards: Card[] = [
  {
    id: "code-merge-intervals",
    category: "Coding",
    question: "Implement Merge Intervals and explain the invariant.",
    code: `def merge_intervals(intervals: list[list[int]]) -> list[list[int]]:
    ...`,
    answer: "Sort intervals by start, then scan from left to right. The output list contains disjoint intervals covering everything processed so far. If the next start is at most the last output end, extend that end; otherwise append a new interval. Sorting costs O(n log n), the scan is O(n), and the output uses O(n) space.",
    signals: ["Sort by start", "Disjoint-output invariant", "Touching-boundary policy", "O(n log n)"],
    trap: "Comparing only adjacent input intervals instead of the current merged interval, which misses nested ranges.",
    followUp: "Should [1, 2] and [2, 3] merge, and how would you make that policy explicit?",
    priority: "Core",
  },
  {
    id: "code-longest-unique-substring",
    category: "Coding",
    question: "Find the longest substring without repeating characters.",
    code: `def longest_unique_substring(text: str) -> int:
    ...`,
    answer: "Use a sliding window with a map from character to its latest index. Move the right edge one character at a time; when a repeated character lies inside the current window, move the left edge to one past its previous index. Each edge advances monotonically, so the algorithm is O(n) time with O(k) space for the character set.",
    signals: ["Sliding window", "Latest index", "Monotonic left edge", "Unicode assumption"],
    trap: "Moving the left edge backward when the previous occurrence is already outside the current window.",
    followUp: "How would you return the substring itself and define behavior for Unicode grapheme clusters?",
    priority: "Core",
  },
  {
    id: "code-top-k-frequent",
    category: "Coding",
    question: "Return the k most frequent values from a large collection.",
    code: `def top_k_frequent(values: list[int], k: int) -> list[int]:
    ...`,
    answer: "Count frequencies in O(n), then keep a min-heap of at most k frequency/value pairs for O(m log k), where m is the number of distinct values. A bucket solution can be O(n) when frequencies are bounded by n but uses more auxiliary space. Define deterministic tie-breaking and validate k against the distinct count.",
    signals: ["Frequency map", "Size-k min-heap", "Distinct-count complexity", "Tie-breaking"],
    trap: "Sorting all distinct values without acknowledging O(m log m), or returning nondeterministic ties.",
    followUp: "How would you estimate top-k for an unbounded stream that cannot fit in memory?",
    priority: "Core",
  },
  {
    id: "code-lru-cache",
    category: "Coding",
    question: "Implement an O(1) LRU cache.",
    code: `class LRUCache:
    def get(self, key: str) -> object | None:
        ...

    def put(self, key: str, value: object) -> None:
        ...`,
    answer: "Combine a hash map for O(1) key lookup with a doubly linked list ordered by recency. Get and put move a node to the most-recent end; inserting beyond capacity removes the least-recent node from both structures. State invariants explicitly: one node per key, map/list membership agrees, and size never exceeds capacity.",
    signals: ["Hash map", "Doubly linked list", "Move-to-front", "Structure invariants"],
    trap: "Using a list alone, which makes lookup or removal O(n), or forgetting to remove evicted keys from the map.",
    followUp: "What changes are required for thread safety, TTLs and memory-based rather than item-based capacity?",
    priority: "Build",
  },
  {
    id: "code-shortest-path-bfs",
    category: "Coding",
    question: "Find the shortest path in an unweighted graph.",
    code: `def shortest_path(
    graph: dict[str, list[str]], start: str, target: str
) -> list[str] | None:
    ...`,
    answer: "Run breadth-first search from start using a queue and mark nodes visited when enqueued. Store each discovered node's parent so the path can be reconstructed once target is found. BFS explores by increasing edge count, giving the shortest unweighted path in O(V + E) time and O(V) space.",
    signals: ["Breadth-first search", "Visit on enqueue", "Parent map", "O(V + E)"],
    trap: "Marking visited only when dequeued, which can enqueue the same node repeatedly and overwrite parents.",
    followUp: "How would the solution change for non-negative weighted edges or a graph too large for one machine?",
    priority: "Core",
  },
  {
    id: "code-bounded-async-workers",
    category: "Coding",
    question: "Implement a bounded asynchronous worker pool.",
    code: `async def process_all(
    items: list[str], worker_count: int
) -> list[Result]:
    ...`,
    answer: "Place indexed work items in a bounded asyncio.Queue, start a fixed number of worker tasks, and have each worker process, record the result by index, call task_done in finally, and handle cancellation. Bounded concurrency protects the dependency and memory. Define failure policy—fail fast, collect errors or retry—and always clean up workers.",
    signals: ["Bounded queue", "Fixed workers", "Ordered results", "Cancellation cleanup"],
    trap: "Creating one task per item with gather, which is not bounded and can overwhelm sockets, memory or the downstream service.",
    followUp: "How would you add per-host limits, timeouts and retry budgets without duplicating successful side effects?",
    priority: "Build",
  },
  {
    id: "code-token-bucket",
    category: "Coding",
    question: "Implement a token-bucket rate limiter.",
    code: `class TokenBucket:
    def allow(self, now: float, cost: float = 1.0) -> bool:
        ...`,
    answer: "Store capacity, refill rate, current tokens and the last refill time. On each request, add elapsed_time times refill_rate, cap at capacity, then deduct cost if enough tokens remain. Use a monotonic clock and synchronize state. Capacity controls burst size while refill rate controls sustained throughput.",
    signals: ["Monotonic clock", "Lazy refill", "Burst capacity", "Atomic update"],
    trap: "Using wall-clock time or updating tokens without synchronization, allowing negative elapsed time or oversubscription.",
    followUp: "How would you implement the limiter consistently across many application instances?",
    priority: "Build",
  },
  {
    id: "code-merge-k-sorted",
    category: "Coding",
    question: "Merge k sorted iterators without loading them fully into memory.",
    code: `def merge_sorted(streams: list[Iterator[int]]) -> Iterator[int]:
    ...`,
    answer: "Prime a min-heap with the first value from each non-empty iterator, storing value, stream index and iterator. Repeatedly pop the smallest value, yield it, then pull and push the next value from that same stream. This uses O(k) memory and O(N log k) time for N total values.",
    signals: ["Min-heap", "Lazy iteration", "O(k) memory", "Stable tie-breaker"],
    trap: "Putting bare iterator objects into heap tuples where equal values cause Python to compare non-orderable objects.",
    followUp: "How would you handle a slow or failing remote iterator without stalling every output?",
    priority: "Build",
  },
  {
    id: "code-dedupe-large-stream",
    category: "Coding",
    question: "Deduplicate a stream that is larger than memory.",
    code: `def unique_records(records: Iterator[Record]) -> Iterator[Record]:
    ...`,
    answer: "First clarify whether exactness, order and the deduplication window matter. Exact global deduplication requires external state: hash-partition records to bounded files and deduplicate each partition, or use a disk-backed key store. For time-window deduplication, expire keys by event time. Bloom filters reduce lookups but introduce false positives unless backed by exact verification.",
    signals: ["Exactness contract", "External partitioning", "Window expiry", "Bloom-filter tradeoff"],
    trap: "Using an in-memory set without addressing unbounded growth, or using a Bloom filter as exact deduplication.",
    followUp: "How would you preserve first-seen order while performing exact disk-backed deduplication?",
    priority: "Advanced",
  },
  {
    id: "code-sql-gaps-islands",
    category: "Coding",
    question: "Write SQL to group consecutive active dates into streaks.",
    code: `-- activity(user_id, active_date)
-- Return each user's streak start, streak end and day count.`,
    answer: "Deduplicate user/date first. For each user, order dates and subtract ROW_NUMBER times a one-day interval; consecutive dates share the same derived group key. Group by user and that key to return MIN date, MAX date and COUNT. State the SQL dialect's date arithmetic and how duplicate events are handled.",
    signals: ["Deduplicate dates", "ROW_NUMBER", "Stable island key", "Dialect-aware date math"],
    trap: "Using LAG only to flag breaks but never carrying a cumulative group identifier into the final aggregation.",
    followUp: "How would you allow weekends or one-day gaps without ending a streak?",
    priority: "Build",
  },
  {
    id: "code-sql-sessionization",
    category: "Coding",
    question: "Sessionize clickstream events with a 30-minute inactivity gap.",
    code: `-- events(user_id, event_time, event_id)
-- Assign a deterministic session number to every event.`,
    answer: "Order events per user by event_time and a deterministic event_id. Use LAG to compare with the prior event, flag a new session when the gap exceeds 30 minutes or no prior event exists, then cumulative-sum the flag over the user partition. Clarify whether exactly 30 minutes starts a new session and which timezone the timestamps use.",
    signals: ["LAG", "Deterministic ordering", "New-session flag", "Cumulative sum"],
    trap: "Omitting a tie-breaker for equal timestamps or mixing local times across daylight-saving transitions.",
    followUp: "How would late-arriving events change previously assigned sessions in an incremental pipeline?",
    priority: "Build",
  },
  {
    id: "code-sql-funnel",
    category: "Coding",
    question: "Write SQL for an ordered signup-to-purchase funnel.",
    code: `-- events(user_id, event_name, event_time)
-- Stages: visit -> signup -> purchase, in order, within 7 days.`,
    answer: "Choose one qualifying timestamp per stage while enforcing order: find the first visit, then the first signup at or after that visit, then the first purchase at or after signup and within seven days of visit. Conditional aggregation can work, but staged CTEs or lateral joins make the ordering contract clearer. Count users at each reached stage using a consistent cohort denominator.",
    signals: ["Ordered stages", "Time window", "One row per user", "Cohort denominator"],
    trap: "Counting users who performed each event independently, even if purchase happened before signup or outside the window.",
    followUp: "How would you support repeated funnels and attribution to the most recent qualifying visit?",
    priority: "Build",
  },
  {
    id: "review-mutable-default",
    category: "Code review",
    question: "Review this Python function. What is wrong and how would you fix it?",
    code: `def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags`,
    answer: "The default list is created once when the function is defined, so calls that omit tags share mutable state. Use None as the sentinel and create a new list inside, or accept an immutable sequence and return a new list. Also decide whether mutating a caller-provided list is part of the contract; copying may be safer.",
    signals: ["Definition-time default", "Shared state", "None sentinel", "Mutation contract"],
    trap: "Fixing only the default while silently retaining surprising mutation of a list supplied by the caller.",
    followUp: "Which other default-value patterns can create hidden shared state?",
    priority: "Core",
  },
  {
    id: "review-blocking-async",
    category: "Code review",
    question: "Review this async endpoint for correctness and scalability.",
    code: `async def fetch_profile(user_id: str):
    response = requests.get(
        f"https://profiles.internal/users/{user_id}",
        timeout=30,
    )
    return response.json()`,
    answer: "requests.get is blocking, so it stalls the event-loop thread and delays unrelated requests. Use an async HTTP client with connection pooling, bounded concurrency and separate connect/read timeouts, or move unavoidable blocking work to a thread. Validate status and schema, propagate cancellation, and define retries only for safe transient failures.",
    signals: ["Event-loop blocking", "Connection pooling", "Timeouts", "Response validation"],
    trap: "Removing async from the function without considering the web framework's worker model and expected concurrency.",
    followUp: "How would you prove the change improves tail latency under load?",
    priority: "Core",
  },
  {
    id: "review-unbounded-gather",
    category: "Code review",
    question: "Review this batch enrichment implementation.",
    code: `async def enrich_all(ids):
    tasks = [enrich_one(item_id) for item_id in ids]
    return await asyncio.gather(*tasks)`,
    answer: "This creates one coroutine/task per ID and allows unbounded downstream concurrency, which can exhaust memory, sockets or API quotas. Use a bounded queue, worker pool or semaphore; define ordering and partial-failure behavior; apply per-call timeout and retry budgets; and handle cancellation. For a huge iterator, avoid materializing all tasks and results.",
    signals: ["Unbounded concurrency", "Backpressure", "Partial failures", "Streaming input"],
    trap: "Adding a semaphore inside enrich_one while still constructing millions of tasks up front.",
    followUp: "What should happen to successful results when one enrichment permanently fails?",
    priority: "Core",
  },
  {
    id: "review-spark-collect",
    category: "Code review",
    question: "Review this Spark transformation before it runs in production.",
    code: `customer_ids = transactions.select("customer_id").distinct().collect()

for row in customer_ids:
    build_customer_report(row.customer_id)`,
    answer: "collect moves every distinct ID to the driver and the Python loop serializes downstream work, risking driver OOM and poor cluster utilization. Keep computation distributed with joins, aggregations, mapPartitions or a partitioned write. If external calls are required, use controlled partition-level batching and idempotency rather than one uncontrolled call per row.",
    signals: ["Driver memory", "Distributed execution", "Partition batching", "External side effects"],
    trap: "Replacing collect with toLocalIterator without addressing the serial loop or external-call design.",
    followUp: "When is collecting to the driver actually acceptable, and how would you enforce that bound?",
    priority: "Build",
  },
  {
    id: "review-retry-side-effect",
    category: "Code review",
    question: "Review this retry logic for a payment-like side effect.",
    code: `for attempt in range(3):
    try:
        return charge_customer(customer_id, amount)
    except TimeoutError:
        time.sleep(2 ** attempt)

raise RuntimeError("charge failed")`,
    answer: "A timeout does not prove the charge failed; retrying without an idempotency key can create duplicates. Generate a stable operation ID, send it to a server that records outcomes, query ambiguous results, and retry only safe failures with jitter and a total deadline. Preserve the original exception and emit an auditable final state.",
    signals: ["Ambiguous timeout", "Idempotency key", "Retry budget", "Outcome reconciliation"],
    trap: "Improving exponential backoff while leaving the duplicate-side-effect risk unchanged.",
    followUp: "How would you recover if the remote service does not support idempotency keys?",
    priority: "Core",
  },
  {
    id: "review-rag-tenant-cache",
    category: "Code review",
    question: "Review this RAG retrieval cache for a multi-tenant application.",
    code: `@cache
def retrieve(query: str):
    return vector_store.search(query, k=8)

def answer(tenant_id: str, query: str):
    chunks = retrieve(query)
    return generate_answer(query, chunks)`,
    answer: "The cache key excludes tenant identity, permissions, index version and possibly user role, so identical queries can reuse another tenant's results. Enforce authorization during retrieval, include the security scope and data version in cache identity, avoid caching sensitive content where unnecessary, and invalidate on permission or document changes. Treat this as a release-blocking data-isolation flaw.",
    signals: ["Cross-tenant leak", "Authorization before retrieval", "Security-scoped key", "Invalidation"],
    trap: "Adding tenant_id to answer while leaving the cached retrieve function keyed only by query.",
    followUp: "What automated test would demonstrate that cache hits cannot cross authorization boundaries?",
    priority: "Core",
  },
  {
    id: "review-ml-preprocessing-leakage",
    category: "Code review",
    question: "Review this model-training code for evaluation validity.",
    code: `scaler = StandardScaler().fit(X)
X_scaled = scaler.transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)`,
    answer: "The scaler is fit on all rows before the split, leaking test-distribution statistics into training. Split first, then fit preprocessing only on training data and apply it to validation/test through a Pipeline. Also check whether random splitting is valid for time, customer or entity leakage and preserve the fitted pipeline as one versioned artifact.",
    signals: ["Fit after split", "Pipeline", "Group/time leakage", "Artifact consistency"],
    trap: "Calling the leakage harmless because scaling does not use y; test features are still informing training transformations.",
    followUp: "How would you structure cross-validation so preprocessing is refit independently inside every fold?",
    priority: "Core",
  },
  {
    id: "review-sql-left-join",
    category: "Code review",
    question: "Review this SQL. Does it preserve customers with no paid orders?",
    code: `SELECT c.customer_id, COUNT(o.order_id) AS paid_orders
FROM customers c
LEFT JOIN orders o
  ON c.customer_id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.customer_id;`,
    answer: "No. The WHERE predicate rejects NULL-extended rows, effectively turning the LEFT JOIN into an inner join. Move the paid-status predicate into the ON clause, then COUNT(o.order_id) returns zero for customers without a matching paid order. Verify whether duplicate order rows or additional joins can inflate the count.",
    signals: ["NULL rejection", "Predicate placement", "COUNT non-null key", "Join cardinality"],
    trap: "Changing COUNT to COUNT(*) while keeping the WHERE clause, which neither restores missing customers nor gives zero correctly.",
    followUp: "How would you return paid revenue and the latest paid-order timestamp in the same query?",
    priority: "Core",
  },
  {
    id: "review-shared-state-race",
    category: "Code review",
    question: "Review this in-memory request counter for concurrency problems.",
    code: `request_counts = {}

def record_request(user_id: str) -> None:
    current = request_counts.get(user_id, 0)
    request_counts[user_id] = current + 1`,
    answer: "The read-modify-write sequence is not atomic, so concurrent requests can lose increments; multiple processes also have separate dictionaries, and state disappears on restart. A lock can fix only single-process correctness. For a distributed service, use a metrics backend or atomic external counter with defined durability and cardinality controls.",
    signals: ["Lost update", "Process boundary", "Atomic counter", "Cardinality"],
    trap: "Assuming the GIL makes the whole multi-step update atomic or consistent across workers.",
    followUp: "Would an exact counter be worth the cost, or would telemetry with sampling be more appropriate?",
    priority: "Build",
  },
  {
    id: "review-error-secrets",
    category: "Code review",
    question: "Review this ingestion error handling.",
    code: `def ingest(payload):
    try:
        warehouse.write(payload)
        return True
    except Exception as exc:
        logger.error("write failed: %s payload=%s", exc, payload)
        return False`,
    answer: "Catching every exception and returning False erases failure type and can let callers treat partial ingestion as handled. Logging the entire payload may expose PII or secrets. Catch expected errors narrowly, distinguish retryable from permanent failures, preserve correlation and safe metadata, redact sensitive fields, propagate or quarantine according to contract, and record an actionable metric.",
    signals: ["Narrow exceptions", "PII-safe logging", "Retry classification", "Failure contract"],
    trap: "Removing the payload from logs but continuing to swallow all exceptions without a reliable failure path.",
    followUp: "What information belongs in a safe, useful ingestion failure event?",
    priority: "Core",
  },
];
