const pool = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 AND is_active = true ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  const { name, description, color, icon, frequency, target_days } = req.body;
  if (!name || !frequency) return res.status(400).json({ error: 'Name and frequency are required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO habits (user_id, name, description, color, icon, frequency, target_days) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, name, description, color, icon, frequency, target_days || 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  const { name, description, color, icon, frequency, target_days } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE habits SET name=$1, description=$2, color=$3, icon=$4, frequency=$5, target_days=$6, updated_at=NOW() WHERE id=$7 AND user_id=$8 RETURNING *',
      [name, description, color, icon, frequency, target_days, req.params.id, req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Habit not found or unauthorized' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { rowCount } = await pool.query('UPDATE habits SET is_active=false WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Habit not found or unauthorized' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
