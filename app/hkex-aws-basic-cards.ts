import type { Card } from "./study-data";

export const hkexAwsBasicCards: Card[] = [
  {
    id: "hkex-aws-basic-ec2-private-autoscaling",
    category: "HKEX AWS Basic",
    question: "Which EC2 design is the most secure way to run a web application that must scale automatically?",
    code: `Choose ONE
A. Put every EC2 instance in a public subnet and allow 0.0.0.0/0 to the application port.
B. Put an Application Load Balancer in public subnets, EC2 Auto Scaling instances in private subnets, and allow the instance security group to receive traffic only from the load balancer security group.
C. Put one large EC2 instance in a private subnet and resize it manually when CPU is high.
D. Put the load balancer and instances in one Availability Zone so network traffic stays local.`,
    answerSeconds: 45,
    answer: "Correct answer: B. A public load balancer can distribute traffic to an Auto Scaling group in private subnets across multiple Availability Zones. Referencing the load balancer security group in the instance security group limits who can reach the application port. A unnecessarily exposes instances, C has no automatic scaling or redundancy, and D creates an Availability Zone failure point.",
    signals: ["Answer B", "Public load balancer", "Private instances", "Multi-AZ Auto Scaling"],
    trap: "Choosing a public IP for every instance because the application must be reachable from the internet.",
    followUp: "Which single phrase in the question tells you that an Auto Scaling group is required?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-ebs-attachment",
    category: "HKEX AWS Basic",
    question: "An EBS volume cannot be attached to an EC2 instance. What should you check first?",
    code: `Choose ONE
A. Whether the volume and instance are in the same Availability Zone.
B. Whether the volume and instance use the same security group.
C. Whether the EC2 instance has an Elastic IP address.
D. Whether the EBS volume is stored in the same S3 bucket as the instance.`,
    answerSeconds: 35,
    answer: "Correct answer: A. An EBS volume is tied to one Availability Zone and can be attached only to an instance in that Availability Zone. Security groups control network traffic, an Elastic IP is unrelated, and EBS volumes are not stored in a user-managed S3 bucket.",
    signals: ["Answer A", "EBS is AZ-scoped", "Security groups are unrelated", "EBS is block storage"],
    trap: "Confusing regional AWS services with resources that are scoped to one Availability Zone.",
    followUp: "After attaching a new empty EBS volume, what operating-system steps may still be required before an application can use it?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-s3-static-security",
    category: "HKEX AWS Basic",
    question: "Which configuration directly enables a simple static website from an S3 bucket?",
    code: `Choose ONE
A. Enable S3 Versioning without configuring a website endpoint.
B. Create an EBS volume and attach the bucket to an EC2 instance.
C. Enable S3 static website hosting, specify an index document, upload the files, and permit the required object reads.
D. Create a DynamoDB table whose partition key is index.html.`,
    answerSeconds: 35,
    answer: "Correct answer: C. S3 static website hosting serves static objects through a bucket website endpoint and requires an index document plus appropriate read access. Versioning alone does not create a website, while EBS and DynamoDB do not turn an S3 bucket into one. For a production HTTPS site with a private bucket, CloudFront and Origin Access Control are the stronger design, but that is beyond this basic configuration question.",
    signals: ["Answer C", "Website hosting enabled", "Index document", "Object read access"],
    trap: "Answering with a more elaborate CloudFront design when the question asks only how to enable basic S3 website hosting.",
    followUp: "Why would you normally add CloudFront instead of exposing the S3 website endpoint directly?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-lambda-s3-idempotency",
    category: "HKEX AWS Basic",
    question: "A small Python function should run whenever a CSV file is uploaded to S3. Which AWS design is the most direct?",
    code: `Choose ONE
A. Store an IAM user's access key inside the Python source and run it manually on EC2.
B. Attach an EBS volume to S3 and poll it from Lambda.
C. Create a security-group inbound rule from S3 to Lambda.
D. Configure an S3 event notification to invoke Lambda and give the Lambda execution role permission to read the object and write logs.`,
    answerSeconds: 40,
    answer: "Correct answer: D. S3 can invoke Lambda from an object-created event, and the Lambda execution role supplies temporary permissions to read the object and write CloudWatch Logs. A uses unsafe long-lived credentials and is not event driven. B and C describe integrations that do not exist: S3 is not mounted as EBS, and Lambda invocation is authorized through resource policies rather than security-group inbound rules.",
    signals: ["Answer D", "S3 object event", "Lambda execution role", "CloudWatch Logs"],
    trap: "Putting access keys in application code instead of assigning permissions to the Lambda execution role.",
    followUp: "Why should the function still tolerate receiving the same S3 event more than once?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-dynamodb-trade-access-pattern",
    category: "HKEX AWS Basic",
    question: "A DynamoDB table has customer_id as its partition key. Which operation efficiently returns one known customer's items?",
    code: `Choose ONE
A. Scan the whole table and filter by customer_id.
B. Query the table with the exact customer_id partition-key value.
C. Export the table to S3 before every lookup.
D. Create one table per customer.`,
    answerSeconds: 35,
    answer: "Correct answer: B. DynamoDB Query uses an exact partition-key value and can optionally narrow results with a sort-key condition. Scan reads items across the table and filtering does not avoid that work. Exporting or creating one table per customer is unnecessary for this access pattern.",
    signals: ["Answer B", "Exact partition key", "Query, not Scan", "Optional sort-key condition"],
    trap: "Assuming a Scan becomes efficient merely because it includes a filter expression.",
    followUp: "What would you add if the application must also query efficiently by email address?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-s3-bucket-policy",
    category: "HKEX AWS Basic",
    question: "Which action best prevents accidental public access to a private S3 data bucket?",
    code: `Choose ONE
A. Give every object a difficult-to-guess name.
B. Allow Principal "*" and rely on the bucket being in a private subnet.
C. Enable S3 Block Public Access and grant only required principals access through IAM or bucket policies.
D. Store the bucket name in Secrets Manager.`,
    answerSeconds: 35,
    answer: "Correct answer: C. S3 Block Public Access provides account- or bucket-level guardrails against public policies and ACLs, while least-privilege IAM and bucket policies grant the required private access. S3 buckets are not placed inside VPC subnets, secret object names are not authorization, and hiding the bucket name does not protect its data.",
    signals: ["Answer C", "Block Public Access", "Least privilege", "S3 is not in a subnet"],
    trap: "Treating an unguessable URL or bucket name as an access-control mechanism.",
    followUp: "Which policy condition can deny requests that do not use TLS?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-iam-group",
    category: "HKEX AWS Basic",
    question: "Ten analysts need the same read-only AWS permissions. What is the simplest maintainable IAM setup?",
    code: `Choose ONE
A. Add the users to an IAM group and attach the read-only policy to the group.
B. Attach the same read-only policy separately to every user and update ten copies later.
C. Share one IAM user's password and access key with all analysts.
D. Make every analyst the AWS account root user.`,
    answerSeconds: 30,
    answer: "Correct answer: A. An IAM group lets administrators manage a common permission policy for multiple IAM users. B creates unnecessary duplicated administration, while C removes accountability and D grants extreme privileges. In a modern enterprise, workforce federation and roles are usually preferred to long-lived IAM users, but A is the correct answer for the stated IAM user-and-group question.",
    signals: ["Answer A", "Policy on group", "No shared identity", "Least privilege"],
    trap: "Choosing shared credentials because they appear easier to administer.",
    followUp: "Why are federated roles generally preferred to long-lived IAM users for employees?",
    priority: "Core",
  },
  {
    id: "hkex-aws-basic-iam-secrets-review",
    category: "HKEX AWS Basic",
    question: "An application needs a database password that should be encrypted and rotated. Which service is designed for this?",
    code: `Choose ONE
A. Amazon CloudFront
B. Amazon Route 53
C. AWS Auto Scaling
D. AWS Secrets Manager`,
    answerSeconds: 25,
    answer: "Correct answer: D. AWS Secrets Manager stores secrets encrypted, controls retrieval through IAM, and supports managed or custom rotation workflows. CloudFront is a content delivery network, Route 53 provides DNS and routing, and Auto Scaling adjusts capacity.",
    signals: ["Answer D", "Encrypted secret storage", "IAM-controlled retrieval", "Rotation support"],
    trap: "Storing the password directly in source code, an AMI, or a public environment file.",
    followUp: "What permission does the application role need, and why should developers not automatically receive it?",
    priority: "Core",
  },
];
