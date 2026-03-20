import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

router.post('/register', validate(schemas.register), register);
router.post('/login', validate(schemas.login), login);

export default router;
