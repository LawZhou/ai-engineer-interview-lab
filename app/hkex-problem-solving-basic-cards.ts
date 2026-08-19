import type { Card } from "./study-data";

export const hkexProblemSolvingBasicCards: Card[] = [
  {
    id: "hkex-problem-basic-first-unique-event",
    category: "HKEX Problem Solving Basic",
    question: "Return the first event ID that occurs exactly once, preserving arrival order.",
    code: `def first_unique_event(event_ids: list[str]) -> str | None:
    """Return the earliest ID with frequency one, or None."""
    ...

# ["A", "B", "A", "C", "B", "D"] -> "C"
# [] -> None`,
    answerSeconds: 600,
    answer: `Count once, then scan in original order. A set alone cannot distinguish one occurrence from several and does not encode the required first-arrival rule.

Reference solution:
from collections import Counter

def first_unique_event(event_ids: list[str]) -> str | None:
    counts = Counter(event_ids)
    for event_id in event_ids:
        if counts[event_id] == 1:
            return event_id
    return None

Time is O(n); auxiliary space is O(u) for u distinct IDs. Clarify whether IDs are case-sensitive and whether blank or null IDs are valid before coding.`,
    signals: ["Frequency map", "Second ordered pass", "Empty-input behavior", "O(n) time"],
    trap: "Returning the minimum lexical ID with count one, or relying on set iteration instead of the original arrival order.",
    followUp: "If HKEX events arrive as an unbounded stream, when can you safely declare an ID globally unique?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-missing-sequence-ranges",
    category: "HKEX Problem Solving Basic",
    question: "Compress missing market-data sequence numbers into inclusive ranges.",
    code: `def missing_sequence_ranges(
    observed: list[int], expected_start: int, expected_end: int
) -> list[tuple[int, int]]:
    """observed is sorted, unique, and within the expected bounds."""
    ...

# observed=[100, 101, 104, 107], start=100, end=108
# -> [(102, 103), (105, 106), (108, 108)]`,
    answerSeconds: 720,
    answer: `Maintain the next expected value. Each observed number greater than that value closes one missing range; then advance to one after the observed number. Add a trailing range after the scan.

Reference solution:
def missing_sequence_ranges(
    observed: list[int], expected_start: int, expected_end: int
) -> list[tuple[int, int]]:
    if expected_start > expected_end:
        return []
    result: list[tuple[int, int]] = []
    next_expected = expected_start
    for value in observed:
        if value > next_expected:
            result.append((next_expected, value - 1))
        next_expected = value + 1
    if next_expected <= expected_end:
        result.append((next_expected, expected_end))
    return result

Under the stated sorted/unique contract this is O(n) time and O(r) output space. In production, validate or normalize duplicates, ordering and out-of-range values explicitly.`,
    signals: ["Next-expected invariant", "Inclusive boundaries", "Trailing gap", "O(n) scan"],
    trap: "Emitting every missing integer individually, which can exhaust memory when one outage spans millions of sequence numbers.",
    followUp: "How would HKEX distinguish a real feed gap from a sequence reset at the start of a new session?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-price-time-sort",
    category: "HKEX Problem Solving Basic",
    question: "Implement deterministic price-time priority ordering for one side of an order book.",
    code: `from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal

@dataclass(frozen=True)
class Order:
    order_id: str
    price: Decimal
    received_at: datetime

def order_by_priority(
    orders: list[Order], side: Literal["buy", "sell"]
) -> list[Order]:
    ...

# Buy: higher price first. Sell: lower price first.
# Equal price: earlier received_at, then order_id.`,
    answerSeconds: 600,
    answer: `Encode the complete business ordering in one key. Python sorting is stable, but an explicit final ID makes output deterministic even when upstream order is not stable.

Reference solution:
def order_by_priority(
    orders: list[Order], side: Literal["buy", "sell"]
) -> list[Order]:
    if side == "buy":
        return sorted(
            orders,
            key=lambda order: (-order.price, order.received_at, order.order_id),
        )
    if side == "sell":
        return sorted(
            orders,
            key=lambda order: (order.price, order.received_at, order.order_id),
        )
    raise ValueError("side must be buy or sell")

Sorting is O(n log n) time and O(n) result space. Use timezone-aware comparable timestamps and exact Decimal prices.`,
    signals: ["Side-specific price key", "Time priority", "Deterministic tie-break", "O(n log n)"],
    trap: "Using reverse=True for the entire buy key, which also reverses time and incorrectly gives later orders priority.",
    followUp: "Which HKEX market rules could make this simplified price-time ordering incomplete?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-multiset-reconciliation",
    category: "HKEX Problem Solving Basic",
    question: "Reconcile expected and observed trade IDs while preserving duplicate multiplicity.",
    code: `def reconcile_ids(
    expected: list[str], observed: list[str]
) -> tuple[list[str], list[str]]:
    """Return (missing, unexpected), sorted, including repetitions."""
    ...

# expected=["A", "A", "B"], observed=["A", "B", "B"]
# -> (["A"], ["B"])`,
    answerSeconds: 600,
    answer: `This is multiset subtraction, not set difference. Counter subtraction keeps only positive residual counts, and elements expands each residual back to the required multiplicity.

Reference solution:
from collections import Counter

def reconcile_ids(
    expected: list[str], observed: list[str]
) -> tuple[list[str], list[str]]:
    expected_counts = Counter(expected)
    observed_counts = Counter(observed)
    missing = sorted((expected_counts - observed_counts).elements())
    unexpected = sorted((observed_counts - expected_counts).elements())
    return missing, unexpected

Counting is O(n + m); sorting residual output adds O(r log r). If only control totals are needed, return counts by ID rather than expanding very large residuals.`,
    signals: ["Multiset semantics", "Counter subtraction", "Duplicate preservation", "Complexity tradeoff"],
    trap: "Converting both inputs to sets, which reports presence but hides whether one source contains the wrong number of repeated records.",
    followUp: "What additional HKEX fields would you reconcile when matching IDs alone is insufficient to prove trade equality?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-rolling-average",
    category: "HKEX Problem Solving Basic",
    question: "Compute fixed-window moving averages from exact numeric observations in one pass.",
    code: `from collections.abc import Iterable
from decimal import Decimal

def rolling_average(
    values: Iterable[Decimal], window: int
) -> list[Decimal]:
    """Return averages only for complete windows."""
    ...

# [1, 2, 3, 4], window=3 -> [2, 3] as Decimal values`,
    answerSeconds: 720,
    answer: `Use a deque and a running total so each value enters and leaves once. Validate the window rather than allowing a divide-by-zero or ambiguous result.

Reference solution:
from collections import deque
from collections.abc import Iterable
from decimal import Decimal

def rolling_average(
    values: Iterable[Decimal], window: int
) -> list[Decimal]:
    if window <= 0:
        raise ValueError("window must be positive")
    queue: deque[Decimal] = deque()
    total = Decimal(0)
    result: list[Decimal] = []
    for value in values:
        queue.append(value)
        total += value
        if len(queue) > window:
            total -= queue.popleft()
        if len(queue) == window:
            result.append(total / Decimal(window))
    return result

Time is O(n), working memory is O(window), plus output. Clarify rounding and whether incomplete leading windows should be returned.`,
    signals: ["Deque window", "Running total", "Exact Decimal", "O(n) time"],
    trap: "Re-summing every slice for O(n times window), or silently converting regulated numeric values to binary float.",
    followUp: "How would HKEX define event-time windows when observations arrive late or out of order?",
    priority: "Core",
  },
];
