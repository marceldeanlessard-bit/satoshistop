/**
 * Unit tests for authentication
 */

const request = require('supertest');
const app = require('../../server');
const { ValidationError, AuthenticationError } = require('../../middleware/errors');
const { validate, schemas } = require('../../middleware/validators');

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'SecurePass123!',
          username: 'testuser',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'SecurePass123!',
          username: 'testuser',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'short',
          username: 'testuser',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          username: 'user1',
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'SecurePass123!',
          username: 'user2',
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login-test@example.com',
          password: 'SecurePass123!',
          username: 'logintest',
        });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'SecurePass123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('should reject login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login-test@example.com',
          password: 'WrongPassword123!',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject login with non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePass123!',
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'refresh-test@example.com',
          password: 'SecurePass123!',
          username: 'refreshtest',
        });

      const refreshToken = registerRes.body.refreshToken;

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject refresh with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(res.statusCode).toBe(401);
    });
  });
});

describe('Validation Schemas', () => {
  describe('Register Schema', () => {
    it('should validate correct registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        username: 'testuser',
      };

      const { error } = schemas.auth.register.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const invalidData = {
        email: 'not-an-email',
        password: 'SecurePass123!',
        username: 'testuser',
      };

      const { error } = schemas.auth.register.validate(invalidData);
      expect(error).toBeDefined();
    });
  });

  describe('Product Schema', () => {
    it('should validate correct product data', async () => {
      const validData = {
        name: 'Test Product',
        description: 'This is a test product description',
        price: 99.99,
        category: 'electronics',
        stock: 10,
      };

      const { error } = schemas.product.create.validate(validData);
      expect(error).toBeUndefined();
    });

    it('should reject product without name', async () => {
      const invalidData = {
        description: 'This is a test product description',
        price: 99.99,
        category: 'electronics',
        stock: 10,
      };

      const { error } = schemas.product.create.validate(invalidData);
      expect(error).toBeDefined();
    });
  });
});
