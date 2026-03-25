import { Router } from 'express';
import bcrypt from 'bcryptjs';
import auth from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import pool from '../config/db.js';

const router = Router();

router.get('/me', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id=$1',
    [req.user.id]
  );
  res.json(rows[0] || null);
});

router.put('/me', auth, validate(schemas.updateProfile), async (req, res) => {
  const { full_name, current_password, new_password } = req.body;
  const userId = req.user.id;

  // If changing password, verify current password first
  if (new_password) {
    const { rows: userRows } = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (!userRows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(current_password, userRows[0].password_hash);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
  }

  // Build update query dynamically
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (full_name !== undefined) {
    updates.push(`full_name = $${paramIndex++}`);
    values.push(full_name);
  }

  if (new_password) {
    const hash = await bcrypt.hash(new_password, 12);
    updates.push(`password_hash = $${paramIndex++}`);
    values.push(hash);
  }

  updates.push(`updated_at = NOW()`);
  values.push(userId);

  const { rows } = await pool.query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, role, created_at, updated_at`,
    values
  );

  res.json(rows[0]);
});

export default router;
