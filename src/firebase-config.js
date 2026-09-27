export function resolveDataMode(env = import.meta.env || {}) {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID'
  ];

  const hasFirebaseConfig = requiredKeys.every((key) => typeof env[key] === 'string' && env[key].trim().length > 0);
  return hasFirebaseConfig ? 'cloud' : 'local';
}
