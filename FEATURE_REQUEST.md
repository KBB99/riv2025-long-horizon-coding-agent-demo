# Feature Request: Issue #4

## Title
[MVP] Build Canopy - Full-Stack Project Management App

## Description
## Overview

Build the Canopy project management application from the BUILD_PLAN. This is a full-stack serverless app with:

- **Frontend**: React 18 + Vite 6 + Tailwind CSS v4 SPA
- **Backend**: AWS Lambda handlers behind API Gateway (HTTP API)
- **Database**: DynamoDB with single-table design
- **Infrastructure**: AWS CDK stack defining all resources

The app should follow the forest-inspired design palette (deep greens, warm earth tones, amber accents) and feel like a professional Jira alternative.

## MVP Scope

Focus on getting the core working end-to-end:

1. **Monorepo setup** — `frontend/`, `backend/`, `infrastructure/`, `e2e/` under `generated-app/`
2. **CDK stack** — DynamoDB table with GSIs, Lambda function, API Gateway HTTP API, S3 + CloudFront for frontend
3. **CDK tests** — Snapshot and assertion tests
4. **Backend Lambda handlers** — CRUD for projects, issues, sprints, boards, comments
5. **Frontend API client** — fetch wrapper + React Query hooks, with Dexie/IndexedDB fallback for local dev
6. **Global layout** — Top nav (forest green), collapsible sidebar, main content area
7. **Project CRUD** — Create/list/edit/delete projects with project selector
8. **Issue CRUD** — Full issue lifecycle with types (Story, Bug, Task, Epic, Sub-task)
9. **Kanban board** — Drag-and-drop columns (To Do, In Progress, In Review, Done) using @dnd-kit
10. **Issue detail panel** — Slide-in panel with all fields, markdown description, comments, activity log
11. **Backlog view** — Prioritized list with drag-to-reorder and drag-into-sprint
12. **Sprint management** — Create, start, complete sprints with proper state transitions
13. **Search** — Global search (Cmd+K) with MiniSearch for client-side full-text search
14. **Reports** — Burndown chart, velocity chart, sprint report using Recharts
15. **Keyboard shortcuts** — Full keyboard navigation throughout

## Acceptance Criteria

- `npm run build` in `frontend/` produces a clean `dist/` folder
- `cd infrastructure && npx cdk synth` produces valid CloudFormation
- `cd infrastructure && npm test` passes CDK tests
- The app loads in a browser and renders the Canopy UI
- Projects and issues can be created, edited, and deleted
- Kanban board drag-and-drop works smoothly
- Forest canopy color palette is consistently applied
- Dark theme support included


## Branch
All work should be committed to the `agent-runtime` branch.
Commits should reference this issue: `Ref: #4`

## Mode
Full Build - Create new app in generated-app/
