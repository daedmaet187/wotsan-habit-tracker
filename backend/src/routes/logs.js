const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/logsController');

router.post('/', auth, c.log);
router.get('/', auth, c.getByDate);
router.get('/streaks', auth, c.getStreak);
router.delete('/:id', auth, c.remove);

module.exports = router;
