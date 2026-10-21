process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-only-for-jest';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-only-for-jest';
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost:5432/unused';
