import jwt from 'jsonwebtoken';

export async function auth(request, event) {
  // Skip auth for health check
  if (request.path === '/health') {
    return;
  }

  const authHeader = request.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    throw {
      statusCode: 401,
      body: { error: 'Missing authorization token' },
    };
  }

  try {
    // Verify token structure (without full JWT validation - you'd need Cognito keys)
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || !decoded.payload.sub) {
      throw new Error('Invalid token');
    }

    // Extract userId from Cognito sub claim
    request.userId = decoded.payload.sub;
  } catch (error) {
    console.warn('Token validation warning:', error.message);
    throw {
      statusCode: 401,
      body: { error: 'Invalid token' },
    };
  }
}
