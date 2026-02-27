# Long-Horizon Coding Agent Demo

An autonomous agent system that builds full-stack applications from GitHub issues using AWS Bedrock AgentCore and the Claude Agent SDK.

## Quick Start

### Prerequisites

- AWS account with Bedrock AgentCore access
- GitHub repository with Actions enabled
- Docker installed locally
- AWS CLI and CDK configured
- `agentcore` CLI installed (`pip install bedrock-agentcore`)

### Deployment Steps

```bash
# 1. Deploy CDK infrastructure (ECR, S3 buckets, CloudFront, IAM roles)
make deploy-infra

# 2. Build and push the Docker image
agentcore build
agentcore push

# 3. Launch the agent runtime
make launch PROJECT_NAME=canopy
```

### GitHub Setup

1. **Secrets** (Settings > Secrets and variables > Actions > Secrets):

   | Secret | Description |
   |--------|-------------|
   | `AWS_ACCESS_KEY_ID` | IAM user access key for GitHub Actions |
   | `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
   | `AWS_AGENTCORE_ROLE_ARN` | IAM role ARN for invoking AgentCore |
   | `AWS_PREVIEW_DEPLOY_ROLE_ARN` | IAM role ARN for deploying previews |

2. **Variables** (Settings > Secrets and variables > Actions > Variables):

   | Variable | Description |
   |----------|-------------|
   | `AUTHORIZED_APPROVERS` | Comma-separated GitHub usernames who can approve builds |
   | `PREVIEWS_BUCKET_NAME` | S3 bucket for preview deployments |
   | `PREVIEWS_CDN_DOMAIN` | CloudFront domain for previews |
   | `PREVIEWS_DISTRIBUTION_ID` | CloudFront distribution ID for cache invalidation |

3. **Labels** (must exist for workflows):

   ```bash
   gh api repos/OWNER/REPO/labels -f name="agent-building" -f color="FBCA04" -f description="Agent is actively working on this issue"
   gh api repos/OWNER/REPO/labels -f name="agent-complete" -f color="0E8A16" -f description="Agent has completed this issue"
   gh api repos/OWNER/REPO/labels -f name="tests-failed" -f color="D93F0B" -f description="Tests failed during agent build"
   ```

### AWS Secrets Manager

The agent reads secrets at runtime:

| Secret Name | Description |
|-------------|-------------|
| `claude-code/{env}/anthropic-api-key` | Anthropic API key (not needed if using Bedrock) |
| `claude-code/{env}/github-token` | Default GitHub PAT (fallback) |
| `claude-code/{env}/github-token-{org}` | Org-specific GitHub PAT (optional) |

Where `{env}` is the environment name (default: `reinvent`).

## How It Works

1. **User creates a GitHub issue** with a feature request
2. **Users vote** with reactions to prioritize what gets built
3. **Authorized user approves** by adding a reaction
4. **Issue poller** (runs every 5 min) detects approved issues, sorted by votes
5. **Agent builder** workflow acquires lock and invokes AWS Bedrock AgentCore
6. **Bedrock entrypoint** clones the repo and starts the Claude agent
7. **Agent builds the feature** following the build plan, taking screenshots, running tests
8. **Progress is tracked** via commits pushed to the `agent-runtime` branch
9. **On completion**, the `agent-complete` label is added
10. **Deploy preview** workflow builds and deploys to CloudFront

## Creating a New Project

> **Recommended**: Run `claude` in this repo for an interactive guided setup. Claude will check your prerequisites, help you create a BUILD_PLAN.md, deploy infrastructure, and trigger the agent — all conversationally.

The agent uses `PROJECT_NAME` to find build plans and configure each project. To build something other than the default Canopy app:

### 1. Create a build plan directory

```
prompts/
  myapp/
    BUILD_PLAN.md         # Required: full project specification
    EXAMPLE_TEST.txt      # Optional: example test for the agent to follow
    DEBUGGING_GUIDE.md    # Optional: project-specific debugging tips
```

### 2. Write BUILD_PLAN.md

This is the most important file. It tells the agent exactly what to build. Include:

- **Project overview** — what the app does, who it's for
- **Technology stack** — framework, build tools, styling, backend
- **API specification** — endpoints, request/response schemas
- **Data models** — entities, relationships, database design
- **UI specification** — pages, components, layout
- **Test requirements** — what tests to write, how to run them

See `prompts/canopy/BUILD_PLAN.md` for a complete example.

### 3. Launch with your project name

```bash
# Via make
make launch PROJECT_NAME=myapp

