const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME || 'running-race-tracker';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

async function listRaces() {
  const result = await docClient.send(new ScanCommand({ TableName: tableName }));
  return result.Items || [];
}

async function getRace(id) {
  const result = await docClient.send(new GetCommand({ TableName: tableName, Key: { raceId: id } }));
  return result.Item || null;
}

async function saveRace(race) {
  await docClient.send(new PutCommand({ TableName: tableName, Item: race }));
  return race;
}

async function deleteRace(id) {
  await docClient.send(new DeleteCommand({ TableName: tableName, Key: { raceId: id } }));
  return { success: true };
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return json(200, {});
  }

  try {
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.rawPath || event.path || '';
    const segments = path.split('/').filter(Boolean);
    const raceId = segments[1] || null;

    if (method === 'GET' && segments.length === 1 && segments[0] === 'races') {
      return json(200, await listRaces());
    }

    if (method === 'GET' && raceId) {
      const race = await getRace(raceId);
      return race ? json(200, race) : json(404, { message: 'Race not found' });
    }

    if (method === 'POST' && segments[0] === 'races') {
      const payload = JSON.parse(event.body || '{}');
      const race = {
        raceId: payload.raceId || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        competitionName: payload.competitionName,
        date: payload.date,
        officialDistance: payload.officialDistance,
        officialResult: payload.officialResult,
        officialResultSeconds: payload.officialResultSeconds,
        actualDistance: payload.actualDistance,
        createdAt: new Date().toISOString(),
      };
      return json(200, await saveRace(race));
    }

    if (method === 'PUT' && raceId) {
      const payload = JSON.parse(event.body || '{}');
      const race = {
        raceId,
        competitionName: payload.competitionName,
        date: payload.date,
        officialDistance: payload.officialDistance,
        officialResult: payload.officialResult,
        officialResultSeconds: payload.officialResultSeconds,
        actualDistance: payload.actualDistance,
        createdAt: payload.createdAt || new Date().toISOString(),
      };
      return json(200, await saveRace(race));
    }

    if (method === 'DELETE' && raceId) {
      return json(200, await deleteRace(raceId));
    }

    return json(404, { message: 'Route not found' });
  } catch (error) {
    return json(500, { message: error.message || 'Internal server error' });
  }
};
