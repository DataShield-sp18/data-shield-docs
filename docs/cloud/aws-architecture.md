# AWS architecture

:::caution Status on 2026-10-07
The application code targets **classic AWS EMR** for paid-tier compute. The code is tested against Floci, a local AWS emulator. It has not run on a real AWS account.

The `data-shield-terraform` repository now matches this page: EKS is removed, and EMR, EFS, and `emr-runner` support are added. These changes are local and not yet committed or applied. Three app-side changes are still necessary before the EMR lane can work on real AWS. See [Open work](#open-work).
:::

## The shape

| Component | AWS service | Function |
| --- | --- | --- |
| Frontend + API | EC2 (serving instance) | Serves the UI and the API. Runs Free-tier jobs in the process |
| EMR runner | EC2 (same or a separate instance) | Takes Pro/Enterprise jobs from the queue. Starts and monitors EMR clusters |
| Big-job compute | EMR (classic, `RunJobFlow`), one cluster for each job | Runs analyze and de-identify for Pro and Enterprise |
| Metadata database | RDS for PostgreSQL | Organizations, users, sessions, audit entries. AWS does backups and patches |
| Queue and job state | ElastiCache for Redis | Job queue, job status, EMR admission counters, EMR status |
| Shared encrypted storage | EFS (Elastic File System) | Encrypted upload, analysis, and result files (`DS_SPILL_DIR`). The API and EMR steps both read it |
| EMR logs | S3 bucket (14-day expiry) | Step and YARN logs after a cluster stops (`DS_EMR_LOG_URI`) |
| Container images | Registry | `api` image and `api-emr-step` image (with JRE and pyspark) |

```mermaid
flowchart TB
    Users(("Users")) -->|HTTPS| Serving

    subgraph VPC["Private AWS network (VPC)"]
        Serving["EC2 serving instance<br/>Frontend + API"]
        Runner["emr-runner"]
        subgraph EMRC["EMR cluster (one for each job)"]
            Master["Master node m5.xlarge<br/>step container"]
            Core["Core nodes m5.xlarge<br/>Pro: 2 · Enterprise: 4"]
        end
        DB[("RDS PostgreSQL")]
        Cache[("ElastiCache Redis")]
        Store[("EFS shared spill<br/>encrypted files")]
    end

    Serving --> DB
    Serving -- "job IDs + wrapped key" --> Cache
    Serving --> Store
    Cache --> Runner
    Runner -- "RunJobFlow / poll / terminate" --> EMRC
    Master --> Core
    Master --> DB
    Master --> Cache
    Master --> Store
```

## Job flow on AWS

```mermaid
sequenceDiagram
    participant API as API (EC2)
    participant R as Redis (ElastiCache)
    participant RN as emr-runner
    participant EMR as EMR
    participant S as Storage
    API->>S: Encrypted upload file
    API->>R: Queue job (no raw data)
    R->>RN: Deliver job
    RN->>EMR: RunJobFlow (tags, tier node count, idle timeout 15 min)
    EMR->>S: Step reads and decrypts upload
    EMR->>R: Progress + status
    EMR->>S: Encrypted result
    EMR-->>RN: Step done → cluster idle → TERMINATED
```

## Why classic EMR

| Reason | Detail |
| --- | --- |
| Cost follows use | A cluster exists only while a job runs and for 15 minutes after. There is no always-on cluster |
| Isolation | Each job has its own cluster, so one organization's job never shares nodes with another organization's job |
| Tier control | The node count comes from the tier. Each organization has a cap on concurrent clusters |
| Managed Spark | EMR includes Spark on YARN. The team does not operate a Spark cluster |
| Simple API | `RunJobFlow`, `AddJobFlowSteps`, `DescribeCluster`, `TerminateJobFlows` through boto3 |

The earlier plan used EKS for an always-on, auto-scaling Spark cluster. The product then changed to tier-based, per-job compute. Per-job EMR clusters fit this model better.

## Why managed RDS and ElastiCache

The product binds internal services to loopback only, as a security rule. This works on one server. It does not work when two servers must connect. Managed RDS and ElastiCache are reachable through VPC security groups from the start. This solves the problem without a change to the loopback rule.

## Terraform modules

The `data-shield-terraform` repository builds the parts that exist before any job runs. It does not create EMR clusters. `emr-runner` creates one cluster for each job at runtime.

```mermaid
flowchart LR
    NET["networking<br/>VPC, 2 subnets, IGW"] --> SRV["serving-ec2<br/>EC2 + compose:<br/>api, frontend, emr-runner"]
    NET --> RDS["rds<br/>PostgreSQL"]
    NET --> EC["elasticache<br/>Redis"]
    NET --> EFS["efs<br/>shared spill volume"]
    NET --> EMR["emr<br/>IAM roles, node SG,<br/>log bucket, bootstrap script"]
    EMR -- "role names, subnet,<br/>log URI, step image" --> SRV
    EFS -- "mount at /var/data-shield/spill" --> SRV
```

| Module | Creates | Used by |
| --- | --- | --- |
| `networking` | VPC, two public subnets in two AZs, internet gateway | All modules |
| `serving-ec2` | EC2 instance, security group, IAM role with a scoped EMR policy, Docker Compose with `api`, `frontend`, and `emr-runner` | Users, and `emr-runner` for EMR calls |
| `emr` | EMR service role, EC2 instance profile, node security group, S3 log bucket, S3 bootstrap script | `emr-runner` at runtime (`DS_EMR_*` variables) |
| `efs` | Encrypted EFS, one mount target for each subnet, NFS security group | `api` and EMR nodes (`DS_SPILL_DIR`) |
| `rds` | PostgreSQL instance | `api`, `emr-runner`, EMR step |
| `elasticache` | Redis replication group | `api`, `emr-runner`, EMR step |

The `emr-runner` IAM policy allows only the EMR actions that the app calls, and `iam:PassRole` for the two EMR roles only. Terraform sets every `DS_EMR_*` value in the compose file, so the role names always match.

## Required configuration

| Variable | Function |
| --- | --- |
| `DS_EMR_REGION`, `DS_EMR_SUBNET_ID` | Region and subnet for clusters |
| `DS_EMR_SERVICE_ROLE`, `DS_EMR_JOB_FLOW_ROLE` | IAM roles (defaults `EMR_DefaultRole`, `EMR_EC2_DefaultRole`) |
| `DS_EMR_STEP_IMAGE` | The `api-emr-step` image |
| `DS_EMR_LOG_URI` | Optional S3 path for EMR logs |
| `DS_REDIS_URL` | ElastiCache endpoint |
| `DATABASE_URL` | RDS endpoint |

See [Environment variables](../operations/environment-variables#emr-big-job-lane) for the full list.

## Open work

| # | Work | Repository |
| --- | --- | --- |
| 1 | Pass `BootstrapActions` in `RunJobFlow`, so that each node mounts the shared EFS volume and pulls the step image | data-shield-app |
| 2 | Pass the EMR node security group in `RunJobFlow`, so that nodes can reach RDS, Redis, and EFS | data-shield-app |
| 3 | Put `DATABASE_URL`, `DS_REDIS_URL`, and `DS_SPILL_DIR` into the step environment | data-shield-app |
| 4 | Commit the Terraform changes and apply them against Floci. Floci support for EFS is not verified | data-shield-terraform |
| 5 | Move secrets (`DATABASE_URL`, `DS_CONNECTION_KEY`) out of EC2 user data into Secrets Manager or SSM | data-shield-terraform |
| 6 | Build CI/CD that pushes the `api`, `api-emr-step`, and `frontend` images to ECR | Both |
| 7 | Run the EMR step on a real EMR cluster | Both |
| 8 | Do a cost review of the tier numbers | Product |
