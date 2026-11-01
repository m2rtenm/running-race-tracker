import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const STATE_TTL_SECONDS = 10 * 60;

export function createStravaOAuthState(userId, clientSecret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: Math.floor(now / 1000),
    nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url');
  const signature = createHmac('sha256', clientSecret).update(payload).digest('base64url');

  return `${payload}.${signature}`;
}

export function isValidStravaOAuthState(state, userId, clientSecret, now = Date.now()) {
  if (typeof state !== 'string' || state.length > 1024 || typeof userId !== 'string') {
    return false;
  }

  const parts = state.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [payload, signature] = parts;
  const expectedSignature = createHmac('sha256', clientSecret).update(payload).digest();
  const providedSignature = Buffer.from(signature, 'base64url');
  if (providedSignature.length !== expectedSignature.length
      || !timingSafeEqual(providedSignature, expectedSignature)) {
    return false;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const nowSeconds = Math.floor(now / 1000);
    return claims.sub === userId
      && typeof claims.nonce === 'string'
      && claims.nonce.length > 0
      && Number.isInteger(claims.iat)
      && claims.iat <= nowSeconds
      && nowSeconds - claims.iat <= STATE_TTL_SECONDS;
  } catch {
    return false;
  }
}
