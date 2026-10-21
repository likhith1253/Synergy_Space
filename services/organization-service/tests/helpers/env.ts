process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-for-org-jest';
process.env.DATABASE_URL = 'postgresql://unused:unused@localhost:5432/unused';
process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_not_a_real_secret';
process.env.CLIENT_URL = 'https://app.example.test';
