const router = require('express').Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const pool = require('../config/db');

router.use(auth, adminAuth);

router.get('/users', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.role, u.created_at, COUNT(h.id)::int AS habit_count
       FROM users u
       LEFT JOIN habits h ON h.user_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/habits', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT h.id, h.name, h.user_id, u.email AS user_email, h.frequency, h.is_active, h.created_at
       FROM habits h
       JOIN users u ON u.id = h.user_id
       ORDER BY h.created_at DESC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsersResult,
      habitsResult,
      logsTodayResult,
      logsThisWeekResult,
      logsPerDayResult,
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
    ]);

    res.json({
      total_users: totalUsersResult.rows[0].total_users,
      total_habits: habitsResult.rows[0].total_habits,
      active_habits: habitsResult.rows[0].active_habits,
      logs_today: logsTodayResult.rows[0].logs_today,
      logs_this_week: logsThisWeekResult.rows[0].logs_this_week,
      logs_per_day: logsPerDayResult.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;

  if (!role || !['admin', 'user'].includes(role)) {
    return res.status(400).json({ error: 'Role must be either admin or user' });
  }

  try {
    const { rows } = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, full_name, role, created_at',
      [role, req.params.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
