import { createClient } from '@libsql/client/http.js';

export function createDb() {
  return createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });
}
