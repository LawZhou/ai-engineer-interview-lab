import type { Card } from "./study-data";

export const hkexAwsAdvancedCards: Card[] = [
  {
    id: "hkex-aws-advanced-athena-layout",
    category: "HKEX AWS Advanced",
    question: "Design an Athena table layout for ten years of high-volume trade data and control both scan cost and governance.",
    code: `Common queries
- One trading day across all markets
- One market for a date range
- Rare lookup by trade_id

Current objects
s3://lake/trades/<random-uuid>.json.gz

Requirements
- predictable cost
- schema evolution
- analyst isolation
- reproducible query results`,
    answerSeconds: 150,
    answer: "Convert curated data to Parquet or ORC with compression and right-sized files, and partition on columns that match frequent equality filters, for example trading_date and market. Do not partition on high-cardinality trade_id; use a separate keyed lookup store or a bucketed/indexed design if that access pattern is important. Register an explicit schema in Glue, quarantine incompatible source changes, and use Iceberg when snapshot-level reproducibility and controlled evolution are required. Configure Athena workgroups with separate result locations, encryption, access controls, scan limits and cost metrics. Use partition projection only when the partition domain is predictable and not sparse; otherwise it can plan nonexistent locations. Validate pruning with EXPLAIN and bytes-scanned metrics rather than assuming a WHERE clause is enough.",
    signals: ["Parquet and right-sized files", "Query-aligned partitions", "Workgroup guardrails", "Measured partition pruning"],
    trap: "Partitioning by trade_id or hour for every dataset, creating millions of tiny partitions and moving cost from scanning into metadata and planning.",
    followUp: "Which HKEX audit evidence would you preserve so an analyst can reproduce the exact version of data behind a management report?",
    priority: "Build",
  },
  {
    id: "hkex-aws-advanced-step-functions-redrive",
    category: "HKEX AWS Advanced",
    question: "Design a Step Functions workflow that validates, transforms, quality-checks and publishes an EDP dataset without double publishing.",
    code: `States
ValidateManifest -> RunTransform -> CheckQuality -> PublishCatalog -> Notify

Failure cases
- Transform times out after writing staging files.
- Quality service returns a transient 503.
- Catalog publish succeeds but Notify fails.
- An operator redrives the failed execution.`,
    answerSeconds: 150,
    answer: "Give each dataset run a stable run ID and make every state idempotent against it. Write transforms to an isolated staging prefix and record completion metadata; quality checks read that immutable run. Retry only classified transient errors with bounded exponential backoff and jitter, catch permanent failures into a recorded failed state, and use timeouts and heartbeats for long jobs. Publish through a conditional metadata or catalog commit so the same run cannot become current twice. Notification must be replay-safe and must not determine whether publication committed. A Standard Workflow redrive preserves successful state history and resumes from the unsuccessful step; idempotency is still essential when that failed state completed an external side effect before reporting failure. Emit execution, business-control and data-quality metrics, and define a manual approval or rollback path for high-risk publication.",
    signals: ["Stable run identity", "Idempotent state effects", "Conditional publish boundary", "Bounded retry and redrive"],
    trap: "Assuming Step Functions makes arbitrary Lambda, Glue, catalog and notification side effects exactly once.",
    followUp: "Where would HKEX require a human approval, and what evidence should that approver see before publication?",
    priority: "Advanced",
  },
  {
    id: "hkex-aws-advanced-dms-cutover",
    category: "HKEX AWS Advanced",
    question: "Plan an AWS DMS full-load-plus-CDC migration of a critical reference database with a short cutover window.",
    code: `Source: PostgreSQL on premises, 8 TB
Target: Amazon RDS PostgreSQL
Change rate: continuous during migration
Requirements: <15 minutes write pause, validated row and value accuracy, rollback plan`,
    answerSeconds: 180,
    answer: "Assess unsupported types, extensions, large objects, keys and DDL first; DMS moves data but is not a universal schema-conversion or application-migration tool. Create and test the target schema, establish encrypted network connectivity and least-privilege endpoints, then start full load and CDC from a known log position. Monitor table errors, replication latency and source-log retention so a long load cannot lose required WAL. Validate counts, checksums and business aggregates by table and reconcile a sampled or fully hashed dataset. Before cutover, rehearse application compatibility, pause writes, let CDC reach zero lag, run final controls, switch through a reversible connection mechanism, and observe. Keep the source intact and define the rollback point; acknowledge that writes made only on the new target complicate reversal.",
    signals: ["Schema compatibility assessment", "Full load plus CDC", "Control-total validation", "Rehearsed reversible cutover"],
    trap: "Treating DMS task status or zero CDC lag as proof that source and target are semantically identical.",
    followUp: "Which reconciliation controls would HKEX require before declaring the migrated reference data authoritative?",
    priority: "Advanced",
  },
  {
    id: "hkex-aws-advanced-spectrum-versus-copy",
    category: "HKEX AWS Advanced",
    question: "Choose between Redshift Spectrum and loading data into native Redshift tables for two analytics workloads.",
    code: `Workload A
- Daily dashboards repeatedly join 24 months of trades to small dimensions.
- Tight latency SLO and high concurrency.

Workload B
- Occasional investigation of seven years of archived Parquet in S3.
- Most queries touch one date range and a few columns.`,
    answerSeconds: 150,
    answer: "Workload A usually belongs in native Redshift tables because repeated, latency-sensitive joins benefit from managed statistics, local storage, materialized views and appropriate distribution/sort design; load with COPY rather than row inserts. Workload B is a strong Spectrum case because it can query partitioned columnar archives without first loading all data. Both depend on pruning, file layout and Glue/external-schema permissions. Do not present the choice as permanent: hot curated windows can be native while cold history remains external, exposed through consistent views. Measure bytes scanned, redistribution, queue time and concurrency, and inspect the plan. Secure the Redshift role, S3 prefixes and catalog separately under least privilege.",
    signals: ["Hot native, cold external", "COPY for bulk load", "Partition and column pruning", "Plan and cost evidence"],
    trap: "Saying Spectrum is automatically cheaper or faster because the data stays in S3; repeated broad scans and poor layout can be expensive and slow.",
    followUp: "How would you give HKEX analysts one stable semantic view while moving data between hot and archive tiers?",
    priority: "Build",
  },
  {
    id: "hkex-aws-advanced-service-selection",
    category: "HKEX AWS Advanced",
    question: "Map each advanced AWS requirement to the most direct service or tool, and explain the capability boundary.",
    code: `A. Run repeatable cross-account resource commands in a deployment job.
B. Apply row-level access rules to an interactive business dashboard.
C. Coordinate a multi-step serverless workflow with retries and branches.
D. Perform rolling application deployment to an EC2 Auto Scaling group.
E. Expose a trained model through a managed HTTPS inference endpoint.
F. Query archived S3 tables from Redshift without loading them.`,
    answerSeconds: 120,
    answer: "A uses the AWS CLI or SDK under an assumed deployment role; scripts still need idempotency, error checking and pinned inputs. B uses QuickSight row-level security and governed datasets, but source permissions and export controls still matter. C uses Step Functions; it coordinates services but does not make their side effects atomic. D uses CodeDeploy with an Auto Scaling deployment group, health validation and rollback. E uses a SageMaker real-time endpoint when managed model hosting fits the latency and scale; it does not replace model evaluation or API authorization. F uses Redshift Spectrum through an external schema backed by the Glue Catalog and a least-privilege Redshift IAM role.",
    signals: ["Correct service mapping", "Assumed-role automation", "Security boundary", "Failure and cost boundary"],
    trap: "Naming a service without explaining what it does not guarantee—for example, treating orchestration as a transaction or a dashboard rule as source-level authorization.",
    followUp: "Which of these services would be hardest to approve for HKEX data, and what control evidence would reduce that risk?",
    priority: "Build",
  },
];
