import { CognitoJwtVerifier } from 'aws-jwt-verify';

let verifier = null;

function getVerifier() {
  if (verifier) {
    return verifier;
  }

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_CLIENT_ID;

  if (!userPoolId || !clientId) {
    throw new Error('Missing Cognito configuration for JWT verification');
  }

  verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'access',
    clientId,
  });

  return verifier;
}

export async function auth(request) {
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
    const jwtPayload = await getVerifier().verify(token);

    if (!jwtPayload.sub) {
      throw new Error('Token missing subject claim');
    }

    // Extract userId from Cognito sub claim
    request.userId = jwtPayload.sub;
  } catch (error) {
    console.warn('Token validation failed:', error.message);
    throw {
      statusCode: 401,
      body: { error: 'Invalid token' },
    };
  }
}