# Or override just the variable
make launch-local PROJECT_NAME=myapp
```

### What PROJECT_NAME controls

- `prompts/{PROJECT_NAME}/BUILD_PLAN.md` is loaded as the build plan
- `prompts/{PROJECT_NAME}/EXAMPLE_TEST.txt` is loaded as test guidance
- `prompts/{PROJECT_NAME}/DEBUGGING_GUIDE.md` is loaded for debugging context
- Shared prompts in `prompts/system_prompt.txt` and `prompts/DEBUGGING_GUIDE.md` are always loaded

### Working with Existing Projects (Experimental)

The agent can work on existing codebases, not just greenfield builds. This repo acts as a **control plane** — the Docker image, AgentCore runtime, and shared infrastructure. The target repo is the **workspace** — the existing project the agent modifies.

```
┌─────────────────────────┐     ┌──────────────────────────┐
│  Harness Repo (this)    │     │  Target Repo (user's)    │
│                         │     │                          │
│  - Docker image/ECR     │     │  - Their actual code     │
│  - AgentCore runtime    │     │  - Their CI/CD workflows │
│  - CDK infra (shared)   │     │  - Issues live here      │
│  - Makefile             │     │  - .harness/             │
│                         │     │    PROJECT_HARNESS.md    │
│                         │     │  - .github/workflows/    │
│                         │     │    agent-trigger.yml     │
└─────────┬───────────────┘     └───────────────────┬──────┘
          │                                         │
          │  Docker image has the agent brain        │  Issue + rocket reaction
          │                                         │
          ▼                                         ▼
   ┌──────────────────────────────────────────────────────┐
   │  AgentCore Runtime (AWS)                             │
   │                                                      │
   │  1. Triggered by agent-trigger.yml on target repo    │
   │  2. Clones TARGET repo (not harness repo)            │
   │  3. Reads .harness/PROJECT_HARNESS.md from repo      │
   │     (falls back to Docker image if not in repo)      │
   │  4. Agent works at repo root (WORK_DIR=.)            │
   │  5. Pushes branch to target repo                     │
   │  6. Target repo's own CI/CD handles the rest         │
   └──────────────────────────────────────────────────────┘
```

#### Quick Start

The easiest way to set up is to copy `harness-setup/CLAUDE.md` into your target repo and run `claude` — it will walk you through the full setup interactively.

Alternatively, set it up manually:

```bash
# In the target repo:
mkdir -p .harness
# Fill in .harness/PROJECT_HARNESS.md from prompts/PROJECT_HARNESS_TEMPLATE.md
cp path/to/harness-repo/harness-setup/agent-trigger.yml .github/workflows/

# In the harness repo:
make update-runtime-env PROJECT_NAME=myproject WORK_DIR=. BASE_BRANCH=main
```

The `.harness/PROJECT_HARNESS.md` file tells the agent how to build, test, and verify the existing project. The agent discovers it from the cloned repo at runtime — no Docker rebuild needed per project.

See `prompts/PROJECT_HARNESS_TEMPLATE.md` for the full template with all available sections.

## Resetting the Agent

To wipe all agent state and start fresh:

```bash
make reset
```

This performs the following:

1. **Deletes the `agent-runtime` branch** (local and remote) — removes all generated code
2. **Closes all open issues** with the `agent-building` label
3. **Clears SSM parameters** — `/claude-code/current-issue`, `/claude-code/session-id`, `/claude-code/infra/deploy-state`
4. **Empties S3 buckets** — screenshots and previews
5. **Invalidates CloudFront caches** — ensures stale content is purged

After reset, create a new GitHub issue and add a reaction to trigger a fresh build.

## Configuration

Override any variable on the command line:

```bash
make launch PROJECT_NAME=myapp SESSION_DURATION_HOURS=2.0 DEFAULT_MODEL=us.anthropic.claude-opus-4-6-v1
```

Key variables (set in `Makefile` or via environment):

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT_NAME` | `canopy` | Which build plan to use (`prompts/{name}/`) |
| `DEFAULT_MODEL` | `us.anthropic.claude-opus-4-6-v1` | Bedrock model ID |
| `SESSION_DURATION_HOURS` | `1.0` | Max agent session length |
| `PUSH_INTERVAL_SECONDS` | `300` | How often to push commits |
| `SCREENSHOT_INTERVAL_SECONDS` | `300` | How often to capture screenshots |
| `AWS_PROFILE` | `default` | AWS CLI profile |
| `AWS_REGION` | `us-east-1` | AWS region |
| `GITHUB_REPO` | `KBB99/riv2025-long-horizon-coding-agent-demo` | Target GitHub repo |

Run `make show-config` to see all current values.

## Project Structure

```
├── bedrock_entrypoint.py           # Main orchestrator — clones repo, starts agent
├── claude_code.py                  # Agent session manager (Claude SDK wrapper)
├── src/
│   ├── cloudwatch_metrics.py       # Heartbeat and metrics
│   ├── github_integration.py       # GitHub API operations
│   └── git_operations.py           # Git commit/push logic
├── prompts/
│   ├── system_prompt.txt           # Shared system prompt (all projects)
│   ├── DEBUGGING_GUIDE.md          # Shared debugging tips
│   ├── FRONTEND_AESTHETICS_GUIDE.md # UI design guidance
│   └── canopy/                     # Canopy project build plan
│       ├── BUILD_PLAN.md
│       ├── EXAMPLE_TEST.txt
│       ├── DEBUGGING_GUIDE.md
│       └── system_prompt.txt
├── frontend-scaffold-template/     # React + Vite + Tailwind scaffold
├── infrastructure/                 # CDK stack (ECR, S3, CloudFront, IAM)
├── .github/workflows/
│   ├── issue-poller.yml            # Polls for approved issues
│   ├── agent-builder.yml           # Invokes AgentCore
│   └── deploy-preview.yml          # Deploys built app to CloudFront
└── Makefile                        # All management commands
```

## License

Apache 2.0
