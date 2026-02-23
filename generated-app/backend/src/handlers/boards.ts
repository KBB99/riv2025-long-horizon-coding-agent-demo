import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UpdateBoardSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, keys, PutCommand, GetCommand } from '../lib/db';
import { success, error, notFound, serverError } from '../lib/response';

const DEFAULT_COLUMNS = [
  { id: crypto.randomUUID(), name: 'To Do', statusCategory: 'todo' as const, sortOrder: 0, color: '#8896A6' },
  { id: crypto.randomUUID(), name: 'In Progress', statusCategory: 'in_progress' as const, sortOrder: 1, color: '#2196F3' },
  { id: crypto.randomUUID(), name: 'In Review', statusCategory: 'in_progress' as const, sortOrder: 2, color: '#E9C46A' },
  { id: crypto.randomUUID(), name: 'Done', statusCategory: 'done' as const, sortOrder: 3, color: '#40916C' },
];

export async function getBoard(projectId: string) {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: keys.board(projectId),
    }));

    if (result.Item) {
      return success(result.Item.data);
    }

    // Create default board if none exists
    const now = new Date().toISOString();
    const board = {
      id: crypto.randomUUID(),
      projectId,
      name: 'Board',
      columns: DEFAULT_COLUMNS,
      swimlaneBy: 'none' as const,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...keys.board(projectId),
        data: board,
        entityType: 'BOARD',
      },
    }));

    return success(board);
  } catch (e) {
    console.error('getBoard error:', e);
    return serverError();
  }
}

export async function updateBoard(boardId: string, event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body || '{}');
    const parsed = UpdateBoardSchema.parse(body);

    // Find the board by scanning (boardId is stored in the data)
    const { ScanCommand } = await import('../lib/db');
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et',
      ExpressionAttributeValues: { ':et': 'BOARD' },
    }));

    const boardItem = (scanResult.Items || []).find(item => item.data?.id === boardId);
    if (!boardItem) return notFound('Board not found');

    const now = new Date().toISOString();
    const updated = {
      ...boardItem.data,
      ...parsed,
      updatedAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...{ PK: boardItem.PK, SK: boardItem.SK },
        data: updated,
        entityType: 'BOARD',
      },
    }));

    return success(updated);
  } catch (e: any) {
    console.error('updateBoard error:', e);
    if (e.name === 'ZodError') return error(e.message, 400, 'VALIDATION_ERROR');
    return serverError();
  }
}
