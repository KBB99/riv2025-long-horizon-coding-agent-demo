#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClaudeCodeStack } from '../lib/claude-code-stack';
const app = new cdk.App();

// Get configuration from context or environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-west-2',
};

const projectName = app.node.tryGetContext('projectName') || 'claude-code';
const environment = app.node.tryGetContext('environment') || 'reinvent';

new ClaudeCodeStack(app, `${projectName}-${environment}`, {
  env,
  description: 'Claude Code Agent - Supporting infrastructure for AgentCore',

  // Stack configuration
  projectName,
  environment,

  // Observability
  logRetentionDays: parseInt(app.node.tryGetContext('logRetentionDays') || '7'),

  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'CDK',
  },
});
