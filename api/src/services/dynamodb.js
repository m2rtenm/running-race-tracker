import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
export const docClient = DynamoDBDocumentClient.from(client);

const RACES_TABLE = process.env.RACES_TABLE_NAME || 'running-race-tracker-races';
const STRAVA_TABLE = process.env.STRAVA_IMPORTS_TABLE_NAME || 'running-race-tracker-strava-imports';

// ============================================================================
// RACES SERVICE
// ============================================================================

export async function listRacesByUser(userId) {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: RACES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': userId },
        ScanIndexForward: false,
      })
    );
    return result.Items || [];
  } catch (error) {
    console.error('Error listing races:', error);
    throw error;
  }
}

export async function getRaceById(userId, raceId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: RACES_TABLE,
        Key: { userId, raceId },
      })
    );
    return result.Item || null;
  } catch (error) {
    console.error('Error getting race:', error);
    throw error;
  }
}

export async function createRace(userId, race) {
  try {
    const item = {
      ...race,
      userId,
      raceId: race.raceId || crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: RACES_TABLE,
        Item: item,
      })
    );

    return item;
  } catch (error) {
    console.error('Error creating race:', error);
    throw error;
  }
}

export async function updateRace(userId, raceId, updates) {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: RACES_TABLE,
        Key: { userId, raceId },
        UpdateExpression: 'SET #updates, updatedAt = :now',
        ExpressionAttributeNames: { '#updates': Object.keys(updates)[0] },
        ExpressionAttributeValues: {
          ':now': new Date().toISOString(),
          ...Object.fromEntries(Object.entries(updates).map(([k, v], i) => [`:v${i}`, v])),
        },
        ReturnValues: 'ALL_NEW',
      })
    );
    return result.Attributes;
  } catch (error) {
    console.error('Error updating race:', error);
    throw error;
  }
}

export async function deleteRace(userId, raceId) {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: RACES_TABLE,
        Key: { userId, raceId },
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Error deleting race:', error);
    throw error;
  }
}

// ============================================================================
// STRAVA IMPORTS SERVICE
// ============================================================================

export async function createStravaImport(userId, importData) {
  try {
    const item = {
      userId,
      importId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      stravaToken: importData.stravaToken,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiryDate: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // TTL: 7 days
    };

    await docClient.send(
      new PutCommand({
        TableName: STRAVA_TABLE,
        Item: item,
      })
    );

    return item;
  } catch (error) {
    console.error('Error creating strava import:', error);
    throw error;
  }
}

export async function getStravaImport(userId, importId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: STRAVA_TABLE,
        Key: { userId, importId },
      })
    );
    return result.Item || null;
  } catch (error) {
    console.error('Error getting strava import:', error);
    throw error;
  }
}

// ============================================================================
// STRAVA TOKEN STORAGE (stored in strava_imports with fixed importId)
// ============================================================================

const STRAVA_TOKEN_KEY = 'strava_oauth_tokens';

export async function saveStravaTokens(userId, tokens) {
  try {
    const item = {
      userId,
      importId: STRAVA_TOKEN_KEY,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expires_at, // Unix timestamp
      athleteId: tokens.athlete?.id,
      athleteName: tokens.athlete ? `${tokens.athlete.firstname} ${tokens.athlete.lastname}` : null,
      updatedAt: new Date().toISOString(),
    };

    await docClient.send(
      new PutCommand({
        TableName: STRAVA_TABLE,
        Item: item,
      })
    );

    return item;
  } catch (error) {
    console.error('Error saving strava tokens:', error);
    throw error;
  }
}

export async function getStravaTokens(userId) {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: STRAVA_TABLE,
        Key: { userId, importId: STRAVA_TOKEN_KEY },
      })
    );
    return result.Item || null;
  } catch (error) {
    console.error('Error getting strava tokens:', error);
    throw error;
  }
}

export async function deleteStravaTokens(userId) {
  try {
    await docClient.send(
      new DeleteCommand({
        TableName: STRAVA_TABLE,
        Key: { userId, importId: STRAVA_TOKEN_KEY },
      })
    );
    return { success: true };
  } catch (error) {
    console.error('Error deleting strava tokens:', error);
    throw error;
  }
}

export async function getStravaImportedActivityIds(userId) {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: RACES_TABLE,
        KeyConditionExpression: 'userId = :userId',
        FilterExpression: 'attribute_exists(stravaId)',
        ExpressionAttributeValues: { ':userId': userId },
        ProjectionExpression: 'stravaId',
      })
    );
    return (result.Items || []).map((item) => item.stravaId);
  } catch (error) {
    console.error('Error getting imported Strava activity IDs:', error);
    throw error;
  }
}
