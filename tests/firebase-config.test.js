import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDataMode } from '../src/firebase-config.js';

test('resolveDataMode prefers cloud sync when Firebase is configured', () => {
  assert.equal(resolveDataMode({
    VITE_FIREBASE_API_KEY: 'abc',
    VITE_FIREBASE_AUTH_DOMAIN: 'demo.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'demo-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'demo.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
    VITE_FIREBASE_APP_ID: '456'
  }), 'cloud');

  assert.equal(resolveDataMode({}), 'local');
});
