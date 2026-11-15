import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/schema.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'sahayakshg-hackathon-prototype-secret';
export const SESSION_COOKIE_NAME = 'sahayak_session';

export interface AuthUser {
  id: string;
  groupId: string;
  name: string;
  phone: string;
  role: 'leader' | 'member';
  memberId: string | null;
  preferredLanguage: 'en' | 'te' | 'hi' | 'kn';
  isDemo: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function signSessionToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: string };
    return parsed.uid || null;
  } catch {
    return null;
  }
}

export function loadUserById(userId: string): AuthUser | null {
  const row = db
    .prepare(
      `SELECT u.id, u.group_id, u.name, u.phone, u.role, u.preferred_language, u.is_demo, m.id as member_id
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
       WHERE u.id = ?`
    )
    .get(userId) as
    | {
        id: string;
        group_id: string;
        name: string;
        phone: string;
        role: 'leader' | 'member';
        preferred_language: 'en' | 'te' | 'hi' | 'kn';
        is_demo: number;
        member_id: string | null;
      }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    phone: row.phone,
    role: row.role,
    memberId: row.member_id,
    preferredLanguage: row.preferred_language,
    isDemo: Boolean(row.is_demo),
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in with a demo account.' });
    return;
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session.' });
    return;
  }

  const user = loadUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.user = user;
  next();
}

export function requireLeader(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  if (req.user.role !== 'leader') {
    res.status(403).json({
      error: 'Access denied. Only an SHG Leader can perform this action.',
    });
    return;
  }
  next();
}

export function verifyPin(pin: string, expectedHash: string): boolean {
  const hashed = crypto.createHash('sha256').update(`sahayakshg:${pin}`).digest('hex');
  return hashed === expectedHash;
}
