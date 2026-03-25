import { Router } from 'express';
import auth from '../middleware/auth.js';
import adminAuth from '../middleware/adminAuth.js';
import pool from '../config/db.js';

const router = Router();

router.use(auth, adminAuth);

router.get('/users', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
            COUNT(DISTINCT h.id)::int AS habit_count,
            COUNT(DISTINCT hl.id)::int AS total_logs,
            MAX(hl.logged_date) AS last_active
     FROM users u
     LEFT JOIN habits h ON h.user_id = u.id
     LEFT JOIN habit_logs hl ON hl.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

router.get('/habits', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT h.id, h.name, h.user_id, u.email AS user_email, h.frequency,
            h.is_active, h.created_at, h.color,
            COUNT(hl.id)::int AS log_count
     FROM habits h
     JOIN users u ON u.id = h.user_id
     LEFT JOIN habit_logs hl ON hl.habit_id = h.id
     GROUP BY h.id, u.email
     ORDER BY log_count DESC, h.created_at DESC`
  );
  res.json(rows);
});

router.get('/stats', async (req, res) => {
  const [
    totalUsersResult,
    habitsResult,
    logsTodayResult,
    logsThisWeekResult,
    logsPerDayResult,
    newUsersThisWeekResult,
    streakLeadersResult,
  ] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS total_users FROM users'),
    pool.query('SELECT COUNT(*)::int AS total_habits, COUNT(*) FILTER (WHERE is_active = true)::int AS active_habits FROM habits'),
    pool.query("SELECT COUNT(*)::int AS logs_today FROM habit_logs WHERE logged_date = CURRENT_DATE"),
    pool.query("SELECT COUNT(*)::int AS logs_this_week FROM habit_logs WHERE logged_date >= DATE_TRUNC('week', CURRENT_DATE)::date"),
    pool.query(
      `SELECT day::date AS date, COUNT(hl.id)::int AS count
       FROM generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, INTERVAL '1 day') AS day
       LEFT JOIN habit_logs hl ON hl.logged_date = day::date
       GROUP BY day
       ORDER BY day`
    ),
    pool.query("SELECT COUNT(*)::int AS new_users_this_week FROM users WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)"),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS streak_leaders
      FROM (
        SELECT user_id, COUNT(*) AS consecutive
        FROM habit_logs
        WHERE logged_date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY user_id
        HAVING COUNT(*) >= 5
      ) AS active_streakers
    `),
  ]);

  res.json({
    total_users: totalUsersResult.rows[0].total_users,
    total_habits: habitsResult.rows[0].total_habits,
    active_habits: habitsResult.rows[0].active_habits,
    logs_today: logsTodayResult.rows[0].logs_today,
    logs_this_week: logsThisWeekResult.rows[0].logs_this_week,
    logs_per_day: logsPerDayResult.rows,
    new_users_this_week: newUsersThisWeekResult.rows[0].new_users_this_week,
    streak_leaders: streakLeadersResult.rows[0].streak_leaders,
  });
});

