const request = require('supertest');
const app = require('../src/app');

describe('Milestone 1: Authentication API & JWT Middleware', () => {
  const validUser = {
    name: 'Alice Johnson',
    email: 'alice@example.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return a token and user details', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.name).toBe(validUser.name);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject registration with duplicate email with 409', async () => {
      await request(app).post('/api/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice Clone',
          email: validUser.email.toUpperCase(), // Test case insensitivity
          password: 'anotherpassword',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('should reject invalid input with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'A', // too short
          email: 'not-an-email',
          password: '123', // too short
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login successfully with correct credentials and return token and user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(validUser.email);
    });

    it('should reject login with wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@example.com',
          password: 'somepassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should reset password successfully and allow login with new password', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: validUser.email,
          newPassword: 'newSecretPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');

      // Old password should fail
      const oldLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password,
        });
      expect(oldLoginRes.status).toBe(401);

      // New password should succeed
      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'newSecretPassword123',
        });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body).toHaveProperty('token');
    });

    it('should reject reset for non-existent email with 404', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'nonexistent@example.com',
          newPassword: 'validPassword123',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should reject reset with password under 6 characters with 400', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: validUser.email,
          newPassword: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('JWT Auth Middleware (GET /api/auth/me)', () => {
    it('should reject request without Authorization header with 401', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject request with invalid or corrupted token with 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should allow access to protected route with valid token', async () => {
      const regRes = await request(app).post('/api/auth/register').send(validUser);
      const token = regRes.body.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(validUser.email);
      expect(res.body.user.name).toBe(validUser.name);
    });
  });
});
