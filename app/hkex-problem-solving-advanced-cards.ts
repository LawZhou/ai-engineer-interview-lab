import type { Card } from "./study-data";

export const hkexProblemSolvingAdvancedCards: Card[] = [
  {
    id: "hkex-problem-advanced-dijkstra-latency",
    category: "HKEX Problem Solving Advanced",
    question: "Find the lowest-latency route through a non-negatively weighted data-service graph.",
    code: `def shortest_latency_path(
    graph: dict[str, list[tuple[str, int]]],
    start: str,
    target: str,
) -> tuple[int, list[str]] | None:
    """Edges are (neighbor, latency_ms), with latency_ms >= 0."""
    ...`,
    answerSeconds: 1500,
    answer: `Use Dijkstra's algorithm: the heap stores the best discovered distance, and a node is final when its non-stale minimum entry is popped. Track parents to reconstruct the path.

Reference solution:
from heapq import heappop, heappush

def shortest_latency_path(graph, start, target):
    distances = {start: 0}
    parent: dict[str, str] = {}
    heap = [(0, start)]
    while heap:
        distance, node = heappop(heap)
        if distance != distances.get(node):
            continue
        if node == target:
            path = [target]
            while path[-1] != start:
                path.append(parent[path[-1]])
            path.reverse()
            return distance, path
        for neighbor, weight in graph.get(node, []):
            if weight < 0:
                raise ValueError("negative edge")
            candidate = distance + weight
            if candidate < distances.get(neighbor, float("inf")):
                distances[neighbor] = candidate
                parent[neighbor] = node
                heappush(heap, (candidate, neighbor))
    return None

With a binary heap, time is O((V + E) log V) and space is O(V + E).`,
    signals: ["Min-heap Dijkstra", "Stale-entry skip", "Parent reconstruction", "Non-negative contract"],
    trap: "Using BFS because every edge represents one hop; BFS minimizes hop count, not total weighted latency.",
    followUp: "Why would HKEX avoid routing a real production request solely from periodically measured average latency?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-lineage-cycle",
    category: "HKEX Problem Solving Advanced",
    question: "Return one directed cycle from a dataset-lineage graph, or None when the graph is acyclic.",
    code: `def find_lineage_cycle(
    graph: dict[str, list[str]],
) -> list[str] | None:
    """Return a closed path such as [A, B, C, A]."""
    ...`,
    answerSeconds: 1500,
    answer: `Use DFS colors: unvisited, active on the current recursion path, and finished. An edge to an active node is a back edge. Parent links reconstruct one closed cycle.

Reference solution:
def find_lineage_cycle(graph: dict[str, list[str]]) -> list[str] | None:
    color: dict[str, int] = {}
    parent: dict[str, str] = {}

    def visit(node: str) -> list[str] | None:
        color[node] = 1
        for child in graph.get(node, []):
            state = color.get(child, 0)
            if state == 0:
                parent[child] = node
                cycle = visit(child)
                if cycle is not None:
                    return cycle
            elif state == 1:
                chain = [node]
                while chain[-1] != child:
                    chain.append(parent[chain[-1]])
                chain.reverse()
                chain.append(child)
                return chain
        color[node] = 2
        return None

    nodes = set(graph)
    for children in graph.values():
        nodes.update(children)
    for node in sorted(nodes):
        if color.get(node, 0) == 0:
            cycle = visit(node)
            if cycle is not None:
                return cycle
    return None

Time and space are O(V + E), excluding recursion-stack limits.`,
    signals: ["Three-color DFS", "Back-edge detection", "Closed-path reconstruction", "O(V + E)"],
    trap: "Treating any edge to a previously visited node as a cycle; an edge to a fully finished node can be valid in a DAG.",
    followUp: "How should HKEX quarantine or repair catalog lineage when this finds a cycle in a production dependency graph?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-fenwick-volume",
    category: "HKEX Problem Solving Advanced",
    question: "Implement point updates and inclusive range-volume queries with a Fenwick tree.",
    code: `class VolumeIndex:
    def __init__(self, size: int):
        ...

    def add(self, position: int, delta: int) -> None:
        """0-based point increment."""
        ...

    def range_sum(self, left: int, right: int) -> int:
        """Inclusive 0-based sum."""
        ...`,
    answerSeconds: 1800,
    answer: `A Fenwick tree stores partial sums indexed by the least-significant set bit. Convert the public zero-based position to the internal one-based representation.

Reference solution:
class VolumeIndex:
    def __init__(self, size: int):
        if size < 0:
            raise ValueError("size must be non-negative")
        self._size = size
        self._tree = [0] * (size + 1)

    def add(self, position: int, delta: int) -> None:
        if not 0 <= position < self._size:
            raise IndexError(position)
        index = position + 1
        while index <= self._size:
            self._tree[index] += delta
            index += index & -index

    def _prefix_sum(self, end: int) -> int:
        total = 0
        index = end
        while index > 0:
            total += self._tree[index]
            index -= index & -index
        return total

    def range_sum(self, left: int, right: int) -> int:
        if not 0 <= left <= right < self._size:
            raise IndexError((left, right))
        return self._prefix_sum(right + 1) - self._prefix_sum(left)

Each update or query is O(log n); storage is O(n).`,
    signals: ["One-based internal index", "Least-significant-bit jumps", "Prefix difference", "O(log n) operations"],
    trap: "Mixing zero- and one-based boundaries, especially using prefix(right) minus prefix(left) for an inclusive query.",
    followUp: "Why would HKEX still prefer a database or stream processor over this in-memory structure for authoritative market totals?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-partition-files",
    category: "HKEX Problem Solving Advanced",
    question: "Split ordered files among workers to minimize the largest contiguous workload.",
    code: `def minimum_peak_bytes(file_sizes: list[int], workers: int) -> int:
    """
    Assign every file, in order, to at most workers non-empty contiguous groups.
    Return the minimum possible maximum group sum.
    """
    ...

# [10, 20, 30, 40], workers=2 -> 60`,
    answerSeconds: 1800,
    answer: `Binary-search the answer between the largest file and total bytes. For a proposed limit, a greedy scan using as much as possible per worker minimizes the number of workers required, so feasibility is monotonic.

Reference solution:
def minimum_peak_bytes(file_sizes: list[int], workers: int) -> int:
    if workers <= 0:
        raise ValueError("workers must be positive")
    if not file_sizes:
        return 0
    if any(size < 0 for size in file_sizes):
        raise ValueError("file sizes must be non-negative")

    def feasible(limit: int) -> bool:
        used = 1
        current = 0
        for size in file_sizes:
            if current + size <= limit:
                current += size
            else:
                used += 1
                current = size
                if used > workers:
                    return False
        return True

    low, high = max(file_sizes), sum(file_sizes)
    while low < high:
        middle = (low + high) // 2
        if feasible(middle):
            high = middle
        else:
            low = middle + 1
    return low

Time is O(n log S), where S is the byte-sum search range; working space is O(1).`,
    signals: ["Monotonic feasibility", "Greedy worker count", "Correct search bounds", "O(n log S)"],
    trap: "Greedily balancing only the next file between workers; local balance does not necessarily minimize the global maximum under contiguity.",
    followUp: "Which HKEX data characteristics make file bytes a poor proxy for actual transform time, and how would you improve the cost model?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-kmp-alert-pattern",
    category: "HKEX Problem Solving Advanced",
    question: "Find every occurrence of an alert signature in a long status string, including overlaps, using KMP.",
    code: `def find_pattern(text: str, pattern: str) -> list[int]:
    """Return all zero-based start positions; empty pattern returns []."""
    ...

# text="ABABA", pattern="ABA" -> [0, 2]`,
    answerSeconds: 1800,
    answer: `Precompute the longest-proper-prefix-that-is-also-suffix table. On mismatch, reuse the longest compatible prefix rather than moving the text pointer backward. After a match, fall back through the prefix table so overlaps remain discoverable.

Reference solution:
def find_pattern(text: str, pattern: str) -> list[int]:
    if not pattern:
        return []
    prefix = [0] * len(pattern)
    matched = 0
    for index in range(1, len(pattern)):
        while matched and pattern[index] != pattern[matched]:
            matched = prefix[matched - 1]
        if pattern[index] == pattern[matched]:
            matched += 1
            prefix[index] = matched

    result: list[int] = []
    matched = 0
    for index, char in enumerate(text):
        while matched and char != pattern[matched]:
            matched = prefix[matched - 1]
        if char == pattern[matched]:
            matched += 1
            if matched == len(pattern):
                result.append(index - len(pattern) + 1)
                matched = prefix[matched - 1]
    return result

Time is O(n + m); prefix storage is O(m). State the empty-pattern contract explicitly.`,
    signals: ["Prefix-function construction", "No text backtracking", "Overlap handling", "O(n + m)"],
    trap: "Resetting matched to zero after a full match, which misses overlapping occurrences such as positions 0 and 2 in ABABA.",
    followUp: "How would HKEX adapt this if alert patterns arrive dynamically or the log is chunked across files?",
    priority: "Advanced",
  },
];
