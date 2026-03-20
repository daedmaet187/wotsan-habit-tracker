import { Router } from 'express';
import auth from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import * as c from '../controllers/habitsController.js';

const router = Router();

router.get('/', auth, c.getAll);
router.post('/', auth, validate(schemas.createHabit), c.create);
router.put('/:id', auth, validate(schemas.updateHabit), c.update);
router.delete('/:id', auth, c.remove);

export default router;
