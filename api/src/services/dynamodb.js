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
