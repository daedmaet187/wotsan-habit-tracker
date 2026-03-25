import pool from '../config/db.js';

export const getAll = async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json(rows);
};

export const create = async (req, res) => {
  const { name, description, color, icon, frequency, target_days } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO habits (user_id, name, description, color, icon, frequency, target_days) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [req.user.id, name, description, color, icon, frequency, target_days ?? 1]
  );
  res.status(201).json(rows[0]);
};

export const update = async (req, res) => {
  const { name, description, color, icon, frequency, target_days, is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE habits SET name=$1, description=$2, color=$3, icon=$4, frequency=$5, target_days=$6, is_active=COALESCE($7, is_active), updated_at=NOW() WHERE id=$8 AND user_id=$9 RETURNING *',
    [name, description, color, icon, frequency, target_days, is_active, req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Habit not found or unauthorized' });
  res.json(rows[0]);
};

export const remove = async (req, res) => {
  const { rowCount } = await pool.query('UPDATE habits SET is_active=false WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Habit not found or unauthorized' });
  res.status(204).send();
};

export const getOne = async (req, res) => {
  const habitId = req.params.id;
  const userId = req.user.id;

  // Get habit with log count
  const { rows: habitRows } = await pool.query(
    `SELECT h.*, 
            (SELECT COUNT(*) FROM habit_logs WHERE habit_id = h.id) as log_count
     FROM habits h 
     WHERE h.id = $1 AND h.user_id = $2`,
    [habitId, userId]
  );

  if (!habitRows[0]) {
    return res.status(404).json({ error: 'Habit not found or unauthorized' });
  }

  // Calculate current streak (consecutive days from today going backwards)
  const { rows: streakRows } = await pool.query(
    `WITH dated_logs AS (
      SELECT DISTINCT logged_date::date as log_date
      FROM habit_logs
      WHERE habit_id = $1
      ORDER BY log_date DESC
    ),
    with_gaps AS (
      SELECT log_date, 
             log_date - (ROW_NUMBER() OVER (ORDER BY log_date DESC))::int AS grp
      FROM dated_logs
    )
    SELECT COUNT(*)::int as streak
    FROM with_gaps
    WHERE grp = (SELECT grp FROM with_gaps WHERE log_date = CURRENT_DATE LIMIT 1)`,
    [habitId]
  );

  const habit = habitRows[0];
  habit.current_streak = streakRows[0]?.streak || 0;

  res.json(habit);
};
