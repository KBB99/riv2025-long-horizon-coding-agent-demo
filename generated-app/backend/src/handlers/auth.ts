/**
 * Auth handler - register, login, and get current user
 * Uses Node.js crypto for password hashing and token generation (no external dependencies)
 */
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { RegisterSchema, LoginSchema } from '@canopy/shared';
import { docClient, TABLE_NAME, PutCommand, GetCommand, QueryCommand } from '../lib/db';
import { success, error, created } from '../lib/response';
import { createHash, randomBytes, timingSafeEqual, createHmac } from 'crypto';

// Secret for signing tokens - in production use AWS Secrets Manager
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'canopy-auth-secret-key-2026';
const TOKEN_EXPIRY_HOURS = 24 * 7; // 7 days

// ---- Password hashing using PBKDF2-like approach with crypto ----

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const useSalt = salt || randomBytes(32).toString('hex');
  const hash = createHash('sha256')
    .update(password + useSalt)
    .digest('hex');
  return { hash, salt: useSalt };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
  } catch {
    return false;
  }
}

// ---- Token generation and verification ----

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

function createToken(userId: string, email: string): string {
  const payload: TokenPayload = {
    userId,
    email,
    exp: Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expectedSig = createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload: TokenPayload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

// ---- DynamoDB key helpers for users ----

const userKeys = {
  byId: (id: string) => ({ PK: `USER#${id}`, SK: 'METADATA' }),
  byEmail: (email: string) => ({ PK: `EMAIL#${email}`, SK: 'USER_LOOKUP' }),
};

// ---- Handlers ----

export async function register(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body || '{}');
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR');
  }

  const { name, email, password } = parsed.data;

  // Check if email already exists
  try {
    const existing = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: userKeys.byEmail(email),
    }));
    if (existing.Item) {
      return error('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }
  } catch (e) {
    console.error('Error checking email:', e);
  }

  const userId = crypto.randomUUID();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const userRecord = {
    ...userKeys.byId(userId),
    id: userId,
    name,
    email,
    passwordHash: hash,
    passwordSalt: salt,
    role: 'member',
    createdAt: now,
    updatedAt: now,
    entityType: 'USER',
  };

  const emailLookup = {
    ...userKeys.byEmail(email),
    userId,
    entityType: 'EMAIL_LOOKUP',
  };

  // Write user and email lookup
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: userRecord }));
  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: emailLookup }));

  const token = createToken(userId, email);

  return created({
    token,
    user: {
      id: userId,
      name,
      email,
      role: 'member',
      createdAt: now,
    },
  });
}

export async function login(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body || '{}');
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR');
  }

  const { email, password } = parsed.data;

  // Look up email to get userId
  const emailLookup = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: userKeys.byEmail(email),
  }));

  if (!emailLookup.Item) {
    return error('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const userId = emailLookup.Item.userId as string;

  // Get user record
  const userResult = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: userKeys.byId(userId),
  }));

  if (!userResult.Item) {
    return error('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const user = userResult.Item;

  // Verify password
  if (!verifyPassword(password, user.passwordHash as string, user.passwordSalt as string)) {
    return error('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const token = createToken(userId, email);

  return success({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'member',
      createdAt: user.createdAt,
    },
  });
}

export async function getMe(event: APIGatewayProxyEventV2) {
  // Extract token from Authorization header
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return error('Authentication required', 401, 'UNAUTHORIZED');
  }

  const payload = verifyToken(token);
  if (!payload) {
    return error('Invalid or expired token', 401, 'UNAUTHORIZED');
  }

  // Get user record
  const userResult = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: userKeys.byId(payload.userId),
  }));

  if (!userResult.Item) {
    return error('User not found', 404, 'NOT_FOUND');
  }

  const user = userResult.Item;

  return success({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'member',
    createdAt: user.createdAt,
  });
}
