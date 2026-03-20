import pool from '../config/db.js';

export const log = async (req, res) => {
  const { habit_id, logged_date, note } = req.body;
  if (!habit_id || !logged_date) return res.status(400).json({ error: 'Habit ID and logged date are required' });
  const { rows } = await pool.query(
    `INSERT INTO habit_logs (habit_id, user_id, logged_date, note) 
     VALUES ($1,$2,$3,$4) 
     ON CONFLICT (habit_id, logged_date) DO UPDATE SET note=EXCLUDED.note, created_at=NOW() RETURNING *`,
    [habit_id, req.user.id, logged_date, note || null]
  );
  res.status(201).json(rows[0]);
};

export const getByDate = async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'Date query parameter required' });
  const { rows } = await pool.query(
    `SELECT hl.*, h.name, h.color, h.icon 
     FROM habit_logs hl 
     JOIN habits h ON h.id = hl.habit_id 
     WHERE hl.user_id=$1 AND hl.logged_date=$2`,
    [req.user.id, date]
  );
  res.json(rows);
};

export const remove = async (req, res) => {
  const { rowCount } = await pool.query(
    'DELETE FROM habit_logs WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: 'Log not found or unauthorized' });
  res.status(204).send();
};

export const getStreak = async (req, res) => {
  const { rows } = await pool.query(
    `SELECT habit_id, COUNT(*) as streak, MAX(logged_date) as last_logged 
     FROM (
       SELECT habit_id, logged_date,
         logged_date - ROW_NUMBER() OVER (PARTITION BY habit_id ORDER BY logged_date)::int AS grp
       FROM habit_logs WHERE user_id=$1
     ) t 
     GROUP BY habit_id, grp 
     HAVING COUNT(*) >= 1
     ORDER BY streak DESC`,
    [req.user.id]
  );
  res.json(rows);
};

export const getRange = async (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to are required' });
  const { rows } = await pool.query(
    `SELECT hl.id, hl.habit_id, hl.logged_date::text, hl.note, hl.created_at
     FROM habit_logs hl
     WHERE hl.user_id = $1 AND hl.logged_date BETWEEN $2 AND $3
     ORDER BY hl.logged_date DESC`,
    [req.user.id, from, to]
  );
  res.json(rows);
};
