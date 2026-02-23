import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = process.env.TABLE_NAME || 'canopy-main-table';

// Helper to build consistent keys
export const keys = {
  project: (id: string) => ({ PK: `PROJ#${id}`, SK: 'METADATA' }),
  issue: (id: string) => ({ PK: `ISSUE#${id}`, SK: 'METADATA' }),
  issueInProject: (projectId: string, issueId: string) => ({ PK: `PROJ#${projectId}`, SK: `ISSUE#${issueId}` }),
  sprint: (id: string) => ({ PK: `SPRINT#${id}`, SK: 'METADATA' }),
  sprintInProject: (projectId: string, sprintId: string) => ({ PK: `PROJ#${projectId}`, SK: `SPRINT#${sprintId}` }),
  board: (projectId: string) => ({ PK: `PROJ#${projectId}`, SK: 'BOARD' }),
  comment: (issueId: string, commentId: string) => ({ PK: `ISSUE#${issueId}`, SK: `COMMENT#${commentId}` }),
  attachment: (issueId: string, attachmentId: string) => ({ PK: `ISSUE#${issueId}`, SK: `ATTACHMENT#${attachmentId}` }),
  activity: (issueId: string, timestamp: string) => ({ PK: `ISSUE#${issueId}`, SK: `ACTIVITY#${timestamp}` }),
};

export { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand };
