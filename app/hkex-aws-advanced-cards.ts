import type { Card } from "./study-data";

export const hkexAwsAdvancedCards: Card[] = [
  {
    id: "hkex-aws-advanced-athena-layout",
    category: "HKEX AWS Advanced",
    question: "An Athena query scans an entire S3 trade dataset even though it filters on trading_date. Which change is most likely to reduce bytes scanned?",
    code: `Choose ONE
A. Keep compressed JSON but rename every file with a longer random UUID.
B. Partition by unique trade_id so every trade has its own S3 prefix.
C. Convert the files to Parquet and partition the table by trading_date, then filter on that partition column.
D. Increase the analyst laptop's memory before submitting the query.`,
    answerSeconds: 50,
    answer: "Correct answer: C. Columnar Parquet lets Athena read only required columns, while partitioning by a commonly filtered date lets it skip unrelated S3 prefixes. Random file names and laptop memory do not reduce the amount Athena scans, while partitioning by a unique identifier creates excessive partitions. Partition pruning still depends on querying the partition column correctly.",
    signals: ["Answer C", "Parquet", "Date partitioning", "Partition pruning"],
    trap: "Assuming a WHERE clause alone reduces scanning when the table layout does not support pruning.",
    followUp: "Why would partitioning by unique trade_id usually be a poor choice?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-cli-identity",
    category: "HKEX AWS Advanced",
    question: "Before an AWS CLI deployment, which command best confirms the account and IAM identity currently in use?",
    code: `Choose ONE
A. aws sts get-caller-identity
B. aws configure list
C. aws iam list-users
D. aws cloudtrail lookup-events`,
    answerSeconds: 35,
    answer: "Correct answer: A. aws sts get-caller-identity returns the active account, ARN and principal identity, which helps catch use of the wrong profile or assumed role before a deployment. aws configure list shows configuration sources but not the authoritative caller identity; listing users or audit events also does not directly identify the active caller.",
    signals: ["Answer A", "STS", "Account and ARN", "Profile or role check"],
    trap: "Assuming the shell is using the intended profile without checking the active caller.",
    followUp: "How would you run the same command with a named CLI profile?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-quicksight-rls",
    category: "HKEX AWS Advanced",
    question: "A QuickSight dashboard should show each desk only its own trade rows. Which feature most directly implements this?",
    code: `Choose ONE
A. Put each desk's users in a different EC2 security group.
B. Refresh the QuickSight SPICE dataset once per desk.
C. Give every user access and hide unauthorized rows with dashboard colors.
D. Configure QuickSight row-level security with a rules dataset mapping users or groups to allowed desk values.`,
    answerSeconds: 45,
    answer: "Correct answer: D. QuickSight row-level security filters dataset rows according to user or group mappings. Security groups control network traffic, SPICE refreshes do not define per-user authorization, and presentation choices are not security controls. Source-system permissions and export controls still matter because dashboard row-level security is not a substitute for every upstream authorization boundary.",
    signals: ["Answer D", "Rules dataset", "User or group mapping", "Row filtering"],
    trap: "Confusing network controls such as security groups with data-level authorization inside an analytics tool.",
    followUp: "What is the difference between row-level and column-level security in a dashboard?",
    priority: "Build",
  },
  {
    id: "hkex-aws-advanced-dms-cutover",
    category: "HKEX AWS Advanced",
    question: "A database must be migrated with a short outage while writes continue during most of the migration. Which DMS approach best fits?",
    code: `Choose ONE
A. Take a one-time source snapshot and ignore all later writes.
B. Run a full load plus change data capture, validate the target, then cut over after replication lag reaches an acceptable level.
C. Use AWS Schema Conversion Tool alone; it continuously copies every data change.
D. Stop the source for the entire multi-day full load.`,
    answerSeconds: 50,
    answer: "Correct answer: B. AWS DMS can perform the initial full load and then apply ongoing source changes through change data capture, reducing the final write-pause window. The target still needs schema compatibility checks and data reconciliation; task status alone is not proof that the migration is correct. A loses later writes, Schema Conversion Tool alone is not continuous replication, and D creates unnecessary downtime.",
    signals: ["Answer B", "Full load", "Change data capture", "Validate before cutover"],
    trap: "Believing DMS automatically converts every schema feature and proves source-target equality.",
    followUp: "Which two checks would you run before declaring the target authoritative?",
    priority: "Build",
  },
  {
    id: "hkex-aws-advanced-step-functions-redrive",
    category: "HKEX AWS Advanced",
    question: "Which AWS service is designed to coordinate several Lambda functions with branching, retries and visible execution state?",
    code: `Choose ONE
A. Amazon EventBridge Scheduler
B. Amazon SQS
C. Lambda asynchronous destinations
D. AWS Step Functions`,
    answerSeconds: 30,
    answer: "Correct answer: D. Step Functions models a workflow as a state machine and supports sequencing, choices, retries, catches and execution history. EventBridge can schedule or route events, SQS buffers messages, and Lambda destinations route invocation results, but none directly models the stated multi-step branching workflow. Retries do not make external side effects exactly once, so tasks should still be idempotent.",
    signals: ["Answer D", "State machine", "Retry and catch", "Idempotent tasks"],
    trap: "Assuming the workflow service automatically makes every Lambda or external write exactly once.",
    followUp: "What is the difference between a Retry rule and a Catch rule?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-codedeploy-ec2",
    category: "HKEX AWS Advanced",
    question: "Which combination is central to an automated CodeDeploy deployment onto EC2 instances?",
    code: `Choose ONE
A. A CloudFormation stack plus an Athena workgroup.
B. A deployment group plus an AppSpec file that defines files and lifecycle hooks.
C. An Auto Scaling group plus EC2 user data, with no CodeDeploy configuration.
D. A CodePipeline pipeline plus an S3 lifecycle rule.`,
    answerSeconds: 45,
    answer: "Correct answer: B. The deployment group identifies deployment targets and configuration, while the AppSpec file tells CodeDeploy what to copy and which lifecycle hook scripts to run. CloudFormation, user data and CodePipeline may participate in a broader delivery system, but they do not replace these CodeDeploy-specific components. Health checks and automatic rollback should be configured for a safer production rollout.",
    signals: ["Answer B", "Deployment group", "AppSpec file", "Lifecycle hooks"],
    trap: "Choosing a general AWS service pair without identifying the CodeDeploy-specific deployment artifacts.",
    followUp: "Which deployment strategy reduces risk by shifting traffic to a replacement environment?",
    priority: "Build",
  },
  {
    id: "hkex-aws-advanced-spectrum-versus-copy",
    category: "HKEX AWS Advanced",
    question: "Analysts need to query Parquet files in S3 from Redshift without loading them into native Redshift tables. What should they use?",
    code: `Choose ONE
A. COPY every file into a native Redshift table before each query.
B. Use Athena Federated Query through an EC2 security group.
C. Use Redshift Spectrum with an external schema and catalog metadata.
D. Package the Parquet files inside a Lambda layer.`,
    answerSeconds: 35,
    answer: "Correct answer: C. Redshift Spectrum queries external tables backed by data in S3, normally using an external schema and catalog metadata such as the AWS Glue Data Catalog. COPY loads data into native tables rather than querying it in place, while the other choices do not provide Redshift external-table access.",
    signals: ["Answer C", "External schema", "S3 external tables", "Glue catalog metadata"],
    trap: "Thinking external data must first be copied into Redshift for Spectrum to query it.",
    followUp: "When might repeatedly queried hot data perform better in native Redshift tables?",
    priority: "Core",
  },
  {
    id: "hkex-aws-advanced-service-selection",
    category: "HKEX AWS Advanced",
    question: "A trained model needs a managed HTTPS endpoint with provisioned capacity for steady, low-latency online predictions. Which option is the best fit?",
    code: `Choose ONE
A. SageMaker Batch Transform
B. A SageMaker real-time inference endpoint
C. A SageMaker Processing job
D. An S3 static website endpoint`,
    answerSeconds: 40,
    answer: "Correct answer: B. A SageMaker real-time endpoint is designed for persistent, low-latency online inference over HTTPS with provisioned instances. Batch Transform is for asynchronous batch inference, Processing jobs run data or model-processing workloads, and S3 static hosting does not run a model.",
    signals: ["Answer B", "Real-time endpoint", "Low-latency HTTPS", "Batch versus online inference"],
    trap: "Selecting Batch Transform because it also performs inference without noticing the online latency requirement.",
    followUp: "When would SageMaker Batch Transform be the better choice?",
    priority: "Build",
  },
];
