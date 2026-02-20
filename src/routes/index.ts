import { Router, Request, Response } from 'express';

const router = Router();


/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-hub' });
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: User login
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'password') {
    return res.status(200).json({ token: 'fake-jwt-token' });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

export default router;
