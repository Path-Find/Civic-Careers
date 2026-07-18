import { createClient } from '@libsql/client/http';

export function createDb() {
  const url = process.env.TURSO_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error('GovJobs database configuration is missing TURSO_URL or TURSO_AUTH_TOKEN');
  }

  return createClient({
    url,
    authToken,
  });
}
