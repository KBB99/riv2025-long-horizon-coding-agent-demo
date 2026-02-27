import { z } from 'zod';

// Registration schema
export const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// Login schema
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Auth user (returned after login/register, no password)
export const AuthUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  createdAt: z.string().datetime(),
});

// Token response from login/register
export const AuthTokenResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});
