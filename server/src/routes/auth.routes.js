const express = require('express');
const { z } = require('zod');
const { register, login, resetPassword, getMe } = require('../controllers/auth.controller');
const { validate } = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50, 'Name must not exceed 50 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password is too long'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100, 'Password is too long'),
});

router.post('/register', validate({ body: registerSchema }), register);
router.post('/login', validate({ body: loginSchema }), login);
router.post('/reset-password', validate({ body: resetPasswordSchema }), resetPassword);
router.get('/me', authMiddleware, getMe);

module.exports = router;
