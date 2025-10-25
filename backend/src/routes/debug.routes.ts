/**
 * Debug endpoint to test JWT token parsing
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const router: Router = Router();

router.post('/debug/token', (req: Request, res: Response) => {
  try {
    const token = req.body.token || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({ error: 'No token provided' });
    }

    // Decode without verification first
    const decoded = jwt.decode(token);
    logger.info({ decoded }, 'Token decoded (no verification):');

    // Verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET!) as any;
    logger.info({ verified }, 'Token verified:');

    res.json({
      success: true,
      decoded,
      verified,
      fields: {
        id: verified.id,
        userId: verified.userId,
        username: verified.username,
        email: verified.email
      }
    });
  } catch (error) {
    logger.error('Token debug error:', error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : 'Token verification failed' 
    });
  }
});

export default router;