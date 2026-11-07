import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { connectDB } from '../src/config/db.js';

describe('AgriSense Phase 2 - Authentication & Authorization Test Suite', () => {
  let server;
  let baseUrl;
  const testEmail = `test_farmer_${Date.now()}@agrisense.test`;
  const testPassword = 'Password123!';
  let authToken = '';

  before(async () => {
    // Connect to database
    await connectDB();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test user
    try {
      await User.deleteMany({ email: { $regex: /@agrisense\.test$/ } });
    } catch {
      // Ignore cleanup error
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Successful Registration
  it('1. Should successfully register a new Farmer account', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Farmer',
        email: testEmail,
        password: testPassword,
        phone: '+1-555-0199',
        location: 'Sector 4 Agro Valley',
        role: 'farmer',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.token, 'Token should be returned');
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.role, 'farmer');
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must never be exposed');
    authToken = data.token;
  });

  // 2. Duplicate Email Registration
  it('2. Should reject registration with duplicate email address', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Farmer',
        email: testEmail,
        password: testPassword,
        role: 'farmer',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
    assert.match(data.message, /already exists/i);
  });

  // 3. Invalid Email Format
  it('3. Should reject registration with invalid email format', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid Email Farmer',
        email: 'invalid-email-format',
        password: testPassword,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /valid email/i);
  });

  // 4. Weak Password (< 8 characters or no number)
  it('4. Should reject registration with weak password (< 8 chars or missing number/letter)', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass Farmer',
        email: `weak_${Date.now()}@agrisense.test`,
        password: 'short',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /at least 8 characters/i);
  });

  // 5. Admin Registration Prevention
  it('5. Should strictly prevent public users from registering as Admin', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `admin_attempt_${Date.now()}@agrisense.test`,
        password: testPassword,
        role: 'admin',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
    assert.match(data.message, /Admin/i);
  });

  // 6. Missing Credentials on Login
  it('6. Should reject login with missing credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '',
        password: '',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });

  // 7. Incorrect Password
  it('7. Should reject login with incorrect password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.match(data.message, /Invalid email or password/i);
  });

  // 8. Successful Login
  it('8. Should successfully log in with valid credentials', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.passwordHash, undefined);
    authToken = data.token; // refresh token
  });

  // 9. Current-User Endpoint (/api/auth/me) with Valid Token
  it('9. Should return current user profile via GET /api/auth/me with valid JWT', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.email, testEmail);
    assert.equal(data.user.passwordHash, undefined);
  });

  // 10. Unauthorized Access Without Token
  it('10. Should reject GET /api/auth/me when token is missing', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  // 11. Unauthorized Access With Invalid Token
  it('11. Should reject GET /api/auth/me when token is invalid or malformed', async () => {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer invalid.token.payload',
      },
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

