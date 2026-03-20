import { Router } from 'express';
import auth from '../middleware/auth.js';
import pool from '../config/db.js';

const router = Router();

router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json(rows[0] || null);
});

export default router;
