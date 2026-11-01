import test from 'node:test';
import assert from 'node:assert/strict';
import { createStravaOAuthState, isValidStravaOAuthState } from './stravaOAuthState.js';

const userId = 'user-123';
const clientSecret = 'test-secret';
const now = Date.UTC(2026, 0, 1);

test('validates Strava OAuth state for the initiating user', () => {
  const state = createStravaOAuthState(userId, clientSecret, now);

  assert.equal(isValidStravaOAuthState(state, userId, clientSecret, now), true);
  assert.equal(isValidStravaOAuthState(state, 'other-user', clientSecret, now), false);
});

test('rejects modified, expired, future-dated, and malformed states', () => {
  const state = createStravaOAuthState(userId, clientSecret, now);
  const [payload, signature] = state.split('.');
  const modifiedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  const modifiedState = `${payload}.${modifiedSignature}`;

  assert.equal(isValidStravaOAuthState(modifiedState, userId, clientSecret, now), false);
  assert.equal(isValidStravaOAuthState(state, userId, clientSecret, now + 11 * 60 * 1000), false);
  assert.equal(isValidStravaOAuthState(state, userId, clientSecret, now - 60 * 1000), false);
  assert.equal(isValidStravaOAuthState('not-a-state', userId, clientSecret, now), false);
});
