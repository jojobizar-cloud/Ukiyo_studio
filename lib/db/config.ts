const defaultNeonHost = "ep-purple-snow-as3okmro-pooler.c-4.eu-central-1.aws.neon.tech";
const defaultNeonDatabase = "neondb";
const defaultNeonUser = "neondb_owner";

function getTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();

  return value && value.length > 0 ? value : null;
}

export function getDatabaseUrl() {
  const directUrl =
    getTrimmedEnv("DATABASE_URL") ??
    getTrimmedEnv("POSTGRES_URL") ??
    getTrimmedEnv("NEON_DATABASE_URL");

  if (directUrl) {
    return directUrl;
  }

  const neonPassword = getTrimmedEnv("NEON_PASSWORD");

  if (!neonPassword) {
    return null;
  }

  const neonUser = getTrimmedEnv("NEON_USER") ?? defaultNeonUser;
  const neonHost = getTrimmedEnv("NEON_HOST") ?? defaultNeonHost;
  const neonDatabase = getTrimmedEnv("NEON_DATABASE") ?? defaultNeonDatabase;

  return `postgresql://${encodeURIComponent(neonUser)}:${encodeURIComponent(
    neonPassword,
  )}@${neonHost}/${encodeURIComponent(neonDatabase)}?sslmode=require`;
}

export function hasDatabaseConfig() {
  return Boolean(getDatabaseUrl());
}