router.get('/analytics', async (req, res) => {
  const [
    userGrowth,
    completionTrend,
    dayOfWeek,
    topHabits,
    retentionResult,
  ] = await Promise.all([
    pool.query(`
      SELECT day::date AS date, COUNT(u.id)::int AS new_users
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS day
      LEFT JOIN users u ON u.created_at::date = day::date
      GROUP BY day ORDER BY day
    `),
    pool.query(`
      SELECT day::date AS date,
        COUNT(hl.id)::int AS total_logs,
        (SELECT COUNT(*)::int FROM habits WHERE is_active = true) AS active_habits
      FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS day
      LEFT JOIN habit_logs hl ON hl.logged_date = day::date
      GROUP BY day ORDER BY day
    `),
    pool.query(`
      SELECT EXTRACT(DOW FROM logged_date)::int AS dow,
             COUNT(*)::int AS total_logs
      FROM habit_logs
      WHERE logged_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY dow ORDER BY dow
    `),
    pool.query(`
      SELECT h.id, h.name, h.frequency, u.email AS user_email,
             COUNT(hl.id)::int AS log_count
      FROM habits h
      JOIN users u ON u.id = h.user_id
      LEFT JOIN habit_logs hl ON hl.habit_id = h.id
      WHERE h.is_active = true
      GROUP BY h.id, h.name, h.frequency, u.email
      ORDER BY log_count DESC LIMIT 10
    `),
    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS active_this_week
      FROM habit_logs
      WHERE logged_date >= DATE_TRUNC('week', CURRENT_DATE)::date
    `),
  ]);

  res.json({
    user_growth: userGrowth.rows,
    completion_trend: completionTrend.rows,
    day_of_week: dayOfWeek.rows,
    top_habits: topHabits.rows,
    active_this_week: retentionResult.rows[0].active_this_week,
  });
});

router.get('/activity', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT hl.id, hl.logged_date, hl.created_at,
           u.email AS user_email, u.full_name AS user_name,
           h.name AS habit_name, h.color AS habit_color, h.frequency
    FROM habit_logs hl
    JOIN habits h ON h.id = hl.habit_id
    JOIN users u ON u.id = hl.user_id
    ORDER BY hl.created_at DESC LIMIT 50
  `);
  res.json(rows);
});

router.get('/users/:id', async (req, res) => {
  const userId = req.params.id;

  // Get user info
  const { rows: userRows } = await pool.query(
    `SELECT id, email, full_name, role, is_active, created_at, updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (!userRows[0]) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get user's habits
  const { rows: habits } = await pool.query(
    `SELECT h.id, h.name, h.description, h.color, h.icon, h.frequency, 
            h.target_days, h.is_active, h.created_at,
            COUNT(hl.id)::int AS log_count
     FROM habits h
     LEFT JOIN habit_logs hl ON hl.habit_id = h.id
     WHERE h.user_id = $1
     GROUP BY h.id
     ORDER BY h.created_at DESC`,
    [userId]
  );

  // Get recent activity (last 30 days of logs)
  const { rows: recentActivity } = await pool.query(
    `SELECT hl.id, hl.logged_date, hl.note, hl.created_at,
            h.name AS habit_name, h.color AS habit_color
     FROM habit_logs hl
     JOIN habits h ON h.id = hl.habit_id
     WHERE hl.user_id = $1 AND hl.logged_date >= CURRENT_DATE - INTERVAL '30 days'
     ORDER BY hl.logged_date DESC, hl.created_at DESC
     LIMIT 100`,
    [userId]
  );

  res.json({
    user: userRows[0],
    habits,
    recent_activity: recentActivity,
  });
});

router.get('/habits/:id', async (req, res) => {
  const habitId = req.params.id;

  const { rows } = await pool.query(
    `SELECT h.*, u.email AS user_email,
            COUNT(hl.id)::int AS log_count
     FROM habits h
     JOIN users u ON u.id = h.user_id
     LEFT JOIN habit_logs hl ON hl.habit_id = h.id
     WHERE h.id = $1
     GROUP BY h.id, u.email`,
    [habitId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  res.json(rows[0]);
});

router.put('/habits/:id', async (req, res) => {
  const habitId = req.params.id;
  const { name, description, color, icon, frequency, is_active } = req.body;

  const { rows } = await pool.query(
    `UPDATE habits 
     SET name = COALESCE($1, name),
         description = COALESCE($2, description),
         color = COALESCE($3, color),
         icon = COALESCE($4, icon),
         frequency = COALESCE($5, frequency),
         is_active = COALESCE($6, is_active),
         updated_at = NOW()
     WHERE id = $7
     RETURNING *`,
    [name, description, color, icon, frequency, is_active, habitId]
  );

  if (!rows[0]) {
    return res.status(404).json({ error: 'Habit not found' });
  }

  res.json(rows[0]);
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either admin or user' });
  }
  const { rows } = await pool.query(
    'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, created_at',
    [role, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.patch('/users/:id/status', async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active must be a boolean' });
  }
  const { rows } = await pool.query(
    'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, is_active',
    [is_active, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.delete('/users/:id', async (req, res) => {
  await pool.query('DELETE FROM habit_logs WHERE user_id = $1', [req.params.id]);
  await pool.query('DELETE FROM habits WHERE user_id = $1', [req.params.id]);
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
  res.status(204).send();
});

export default router;
