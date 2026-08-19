import type { Card } from "./study-data";

export const hkexAwsBasicCards: Card[] = [
  {
    id: "hkex-aws-basic-ec2-private-autoscaling",
    category: "HKEX AWS Basic",
    question: "Design a secure, auto-scaled EC2 deployment for an internal market-data API.",
    code: `Requirements
- HTTPS clients enter through an internet-facing Application Load Balancer.
- API instances must not have public IP addresses.
- Capacity scales from 2 to 10 instances on sustained load.
- Instances need durable block storage for temporary indexed files.
- Only the load balancer may reach the API port.`,
    answerSeconds: 120,
    answer: "Put the ALB in at least two public subnets and the Auto Scaling group in private subnets across at least two Availability Zones. The ALB security group accepts HTTPS from the approved client ranges; the instance security group accepts the API port only from the ALB security group. Give instances an IAM role and outbound access through controlled endpoints or NAT rather than public IPs. Use an encrypted launch-template EBS volume, but treat the indexed files as reproducible cache: an Auto Scaling replacement can terminate the instance, launch-template volumes are commonly deleted on termination, and a retained AZ-scoped volume is not automatically reattached to a replacement in another AZ. Keep the durable source elsewhere when replacement survival is required. Scale on request count per target or CPU, keep two healthy instances, and use health checks and rolling replacement.",
    signals: ["Public ALB, private instances", "Security-group reference", "Multi-AZ Auto Scaling", "Encrypted AZ-scoped EBS"],
    trap: "Opening the instance port to 0.0.0.0/0, placing instances in public subnets, or describing EBS as shared regional storage.",
    followUp: "For HKEX, what monitoring and deployment controls would you add before this API could support an enterprise data-platform workflow?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-s3-static-security",
    category: "HKEX AWS Basic",
    question: "An S3-hosted data dictionary must use HTTPS and must not expose its bucket publicly. What architecture do you choose?",
    code: `Current design
- S3 static website hosting is enabled.
- The bucket policy grants s3:GetObject to Principal "*".
- Users open the S3 website endpoint directly.

Required
- HTTPS
- No public S3 access
- Cached global delivery
- Auditable updates`,
    answerSeconds: 90,
    answer: "An S3 website endpoint is designed for public website content and does not provide HTTPS. For the stated controls, disable public website access, keep Block Public Access enabled, use the private S3 REST origin behind CloudFront, and grant CloudFront access through Origin Access Control. Attach TLS at CloudFront, log distribution and bucket access as required, version the bucket, encrypt objects, and deploy immutable assets through a controlled pipeline. If the content is truly internal, add an authentication layer or signed URLs/cookies; CloudFront plus a private origin does not by itself identify authorized employees.",
    signals: ["Private S3 REST origin", "CloudFront OAC", "HTTPS and authentication", "Versioned auditable deployment"],
    trap: "Keeping the public website endpoint and assuming a bucket name, obscurity, or HTTPS redirect makes the objects private.",
    followUp: "How would HKEX revoke one user's access without invalidating every cached object for all other users?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-lambda-s3-idempotency",
    category: "HKEX AWS Basic",
    question: "An S3 upload invokes Lambda to register a file in DynamoDB. Make the basic design safe under duplicate and out-of-order notifications.",
    code: `Event fields available
- bucket
- object key
- versionId when versioning is enabled
- eTag
- event time

Target item
- ingestion_id
- source_uri
- status
- observed_at`,
    answerSeconds: 120,
    answer: "Use an S3 event notification to invoke Lambda, but treat delivery as at least once and unordered. Give Lambda a least-privilege execution role for the required S3 object/version, DynamoDB table and logs. Derive a stable ingestion identity from bucket, key and version ID, or from a source-issued file ID; use a DynamoDB conditional PutItem so a retry cannot create a second registration. Read object metadata to validate what actually exists instead of trusting event time as ordering. Send exhausted asynchronous failures to a destination or queue, alarm on them, and make replay use the same identity. Keep credentials out of code and use bounded timeout/memory settings.",
    signals: ["At-least-once delivery", "Stable file identity", "Conditional write", "Least-privilege role"],
    trap: "Using the Lambda request ID or event timestamp as the deduplication key; both change across deliveries and do not express source identity.",
    followUp: "How would you prove to an HKEX data owner that every accepted file is registered once while every rejected file remains traceable?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-dynamodb-trade-access-pattern",
    category: "HKEX AWS Basic",
    question: "Model a DynamoDB table for two exact trade lookup patterns without relying on Scan.",
    code: `Access patterns
1. List one security's trades for a UTC trading date, ordered by event time.
2. Find one trade globally by trade_id.

Fields
trade_id, security_id, event_time, trading_date, price, quantity`,
    answerSeconds: 120,
    answer: "Design from the access patterns. A primary key can use PK = SECURITY#<security_id>#DATE#<trading_date> and SK = TS#<fixed-width UTC ISO event_time>#TRADE#<trade_id>, which lets Query return one security-day in deterministic lexicographic time order. Add a sparse or regular GSI with GSI1PK = TRADE#<trade_id> and a fixed or source-aware GSI1SK for global lookup. GSI reads are eventually consistent only; if an immediate authoritative post-write lookup is required, use a primary-key or materialized-key design with the appropriate consistency contract, or retry until propagation. Store numbers with DynamoDB Decimal semantics, not binary floating-point. Query supplies an exact partition key; Scan is not the lookup plan. Address hot partitions with evidence, possibly through deterministic write sharding and bounded fan-out reads.",
    signals: ["Access-pattern-first key", "Ordered composite sort key", "GSI for trade ID", "Query, not Scan"],
    trap: "Making trade_id the only table partition key and then expecting an efficient ordered query by security and date.",
    followUp: "Which HKEX volume estimates would you request before deciding whether the security-day partition needs write sharding?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-iam-secrets-review",
    category: "HKEX AWS Basic",
    question: "Review this AWS access design for an ETL application and replace it with least privilege.",
    code: `Developer laptop
- Long-lived IAM access key in ~/.env

EC2 application
- The same key is copied into the AMI
- Attached policy: {"Effect":"Allow","Action":"*","Resource":"*"}

Database password
- Stored in an unencrypted config file in S3`,
    answerSeconds: 120,
    answer: "Human access should use federation, MFA and temporary credentials; the EC2 workload should use an instance profile role, never a copied user key. Build a task-specific policy with only the needed actions and resource ARNs, plus conditions where practical, then verify it with policy validation and access evidence. Put the database credential in Secrets Manager, encrypt it with an appropriate KMS key, grant only GetSecretValue and kms:Decrypt to the workload role, and enable rotation if the database supports it. Remove and rotate the exposed keys and password, inspect CloudTrail for misuse, and treat the AMI and object history as potentially compromised until remediated.",
    signals: ["Temporary role credentials", "Resource-scoped policy", "Secrets Manager and KMS", "Rotate and investigate exposure"],
    trap: "Only moving the long-lived key into Secrets Manager; the workload should normally assume a role instead of retrieving an IAM user credential.",
    followUp: "How would HKEX separate developer, deployment and production data-access duties while retaining a complete approval trail?",
    priority: "Core",
  },
];
