import type { Card } from "./study-data";

export const moxPythonCards: Card[] = [
  {
    id: "mox-python-decorator-async-review",
    category: "Mox Python",
    question: "Common: Review this timing decorator. What breaks for metadata, exceptions and async functions?",
    code: `import time

def timed(func):
    def wrapper(*args, **kwargs):
        started = time.time()
        result = func(*args, **kwargs)
        print(time.time() - started)
        return result
    return wrapper`,
    answerSeconds: 120,
    answer: "A decorator replaces a callable with another callable. This wrapper loses the original name, documentation and signature unless it uses functools.wraps. Wall-clock time can move, so duration measurement should use time.perf_counter. Logging in try/finally records failed calls too. Most importantly, decorating an async function this way measures only creation of the coroutine object, not its execution. Select a synchronous or async wrapper at decoration time with inspect.iscoroutinefunction; the async form must await the target inside the timed try/finally block.",
    signals: ["functools.wraps", "perf_counter", "try/finally", "Await inside async wrapper"],
    trap: "Calling the coroutine without awaiting it, or assuming one synchronous wrapper correctly measures both kinds of callable.",
    followUp: "How would you turn this into @timed(metric_name=\"latency\") without sharing unsafe mutable state between calls?",
    priority: "Core",
  },
  {
    id: "mox-python-mro-diamond-trace",
    category: "Mox Python",
    question: "Tricky: Trace this diamond hierarchy. What is the MRO, what prints, and why is super() not simply ‘call my parent’?",
    code: `class Root:
    def save(self):
        print("Root")

class Left(Root):
    def save(self):
        print("Left")
        super().save()

class Right(Root):
    def save(self):
        print("Right")
        super().save()

class Child(Left, Right):
    def save(self):
        print("Child")
        super().save()

Child().save()`,
    answerSeconds: 120,
    answer: "Child.__mro__ is Child, Left, Right, Root, object, so the output is Child, Left, Right, Root. Python uses C3 linearization to preserve local base ordering and a consistent ordering of shared ancestors. Zero-argument super() creates a proxy that continues lookup after the class where the current method was defined; it does not hard-code one parent. Cooperative multiple inheritance works only when each implementation calls super() once and accepts a compatible method contract.",
    signals: ["C3 linearization", "Exact output", "Next in MRO", "Cooperative methods"],
    trap: "Predicting Child, Left, Root and skipping Right, or directly calling both parents and executing Root twice.",
    followUp: "What happens if Right.save does not call super(), and how would incompatible __init__ signatures break this design?",
    priority: "Build",
  },
  {
    id: "mox-python-bound-method-descriptor",
    category: "Mox Python",
    question: "Common: Why does instance.method() receive self automatically while Class.method(instance) does not?",
    code: `class Parser:
    def parse(self, text):
        return text.strip()

p = Parser()
p.parse(" x ")
Parser.parse(p, " x ")`,
    answerSeconds: 90,
    answer: "A function stored on a class implements the descriptor protocol. Access through an instance calls the function's __get__, producing a bound method that remembers the instance and supplies it as the first argument. Access through the class returns the underlying function, so the caller must pass an instance explicitly. self is only a naming convention, but the binding behavior is part of Python's object model.",
    signals: ["Function descriptor", "__get__", "Bound method", "Explicit class access"],
    trap: "Saying Python injects self based on the parameter name; renaming self does not change binding.",
    followUp: "What object do you get from p.parse, and why can repeatedly creating bound methods matter in callbacks or caches?",
    priority: "Core",
  },
  {
    id: "mox-python-method-kinds",
    category: "Mox Python",
    question: "Common: Compare instance methods, @classmethod and @staticmethod. Which should a polymorphic factory use?",
    answerSeconds: 90,
    answer: "An instance method receives a bound instance and operates on its state. A class method receives the actual class used for the call, so a factory can construct cls(...) and preserve subclass polymorphism. A static method receives neither instance nor class; it is a namespaced helper whose logic belongs with the type. Use the narrowest dependency, but prefer a module-level function when the helper has no meaningful relationship to the class.",
    signals: ["self versus cls", "Polymorphic factory", "No implicit static binding", "Cohesion"],
    trap: "Using @staticmethod for a factory and hard-coding the base class, so subclass calls return the wrong type.",
    followUp: "How do these three forms interact with overriding and super()?",
    priority: "Core",
  },
  {
    id: "mox-python-new-init-immutable",
    category: "Mox Python",
    question: "Common: Explain __new__ versus __init__. Where must validation or normalization happen for an immutable type?",
    answerSeconds: 90,
    answer: "__new__ is a class-level constructor that allocates and returns the instance; __init__ initializes an instance that already exists and must return None. For immutable built-ins such as tuple or str, the value is fixed before __init__, so normalization must happen in __new__ and be passed to the base constructor. __new__ may also return an instance of another type, in which case the original class's __init__ is not run.",
    signals: ["Allocate versus initialize", "Immutable construction", "Return contract", "Base __new__"],
    trap: "Trying to replace an immutable value in __init__, or returning the instance from __init__.",
    followUp: "Why is __new__ usually unnecessary for ordinary mutable application classes?",
    priority: "Core",
  },
  {
    id: "mox-python-call-by-sharing",
    category: "Mox Python",
    question: "Common: Is Python pass-by-value or pass-by-reference? Predict the caller-visible changes here.",
    code: `def update(items, count):
    items.append("posted")
    count += 1

events = []
total = 0
update(events, total)`,
    answerSeconds: 90,
    answer: "Python uses call by sharing: parameters become local names bound to the same objects supplied by the caller. append mutates the shared list, so events becomes ['posted']. count += 1 creates and rebinds a new integer locally because integers are immutable, so total remains 0. The key distinction is mutation of an object versus rebinding a local name, not a universal pass-by-reference label.",
    signals: ["Object references", "Mutation", "Local rebinding", "Immutable integer"],
    trap: "Claiming every argument is copied, or that assigning a parameter can rebind the caller's variable.",
    followUp: "How would the result change if update used items = items + [\"posted\"] instead of append?",
    priority: "Core",
  },
  {
    id: "mox-python-mutable-default-sentinel",
    category: "Mox Python",
    question: "Common: Why is this default argument stateful across calls, and when is None an insufficient replacement?",
    code: `def collect(event, events=[]):
    events.append(event)
    return events`,
    answerSeconds: 90,
    answer: "Default expressions are evaluated once when the def statement executes, so every call that omits events shares the same list. Use None and allocate inside the function when None is not a meaningful input. If callers must be able to pass None deliberately, use a unique module-level sentinel object so omitted and explicit None remain distinguishable. The same issue applies to mutable dataclass fields, where default_factory is required.",
    signals: ["Definition-time evaluation", "Shared object", "None or sentinel", "default_factory"],
    trap: "Clearing the shared list at the end; exceptions, recursion and concurrent calls still make that design unsafe.",
    followUp: "Which immutable-looking defaults can still hide mutable state or references?",
    priority: "Core",
  },
  {
    id: "mox-python-copy-aliasing",
    category: "Mox Python",
    question: "Common: Explain shallow copy, deep copy and the aliasing bug in this matrix.",
    code: `rows = [[0] * 3] * 3
rows[0][1] = 7

shallow = rows.copy()`,
    answerSeconds: 90,
    answer: "Sequence repetition copies references, not nested lists, so all three rows point to the same inner list and every row shows the 7. rows.copy() creates a new outer list but preserves those inner references. A deep copy recursively copies supported nested objects, but it can be expensive or semantically wrong for files, locks, database connections or intentionally shared objects. Build independent rows with a comprehension when that is the intended structure.",
    signals: ["Reference aliasing", "Shallow outer copy", "Deep-copy limits", "List comprehension fix"],
    trap: "Assuming copy() or slicing recursively duplicates a nested object graph.",
    followUp: "How does copy.deepcopy handle cycles, and why might a custom class define __copy__ or __deepcopy__?",
    priority: "Core",
  },
  {
    id: "mox-python-is-versus-equality",
    category: "Mox Python",
    question: "Common: When should you use is instead of ==, and why are string or integer interning examples misleading?",
    answerSeconds: 75,
    answer: "is tests object identity; == asks objects for value equality through __eq__. Use is for singletons such as None and for a private sentinel whose identity defines its meaning. Some integers and strings may be interned, but that is an implementation optimization and must never be used as a value comparison contract. Equality can execute user code and may return NotImplemented for unsupported types.",
    signals: ["Identity", "Value equality", "None and sentinels", "Interning is not a contract"],
    trap: "Using is for numbers or strings because a small example happened to return True.",
    followUp: "What should __eq__ return when it cannot compare the other type, and why?",
    priority: "Core",
  },
  {
    id: "mox-python-equality-hash-contract",
    category: "Mox Python",
    question: "Tricky: What contract must __eq__ and __hash__ obey for dict and set keys?",
    answerSeconds: 90,
    answer: "Objects that compare equal must have the same hash for their lifetime. A key's equality-relevant state therefore must not change while it is stored in a dict or set, or lookup may search the wrong bucket. Defining __eq__ on a normal mutable class usually makes it unhashable unless a deliberate hash is supplied. Prefer immutable value objects for value-based keys; identity-based mutable objects can retain the default object equality and hash.",
    signals: ["Equal implies same hash", "Stable key state", "Mutable key danger", "Value object"],
    trap: "Hashing mutable fields or adding unsafe_hash merely to silence an unhashable-type error.",
    followUp: "How do dataclass settings eq, frozen and unsafe_hash affect this contract?",
    priority: "Build",
  },
  {
    id: "mox-python-closure-late-binding",
    category: "Mox Python",
    question: "Tricky: Why do all of these callbacks return the same value, and how do you fix them?",
    code: `callbacks = []
for i in range(3):
    callbacks.append(lambda: i)

print([fn() for fn in callbacks])`,
    answerSeconds: 90,
    answer: "Closures capture a variable cell, not a snapshot of its value. The callbacks run after the loop, when i is 2, so the result is [2, 2, 2]. Bind the current value at creation time with lambda i=i: i or create each closure through a factory that receives i. nonlocal allows a nested function to rebind a captured enclosing variable; global targets module scope instead.",
    signals: ["Late binding", "Captured cell", "Default-argument binding", "nonlocal distinction"],
    trap: "Calling this an asynchronous race; the behavior is deterministic even in a single thread.",
    followUp: "Why can a closure keep a large object alive long after the outer function returns?",
    priority: "Build",
  },
  {
    id: "mox-python-iterator-generator-exhaustion",
    category: "Mox Python",
    question: "Common: Compare iterable, iterator and generator. Why can a second pass silently return no rows?",
    answerSeconds: 90,
    answer: "An iterable can produce an iterator via iter(). An iterator owns traversal state, returns itself from __iter__, and raises StopIteration when exhausted. A generator is an iterator created by a generator function or expression; yield suspends its frame between values. Iterators are normally one-pass, so a second loop sees exhaustion. APIs should document one-shot inputs, avoid probing them with list or sum unless materialization is intended, and request a factory when independent passes are required.",
    signals: ["__iter__", "__next__", "StopIteration", "One-pass state"],
    trap: "Treating every iterable as reusable because lists are reusable.",
    followUp: "How would itertools.tee change memory usage if one consumer runs far ahead of the other?",
    priority: "Core",
  },
  {
    id: "mox-python-context-manager-suppression",
    category: "Mox Python",
    question: "Common: What do __enter__ and __exit__ guarantee, and how can a context manager accidentally hide a failure?",
    answerSeconds: 90,
    answer: "A with statement evaluates the manager, calls __enter__, and calls __exit__ on every normal or exceptional exit after entry succeeds. __exit__ receives exception details; returning a truthy value suppresses that exception, while false lets it propagate. Resource cleanup belongs in __exit__ or in a try/finally inside contextlib.contextmanager. Acquisition that fails before __enter__ completes needs its own cleanup plan.",
    signals: ["Deterministic cleanup", "Exception details", "Truthy suppression", "try/finally"],
    trap: "Returning True unconditionally from __exit__ and silently converting production failures into apparent success.",
    followUp: "When would contextlib.ExitStack be safer than deeply nested with statements?",
    priority: "Core",
  },
  {
    id: "mox-python-finally-return-trap",
    category: "Mox Python",
    question: "Tricky: What does this function return, and what happens to the exception?",
    code: `def result():
    try:
        raise ValueError("bad data")
    finally:
        return "ok"`,
    answerSeconds: 75,
    answer: "It returns 'ok'. A return executed in finally overrides an earlier return and suppresses an active exception, which makes this pattern especially dangerous. finally should perform cleanup without changing control flow. Use except only for errors you can handle, else for success-only work after the try block, and preserve the original traceback with bare raise when rethrowing the current exception.",
    signals: ["Returns ok", "Exception suppressed", "Cleanup-only finally", "Bare raise"],
    trap: "Saying finally runs after the exception propagates; it runs while control flow is still being resolved.",
    followUp: "How does raise new_error from original_error improve a data-pipeline failure report?",
    priority: "Build",
  },
  {
    id: "mox-python-dataclass-semantics",
    category: "Mox Python",
    question: "Common: Explain dataclass defaults, equality, ordering, frozen objects and hash generation.",
    answerSeconds: 120,
    answer: "@dataclass generates methods from annotated fields, commonly __init__, __repr__ and value-based __eq__. Mutable fields need field(default_factory=...) so each instance gets independent state. frozen=True blocks ordinary attribute assignment but is not deep immutability: referenced lists can still mutate. With the defaults, eq=True plus frozen=True generates a field-based hash, eq=True plus frozen=False makes instances unhashable, and eq=False leaves the inherited hash behavior. unsafe_hash should be rare. order=True generates comparisons in field order, which may not match business ordering.",
    signals: ["Generated methods", "default_factory", "Not deeply frozen", "Safe hash semantics"],
    trap: "Assuming frozen recursively freezes nested objects or that field order automatically represents domain ordering.",
    followUp: "When would a plain class, NamedTuple or attrs/Pydantic model be a better choice?",
    priority: "Core",
  },
  {
    id: "mox-python-sort-stability-key",
    category: "Mox Python",
    question: "Common: Explain Python sort stability, key functions and why sorting a huge file is a different problem.",
    answerSeconds: 90,
    answer: "list.sort mutates a list; sorted accepts any iterable and returns a new list. Python's sort is stable, so records equal on the current key retain their prior relative order, enabling deliberate multi-pass sorts. A key function is evaluated once per element and is usually clearer and faster than a comparator adapter. In-memory sorting is O(n log n) worst-case and O(n) extra key/reference space in the general case; data larger than memory needs external sorted runs and a k-way merge.",
    signals: ["Stable ordering", "Key once per item", "In-place versus new list", "External merge boundary"],
    trap: "Building a key that mixes incomparable None, string and datetime values without an explicit missing-value policy.",
    followUp: "How would you make equal timestamps deterministic across repeated external-sort runs?",
    priority: "Core",
  },
  {
    id: "mox-python-mutate-during-iteration",
    category: "Mox Python",
    question: "Tricky: Why is changing a dict or set while iterating unsafe, and what are the deliberate alternatives?",
    answerSeconds: 75,
    answer: "Dict and set iterators depend on the container's structure; changing its size during iteration raises RuntimeError rather than defining a shifting traversal. Iterate over list(mapping.items()) or list(mapping) when a bounded snapshot is acceptable, collect keys to change and apply them afterward, or build a new mapping with a comprehension. Updating an existing dict value without changing size is currently allowed but can still make reasoning unclear and is not a substitute for synchronization.",
    signals: ["Structural mutation", "RuntimeError", "Snapshot or two-phase change", "Concurrency separate"],
    trap: "Catching RuntimeError and retrying, which can create non-deterministic work and duplicate side effects.",
    followUp: "Why does taking a list snapshot not make concurrent access to the underlying objects thread-safe?",
    priority: "Build",
  },
  {
    id: "mox-python-getattribute-getattr",
    category: "Mox Python",
    question: "Tricky: Compare __getattribute__ and __getattr__. How does a naive implementation recurse forever?",
    answerSeconds: 90,
    answer: "__getattribute__ intercepts every instance attribute read. __getattr__ is a fallback called only after normal lookup raises AttributeError. Code inside __getattribute__ that reads self.some_name invokes __getattribute__ again and can recurse; delegate with object.__getattribute__(self, name). Preserve AttributeError for truly missing attributes because hasattr, getattr defaults, serializers and frameworks depend on that protocol.",
    signals: ["All reads versus fallback", "AttributeError contract", "object.__getattribute__", "Recursion risk"],
    trap: "Returning None for every missing attribute, which makes typos look valid and breaks introspection semantics.",
    followUp: "Where do data descriptors and instance __dict__ appear in normal attribute lookup order?",
    priority: "Advanced",
  },
  {
    id: "mox-python-descriptor-property",
    category: "Mox Python",
    question: "Tricky: What is the descriptor protocol, and how do functions, property and many ORMs use it?",
    answerSeconds: 120,
    answer: "An object stored on a class can customize attribute access with __get__, __set__ or __delete__. A descriptor defining __set__ or __delete__ is a data descriptor and normally takes precedence over the instance dictionary; a non-data descriptor can be shadowed by an instance attribute. Functions use __get__ to create bound methods, property is a data descriptor, and ORMs use descriptors to validate, track or lazily load fields. Descriptor state should usually be keyed by instance or stored on the instance, not shared accidentally on the descriptor object.",
    signals: ["__get__/__set__", "Data descriptor precedence", "Bound methods", "Per-instance state"],
    trap: "Storing the current field value directly on one descriptor instance and leaking it across every model instance.",
    followUp: "How does __set_name__ help a reusable validating descriptor know its public field name?",
    priority: "Advanced",
  },
  {
    id: "mox-python-slots-tradeoffs",
    category: "Mox Python",
    question: "Tricky: What does __slots__ change, and why is it neither a security feature nor automatic immutability?",
    answerSeconds: 90,
    answer: "__slots__ declares per-instance storage names and can avoid an instance __dict__, reducing memory when creating many small objects. When no class in the hierarchy supplies __dict__, it also prevents arbitrary new attributes by accident. It does not prevent changes to declared attributes and is not an access-control boundary. Inheritance, multiple inheritance, pickling, tooling and weak references need care; include __weakref__ when weak references are required. Measure memory before accepting the extra design constraints.",
    signals: ["Per-instance storage", "Measured memory benefit", "Inheritance caveats", "Not immutable"],
    trap: "Adding __slots__ to a few long-lived service objects where the complexity provides no material benefit.",
    followUp: "What happens if a subclass does not declare slots, or if a base and subclass repeat the same slot name?",
    priority: "Advanced",
  },
  {
    id: "mox-python-protocol-abc",
    category: "Mox Python",
    question: "Common: Compare duck typing, typing.Protocol and abc.ABC for a pluggable data source.",
    answerSeconds: 90,
    answer: "Duck typing accepts any object with the needed behavior at runtime. Protocol expresses that structural contract to static type checkers without requiring inheritance, which is useful for adapters and third-party implementations. ABC provides nominal membership and can require abstract methods before a subclass is instantiated; it is useful when shared implementation or explicit registration matters. Neither static typing nor an ABC alone validates external data at runtime.",
    signals: ["Structural typing", "Nominal contract", "Static versus runtime", "Adapter use case"],
    trap: "Requiring every implementation to inherit a framework base class when only a small behavioral interface is needed.",
    followUp: "What can @runtime_checkable Protocol verify, and what important details can it not verify?",
    priority: "Core",
  },
  {
    id: "mox-python-typing-runtime-limits",
    category: "Mox Python",
    question: "Tricky: Do Python type hints enforce types at runtime? Explain Any, object and a generic TypeVar.",
    answerSeconds: 90,
    answer: "Annotations are metadata; normal Python execution does not enforce them. Static checkers use them before runtime, while boundaries still need explicit parsing and validation. Any opts out of meaningful checking in both directions; object safely accepts any value but requires narrowing before type-specific operations. A TypeVar relates types across positions—for example, returning the same item type received—rather than meaning any arbitrary type. Overly broad casts can silence the checker without making code safe.",
    signals: ["No automatic runtime enforcement", "Any versus object", "Type relationship", "Boundary validation"],
    trap: "Treating a successful mypy or pyright run as proof that JSON, database rows or API payloads satisfy the schema.",
    followUp: "When would overload, ParamSpec or a bounded TypeVar improve the signature of a decorator or repository?",
    priority: "Build",
  },
  {
    id: "mox-python-import-execution",
    category: "Mox Python",
    question: "Common: What happens during import, why do circular imports fail, and what does the __main__ guard protect?",
    answerSeconds: 90,
    answer: "On first import, Python creates a module object, places it in sys.modules, then executes its top-level code. Later imports normally reuse that cached object. A cycle can observe a partially initialized module before a required name is defined. Fix the dependency direction or move shared contracts to a lower-level module; local imports are a tactical escape, not always the design. The if __name__ == '__main__' guard prevents script-only side effects when the module is imported and is important when worker processes import the main module.",
    signals: ["Top-level execution", "sys.modules cache", "Partial initialization", "Main guard"],
    trap: "Solving every cycle by duplicating imports inside functions while leaving the architectural cycle intact.",
    followUp: "Why can module-level network clients, environment reads or logging configuration make tests and multiprocessing brittle?",
    priority: "Core",
  },
  {
    id: "mox-python-pytest-boundaries",
    category: "Mox Python",
    question: "Common: Design focused pytest coverage for a function that reads an API, transforms rows and writes a database batch.",
    answerSeconds: 120,
    answer: "Separate pure transformation logic from I/O. Use parametrization for normal and boundary records, fixtures for explicit reusable setup, and a fake or autospecced mock at the client boundary to control timeouts, pagination and malformed responses. Assert transformed values and the write contract, not private call sequences. Add a small integration test against a disposable database for schema, transaction and driver behavior. Test retries with deterministic time and verify that a repeated run is idempotent.",
    signals: ["Pure core", "Parametrized edges", "Boundary fake or spec", "Integration and idempotency"],
    trap: "Mocking every internal function so refactoring breaks tests while real serialization or transaction errors remain invisible.",
    followUp: "When would monkeypatch be appropriate, and how do you ensure it cannot leak state into another test?",
    priority: "Core",
  },
  {
    id: "mox-python-pickle-security",
    category: "Mox Python",
    question: "Tricky: Is pickle safe for cached jobs, model artifacts or queue messages from another system?",
    answerSeconds: 90,
    answer: "No untrusted pickle is safe: unpickling can invoke attacker-controlled callables and execute arbitrary code. Signing detects unauthorized modification only if key handling and verification are correct; it does not make an artifact from an untrusted producer safe. Prefer constrained formats such as JSON, Parquet or a schema-based protocol, validate fields and versions, and restrict artifact provenance and storage permissions. Even trusted pickles are Python-specific and fragile across code or dependency changes.",
    signals: ["Code execution risk", "Trusted provenance", "Schema-based alternative", "Version fragility"],
    trap: "Using a restricted-looking file extension or catching UnpicklingError as though either creates a security boundary.",
    followUp: "How would you migrate an existing production cache that already contains pickle payloads?",
    priority: "Advanced",
  },
  {
    id: "mox-python-memory-gc-weakref",
    category: "Mox Python",
    question: "Tricky: Explain reference counting, cyclic garbage collection and a Python memory leak that is not unreachable garbage.",
    answerSeconds: 120,
    answer: "CPython primarily releases objects when their reference count reaches zero and uses a cyclic collector for unreachable reference cycles. That does not help when objects remain reachable through an unbounded cache, global registry, callback, task, closure or queue; logically dead but reachable data is a common leak. weakref can observe or cache an object without keeping it alive, when the type supports weak references. Diagnose with repeatable workloads, tracemalloc snapshots, object counts and allocation tracebacks rather than calling gc.collect as a cure.",
    signals: ["Reference counting", "Cycle collector", "Reachable retention", "tracemalloc evidence"],
    trap: "Assuming rising RSS proves the garbage collector is broken; allocators may retain arenas and live references may be the real cause.",
    followUp: "Why can a bound method registered as a long-lived callback keep an entire service object alive?",
    priority: "Advanced",
  },
  {
    id: "mox-python-gil-race-condition",
    category: "Mox Python",
    question: "Tricky: Can this lose updates even with the GIL? Explain the correct synchronization boundary.",
    code: `balances[account_id] = balances.get(account_id, 0) + amount`,
    answerSeconds: 90,
    answer: "Yes. The expression performs multiple lookups, arithmetic and assignment steps, so a thread can observe stale state and overwrite another update; the GIL is not a business transaction or a guarantee that compound operations are atomic. Protect the complete invariant with a lock, serialize updates through a single-owner queue, or use a database atomic update or transaction. The correct boundary may include validation, deduplication and ledger write—not merely one dict assignment.",
    signals: ["Compound read-modify-write", "GIL is not transactionality", "Invariant-sized lock", "Durable atomic option"],
    trap: "Relying on one CPython bytecode or built-in operation being atomic as a portable correctness contract.",
    followUp: "How would this design change across multiple worker processes or service replicas?",
    priority: "Build",
  },
  {
    id: "mox-python-taskgroup-gather",
    category: "Mox Python",
    question: "Tricky: Compare asyncio.TaskGroup with gather when one child fails. Which gives structured concurrency?",
    answerSeconds: 120,
    answer: "TaskGroup owns a lexical group of tasks: when one child fails with a non-cancellation exception, it cancels the remaining children, waits for them to finish cleanup, and raises the failures as an ExceptionGroup. gather preserves result ordering, but with its default behavior it propagates the first exception to the waiter without providing the same fail-together ownership; other submitted awaitables are not automatically cancelled just because that exception was propagated. Use return_exceptions=True only when exceptions are expected result values and every result will be inspected.",
    signals: ["Structured lifetime", "Sibling cancellation", "ExceptionGroup", "gather result ordering"],
    trap: "Launching orphan tasks with create_task and losing their exceptions, cancellation and shutdown ownership.",
    followUp: "How would except* handle only one exception type from a TaskGroup while preserving the others?",
    priority: "Advanced",
  },
  {
    id: "mox-python-cancellation-cleanup",
    category: "Mox Python",
    question: "Tricky: An async worker catches BaseException and continues. Why can shutdown and timeouts hang?",
    answerSeconds: 90,
    answer: "Task cancellation is delivered by raising asyncio.CancelledError at an await point. In current Python it derives from BaseException, so a broad BaseException handler can swallow the cancellation request and keep the task alive. Put cleanup in finally, release locks and connections promptly, and normally re-raise cancellation after cleanup. Common asyncio timeout mechanisms are implemented through cancellation, so code must be cancellation-safe; shielding should be narrow and still retain a handle to the protected task.",
    signals: ["Cancellation at await", "BaseException danger", "Cleanup then re-raise", "Timeout cancels work"],
    trap: "Treating cancellation as an ordinary recoverable error and immediately restarting the same operation during service shutdown.",
    followUp: "What happens if blocking synchronous code never reaches an await after cancellation is requested?",
    priority: "Advanced",
  },
  {
    id: "mox-python-lru-cache-pitfalls",
    category: "Mox Python",
    question: "Tricky: When can functools.lru_cache return stale data, retain memory or break an async function?",
    answerSeconds: 120,
    answer: "Cache keys come from hashable arguments, so omitted context such as tenant, permissions, locale or source version can return the wrong result. Cached arguments and return values are strongly referenced until eviction or cache_clear, and maxsize=None grows without bound. lru_cache on an async function caches the coroutine object, which cannot normally be awaited twice, not each completed result. It also does not guarantee only one computation for concurrent misses. Define freshness, isolation, size and invalidation explicitly, and use an async-aware cache when needed.",
    signals: ["Complete cache key", "Strong references", "Coroutine reuse bug", "Concurrent miss duplication"],
    trap: "Adding @lru_cache to an I/O lookup without an invalidation or tenant-isolation contract.",
    followUp: "How would you prevent a cache stampede when one popular key expires?",
    priority: "Advanced",
  },
  {
    id: "mox-python-contextvars-request-state",
    category: "Mox Python",
    question: "Tricky: Why can thread-local request state leak between asyncio tasks, and when should you use contextvars?",
    answerSeconds: 90,
    answer: "Many asyncio tasks share one operating-system thread, so thread-local storage cannot distinguish request A from request B on that event-loop thread. ContextVar provides context-local values that propagate across normal async task creation while keeping each task's context isolated. It is useful for correlation IDs or request-scoped logging metadata, but dependencies and authorization should still be passed explicitly when hiding them would weaken clarity. Save and reset the token in finally when setting temporary context.",
    signals: ["Tasks share a thread", "Context-local isolation", "Propagation", "Token reset"],
    trap: "Using a ContextVar as a mutable global bag and assuming child-thread or process propagation is automatic in every execution path.",
    followUp: "How would you prove with a concurrent test that two request IDs cannot contaminate each other's logs?",
    priority: "Advanced",
  },
  {
    id: "mox-python-concurrency-selection",
    category: "Mox Python",
    question: "Common: Choose asyncio, threads or processes for API calls, a blocking SDK, and CPU-heavy parsing.",
    answerSeconds: 120,
    answer: "Use asyncio when the stack is async end to end and the workload waits on many I/O operations. Use a bounded thread pool to integrate blocking I/O libraries, because threads share memory and blocking calls can run while others wait. Use processes for CPU-bound pure-Python work that must run in parallel, accepting serialization, startup and memory costs. Native extensions may release the GIL, so measurement can change the choice. In every model, bound admission, propagate deadlines, collect failures and design shutdown deliberately.",
    signals: ["Workload classification", "Blocking-library boundary", "Process overhead", "Bounded execution"],
    trap: "Choosing by request count alone or submitting unbounded work to an executor and moving the overload into a queue.",
    followUp: "Which objects cannot safely cross a process boundary, and how would you benchmark the crossover point?",
    priority: "Core",
  },
  {
    id: "mox-python-function-signatures",
    category: "Mox Python",
    question: "Common: Explain positional-only, keyword-only, *args and **kwargs. How can a careful signature make an API safer to evolve?",
    code: `def transfer(account_id, /, amount, *, currency="HKD", dry_run=False):
    ...`,
    answerSeconds: 90,
    answer: "Parameters before / are positional-only, so callers cannot depend on their internal names. Parameters after a bare * are keyword-only, making consequential options visible at the call site and allowing new options without positional ambiguity. *args collects extra positional arguments and **kwargs collects unmatched keywords, but accepting either casually can hide typos and weaken tooling. Defaults are evaluated at definition time. Across positional parameters, once one has a default, later positional parameters must too; keyword-only parameters may be required or optional in either order.",
    signals: ["/ positional-only", "* keyword-only", "Visible call-site intent", "Avoid catch-all misuse"],
    trap: "Adding **kwargs merely for future flexibility, then silently accepting a misspelled safety option.",
    followUp: "How would you deprecate a positional argument and move callers toward a keyword-only form without one breaking release?",
    priority: "Core",
  },
  {
    id: "mox-python-decorator-order",
    category: "Mox Python",
    question: "Tricky: Expand these stacked decorators into ordinary calls. Which behavior occurs once per operation versus once per retry?",
    code: `@audit
@retry(attempts=3)
@authorize
def transfer(command):
    ...`,
    answerSeconds: 120,
    answer: "The definition becomes transfer = audit(retry(attempts=3)(authorize(transfer))). Decorator expressions are evaluated as the definition is executed and wrappers are applied from the bottom upward; at call time the outer audit wrapper runs first. Here audit surrounds the whole retry operation, while authorize is invoked inside every retry attempt. Moving audit inside retry could emit one record per attempt, and moving authorization outside retry would check once. Define that policy deliberately because order changes security, metrics and side effects.",
    signals: ["Bottom-up application", "Exact expansion", "Outer wrapper runs first", "Policy changes with order"],
    trap: "Saying the order is cosmetic or adding retry around a non-idempotent transfer without an idempotency contract.",
    followUp: "Where should transaction boundaries and idempotency-key handling sit in this stack?",
    priority: "Build",
  },
  {
    id: "mox-python-cooperative-init",
    category: "Mox Python",
    question: "Tricky: Review this mixin. Why might BaseClient never initialize in a multiple-inheritance class?",
    code: `class AuditMixin:
    def __init__(self, **kwargs):
        self.audit_events = []
        # chain stops here

class BaseClient:
    def __init__(self, *, endpoint, **kwargs):
        self.endpoint = endpoint
        super().__init__(**kwargs)

class BankClient(AuditMixin, BaseClient):
    pass`,
    answerSeconds: 120,
    answer: "BankClient follows the MRO BankClient, AuditMixin, BaseClient, object. AuditMixin consumes the call but never calls super().__init__, so BaseClient does not set endpoint. In a cooperative hierarchy, every participant handles only its own keyword arguments, forwards the rest with super(), and terminates with a compatible base. Directly naming BaseClient would bypass other classes that may appear later in the MRO and makes the mixin less reusable.",
    signals: ["Trace the MRO", "Chain stops", "Consume and forward kwargs", "No named-parent call"],
    trap: "Adding BaseClient.__init__ directly inside AuditMixin and creating skipped or double initialization in a different hierarchy.",
    followUp: "How would you make unexpected leftover keyword arguments fail clearly at the end of the cooperative chain?",
    priority: "Advanced",
  },
  {
    id: "mox-python-async-race",
    category: "Mox Python",
    question: "Tricky: Can two coroutines race on one event-loop thread? Diagnose this balance update.",
    code: `async def apply_credit(account_id, amount):
    current = balances.get(account_id, 0)
    await validate_credit(account_id, amount)
    balances[account_id] = current + amount`,
    answerSeconds: 90,
    answer: "Yes. Cooperative concurrency can switch tasks at await, so two calls can read the same current value and later overwrite one another. An asyncio.Lock around the in-process read-modify-write can protect one event loop, though the slow validation should be placed carefully to avoid holding the lock unnecessarily. A lock does nothing across worker processes or replicas; durable balances need a database transaction, atomic conditional update or append-only ledger plus idempotency.",
    signals: ["Interleaving at await", "Lost update", "Lock scope", "Cross-process durability"],
    trap: "Assuming one thread means no races, or using a process-local asyncio.Lock as a distributed banking control.",
    followUp: "How would optimistic concurrency with a version column solve this while detecting conflicting updates?",
    priority: "Build",
  },
  {
    id: "mox-python-futures-ordering",
    category: "Mox Python",
    question: "Common: Compare Executor.map, submit and as_completed for ordering, failures and backpressure.",
    answerSeconds: 120,
    answer: "Executor.map returns results in input order, so an early slow task can delay consumption of later completed work; an exception appears when its result position is reached. submit returns individual Future objects, enabling per-task metadata, cancellation and policies. as_completed yields futures in completion order, which improves responsiveness but requires restoring order explicitly when it matters. None excuses unbounded admission: limit outstanding futures, handle every exception, and define shutdown and cancellation behavior.",
    signals: ["Input versus completion order", "Future ownership", "Exception observation", "Bounded submission"],
    trap: "Submitting millions of items at once and calling the executor concurrent even though memory is consumed by the pending queue.",
    followUp: "How would you preserve output order while allowing only 100 tasks to be outstanding?",
    priority: "Core",
  },
  {
    id: "mox-python-multiprocessing-boundary",
    category: "Mox Python",
    question: "Tricky: Why can a lambda, open database connection or local function work in a thread pool but fail in a process pool?",
    answerSeconds: 120,
    answer: "Threads share one address space, while process workers receive tasks and data through serialization and operate in isolated memory. Lambdas, nested functions and live connections commonly cannot be pickled or cannot be used safely in another process. Define importable top-level worker functions, pass plain serializable data, and create process-owned clients inside the worker. Protect process startup with the __main__ guard where required and account for startup, IPC, memory duplication and platform-specific start methods.",
    signals: ["Serialization boundary", "Process isolation", "Worker-owned resources", "Startup-method awareness"],
    trap: "Forking a multithreaded service after creating network clients and assuming inherited sockets, locks and pools remain valid.",
    followUp: "How would you batch tiny CPU tasks so process IPC does not cost more than the work?",
    priority: "Build",
  },
  {
    id: "mox-python-pytest-patch-target",
    category: "Mox Python",
    question: "Common: Where should this dependency be patched in a unit test, and why?",
    code: `# service.py
from bank_api import fetch_balance

def available(account_id):
    return fetch_balance(account_id)["available"]`,
    answerSeconds: 90,
    answer: "Patch service.fetch_balance because available resolves the name in the service module. Patching bank_api.fetch_balance after service imported it may leave service's bound reference unchanged. Prefer dependency injection or a focused fake when it makes the boundary clearer, and use autospec when a mock should fail on an invalid interface. Keep a small integration test for the real adapter so a perfectly mocked unit test is not the only evidence.",
    signals: ["Patch where looked up", "Import-time binding", "Autospec or fake", "Integration complement"],
    trap: "Patching where a symbol was originally defined without checking the namespace used by the code under test.",
    followUp: "How can fixture scope or an un-restored monkeypatch make a test pass alone but fail in the full suite?",
    priority: "Core",
  },
  {
    id: "mox-python-reproducible-package",
    category: "Mox Python",
    question: "Common: A Python service works from the repository but fails after a clean Docker install. Make the build reproducible and secure.",
    answerSeconds: 120,
    answer: "Declare package metadata and direct dependencies in pyproject.toml, build a wheel, and test installation of that artifact in a clean environment. Resolve deployment dependencies with a reviewed lock or constraints mechanism, pin the Python and base-image environment, and rebuild regularly for security patches. Use a controlled package index and integrity checks where supported, run as a non-root user, and never bake credentials into image layers. A virtual environment isolates packages but does not reproduce versions by itself.",
    signals: ["pyproject and wheel", "Resolved dependencies", "Clean install test", "No secrets or root runtime"],
    trap: "Copying a developer virtual environment or relying on the repository root being implicitly present on sys.path.",
    followUp: "How would you patch one vulnerable transitive dependency while keeping the release deterministic and reviewable?",
    priority: "Core",
  },
];
