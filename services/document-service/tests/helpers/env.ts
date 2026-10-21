// Runs before any module is imported: config.ts reads these at load time.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-anywhere-else';
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost:5432/unused';
