import { Router } from 'express';
import auth from '../middleware/auth.js';
import * as c from '../controllers/logsController.js';

const router = Router();

router.post('/', auth, c.log);
router.get('/', auth, c.getByDate);
router.get('/streaks', auth, c.getStreak);
router.get('/range', auth, c.getRange);
router.delete('/:id', auth, c.remove);

export default router;
