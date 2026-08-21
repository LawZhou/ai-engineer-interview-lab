import type { Card } from "./study-data";

export const hkexSyllabusProblemSolvingCards: Card[] = [
  {
    id: "hkex-problem-basic-first-occurrence",
    category: "HKEX Problem Solving Basic",
    question: "Use binary search to return the first occurrence of a target in a sorted array containing duplicates.",
    code: `def first_occurrence(values: list[int], target: int) -> int:
    """Return the first matching index, or -1."""
    ...

# values=[1, 2, 2, 2, 5], target=2 -> 1
# values=[], target=2 -> -1`,
    answerSeconds: 600,
    answer: `Search for the leftmost position whose value is greater than or equal to the target. After the loop, verify that the position is an actual match.

Reference solution:
def first_occurrence(values: list[int], target: int) -> int:
    left, right = 0, len(values)
    while left < right:
        middle = left + (right - left) // 2
        if values[middle] < target:
            left = middle + 1
        else:
            right = middle
    if left < len(values) and values[left] == target:
        return left
    return -1

The invariant is that the first valid position remains in the half-open interval [left, right). Time is O(log n) and extra space is O(1).`,
    signals: ["Half-open interval", "Left-bound invariant", "Post-loop verification", "O(log n)"],
    trap: "Returning immediately on equality, which may return a later duplicate rather than the first occurrence.",
    followUp: "How would you modify the invariant to return the last occurrence?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-merge-sort",
    category: "HKEX Problem Solving Basic",
    question: "Implement stable merge sort without calling Python's built-in sorting functions.",
    code: `def merge_sort(values: list[int]) -> list[int]:
    """Return a new ascending list; do not mutate values."""
    ...

# [4, 1, 3, 1] -> [1, 1, 3, 4]`,
    answerSeconds: 900,
    answer: `Recursively sort each half, then merge two sorted lists by repeatedly taking the smaller front value. Taking from the left on equality preserves stability.

Reference solution:
def merge_sort(values: list[int]) -> list[int]:
    if len(values) <= 1:
        return values.copy()
    middle = len(values) // 2
    left = merge_sort(values[:middle])
    right = merge_sort(values[middle:])

    merged: list[int] = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged

Time is O(n log n). This straightforward version uses O(n) auxiliary storage plus recursion overhead.`,
    signals: ["Divide and conquer", "Two-pointer merge", "Stable equality rule", "O(n log n)"],
    trap: "Using < instead of <= when equal items carry original-order identity and stability is required.",
    followUp: "Why is merge sort attractive for linked lists and external sorting?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-counting-sort",
    category: "HKEX Problem Solving Basic",
    question: "Implement counting sort for integers in a known bounded range and state when it is a bad choice.",
    code: `def counting_sort(
    values: list[int], minimum: int, maximum: int
) -> list[int]:
    """Every value must be within [minimum, maximum]."""
    ...

# values=[3, 1, 2, 1], minimum=1, maximum=3
# -> [1, 1, 2, 3]`,
    answerSeconds: 720,
    answer: `Allocate one counter per possible value, count the input, then emit each value according to its frequency.

Reference solution:
def counting_sort(
    values: list[int], minimum: int, maximum: int
) -> list[int]:
    if minimum > maximum:
        raise ValueError("invalid range")
    counts = [0] * (maximum - minimum + 1)
    for value in values:
        if not minimum <= value <= maximum:
            raise ValueError(f"out of range: {value}")
        counts[value - minimum] += 1

    result: list[int] = []
    for offset, count in enumerate(counts):
        result.extend([minimum + offset] * count)
    return result

For n values and range width k, time is O(n + k) and auxiliary space is O(k). It is a poor choice when the numeric range is enormous relative to n.`,
    signals: ["Offset indexing", "Frequency array", "O(n + k)", "Range-size limitation"],
    trap: "Calling it O(n) while ignoring the time and memory required for a very large value range.",
    followUp: "How would you modify counting sort to preserve the original order of records with equal keys?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-reverse-linked-list",
    category: "HKEX Problem Solving Basic",
    question: "Reverse a singly linked list in place and return its new head.",
    code: `from dataclasses import dataclass

@dataclass
class Node:
    value: int
    next: "Node | None" = None

def reverse_list(head: Node | None) -> Node | None:
    ...`,
    answerSeconds: 600,
    answer: `Maintain the already-reversed prefix and the first node not yet processed. Save the next pointer before reversing the current link.

Reference solution:
def reverse_list(head: Node | None) -> Node | None:
    previous: Node | None = None
    current = head
    while current is not None:
        following = current.next
        current.next = previous
        previous = current
        current = following
    return previous

Each node is visited once: O(n) time and O(1) extra space. Empty and one-node lists work without special cases.`,
    signals: ["Previous/current pointers", "Save next before mutation", "New head", "O(1) space"],
    trap: "Overwriting current.next before saving the remainder of the original list.",
    followUp: "How would you detect a cycle before reversing a list supplied by an untrusted caller?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-tree-level-order",
    category: "HKEX Problem Solving Basic",
    question: "Traverse a binary tree level by level and return one list of values per depth.",
    code: `from dataclasses import dataclass

@dataclass
class TreeNode:
    value: int
    left: "TreeNode | None" = None
    right: "TreeNode | None" = None

def level_order(root: TreeNode | None) -> list[list[int]]:
    ...`,
    answerSeconds: 720,
    answer: `Breadth-first search uses a queue. At the start of each outer iteration, the queue length is exactly the number of nodes in the current level.

Reference solution:
from collections import deque

def level_order(root: TreeNode | None) -> list[list[int]]:
    if root is None:
        return []
    queue = deque([root])
    result: list[list[int]] = []
    while queue:
        level: list[int] = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.value)
            if node.left is not None:
                queue.append(node.left)
            if node.right is not None:
                queue.append(node.right)
        result.append(level)
    return result

Time is O(n). Queue space is O(w), where w is the tree's maximum width.`,
    signals: ["Queue BFS", "Fixed level size", "Empty-tree behavior", "O(n) traversal"],
    trap: "Iterating directly until the queue is empty inside one level, which consumes newly appended children and collapses all depths together.",
    followUp: "How would you return the levels in alternating left-to-right and right-to-left order?",
    priority: "Core",
  },
  {
    id: "hkex-problem-basic-run-length-encoding",
    category: "HKEX Problem Solving Basic",
    question: "Run-length encode a string as character-count pairs in one traversal.",
    code: `def encode_runs(text: str) -> list[tuple[str, int]]:
    ...

# "AAABBCCCCA" -> [("A", 3), ("B", 2), ("C", 4), ("A", 1)]
# "" -> []`,
    answerSeconds: 600,
    answer: `Track the current character and run length. When the character changes, emit the completed run, then remember to emit the final run after the loop.

Reference solution:
def encode_runs(text: str) -> list[tuple[str, int]]:
    if not text:
        return []
    result: list[tuple[str, int]] = []
    current = text[0]
    count = 1
    for char in text[1:]:
        if char == current:
            count += 1
        else:
            result.append((current, count))
            current = char
            count = 1
    result.append((current, count))
    return result

Time is O(n); output is O(r) for r runs. Returning pairs avoids the ambiguity of concatenating arbitrary characters and multi-digit counts into one undecodable string.`,
    signals: ["Single traversal", "Run-change emission", "Final-run handling", "Empty input"],
    trap: "Forgetting the final run because no following character triggers its emission.",
    followUp: "How would you process a string stream arriving in chunks when one run may cross a chunk boundary?",
    priority: "Core",
  },
  {
    id: "hkex-problem-advanced-tree-diameter",
    category: "HKEX Problem Solving Advanced",
    question: "Return the diameter of a binary tree measured in edges.",
    code: `from dataclasses import dataclass

@dataclass
class TreeNode:
    value: int
    left: "TreeNode | None" = None
    right: "TreeNode | None" = None

def tree_diameter(root: TreeNode | None) -> int:
    ...`,
    answerSeconds: 1200,
    answer: `A post-order traversal returns each subtree's height while updating the best path that passes through the current node. If height is measured in nodes, left height plus right height is the diameter through that node in edges.

Reference solution:
def tree_diameter(root: TreeNode | None) -> int:
    diameter = 0

    def height(node: TreeNode | None) -> int:
        nonlocal diameter
        if node is None:
            return 0
        left_height = height(node.left)
        right_height = height(node.right)
        diameter = max(diameter, left_height + right_height)
        return 1 + max(left_height, right_height)

    height(root)
    return diameter

Time is O(n); recursion space is O(h) for tree height h. A very deep skewed tree may require an iterative traversal to avoid Python's recursion limit.`,
    signals: ["Post-order traversal", "Height subproblem", "Global diameter update", "O(n) time"],
    trap: "Assuming the diameter must pass through the root; the longest path may lie entirely inside one subtree.",
    followUp: "How would you return the actual endpoint-to-endpoint path rather than only its length?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-minimum-coins",
    category: "HKEX Problem Solving Advanced",
    question: "Use dynamic programming to return the minimum number of coins needed to make an amount.",
    code: `def minimum_coins(coins: list[int], amount: int) -> int:
    """Unlimited coins; return -1 when amount is unreachable."""
    ...

# coins=[1, 3, 4], amount=6 -> 2
# coins=[4, 6], amount=5 -> -1`,
    answerSeconds: 1200,
    answer: `Let dp[x] be the minimum coins needed to form amount x. Build solutions from dp[0] upward using previously solved smaller amounts.

Reference solution:
def minimum_coins(coins: list[int], amount: int) -> int:
    if amount < 0:
        raise ValueError("amount must be non-negative")
    if any(coin <= 0 for coin in coins):
        raise ValueError("coins must be positive")
    unreachable = amount + 1
    dp = [unreachable] * (amount + 1)
    dp[0] = 0
    for current in range(1, amount + 1):
        for coin in coins:
            if coin <= current:
                dp[current] = min(dp[current], dp[current - coin] + 1)
    return -1 if dp[amount] == unreachable else dp[amount]

Time is O(amount times number_of_coins); space is O(amount). The greedy choice of the largest coin is not correct for arbitrary denominations.`,
    signals: ["DP state definition", "Base case dp[0]", "Transition from smaller amount", "Unreachable sentinel"],
    trap: "Using a greedy largest-coin strategy for denominations such as [1, 3, 4], where 6 is better as 3 + 3 than 4 + 1 + 1.",
    followUp: "How would the state change if each coin could be used at most once?",
    priority: "Advanced",
  },
  {
    id: "hkex-problem-advanced-edit-distance",
    category: "HKEX Problem Solving Advanced",
    question: "Compute Levenshtein edit distance with a two-dimensional dynamic-programming table.",
    code: `def edit_distance(left: str, right: str) -> int:
    """Allowed operations: insert, delete or replace one character."""
    ...

# edit_distance("kitten", "sitting") -> 3`,
    answerSeconds: 1500,
    answer: `Let dp[i][j] be the minimum edits required to transform the first i characters of left into the first j characters of right. The last operation is a deletion, insertion or replacement unless the final characters already match.

Reference solution:
def edit_distance(left: str, right: str) -> int:
    rows, columns = len(left) + 1, len(right) + 1
    dp = [[0] * columns for _ in range(rows)]
    for i in range(rows):
        dp[i][0] = i
    for j in range(columns):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, columns):
            replacement_cost = 0 if left[i - 1] == right[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + replacement_cost,
            )
    return dp[-1][-1]

Time and space are O(len(left) times len(right)). If only the distance is needed, space can be reduced to two rows, but the full table makes the multidimensional state and reconstruction path explicit.`,
    signals: ["Two-dimensional state", "Boundary initialization", "Three transitions", "O(mn) complexity"],
    trap: "Using a greedy character mismatch count, which cannot model shifts caused by insertions and deletions.",
    followUp: "How would you reconstruct the actual sequence of edits from the table?",
    priority: "Advanced",
  },
];
