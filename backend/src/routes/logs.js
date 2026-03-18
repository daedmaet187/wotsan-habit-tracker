const router = require('express').Router();
const auth = require('../middleware/auth');
const pool = require('../config/db');
const c = require('../controllers/logsController');

router.post('/', auth, c.log);
router.get('/', auth, c.getByDate);
router.get('/streaks', auth, c.getStreak);
router.get('/range', auth, async (req, res) => {
  try {
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.delete('/:id', auth, c.remove);

module.exports = router;
