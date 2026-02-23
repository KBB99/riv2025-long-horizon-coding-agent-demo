import type { APIGatewayProxyResultV2 } from 'aws-lambda';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

export function success(body: unknown, statusCode = 200): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

export function error(message: string, statusCode = 400, code = 'BAD_REQUEST'): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: { code, message },
    }),
  };
}

export function notFound(message = 'Resource not found'): APIGatewayProxyResultV2 {
  return error(message, 404, 'NOT_FOUND');
}

export function serverError(message = 'Internal server error'): APIGatewayProxyResultV2 {
  return error(message, 500, 'INTERNAL_ERROR');
}
