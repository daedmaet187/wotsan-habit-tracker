import { z } from 'zod';

export const schemas = {
  register: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    full_name: z.string().optional(),
  }),

  login: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),

  createHabit: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color hex').optional(),
    icon: z.string().max(50).optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'monthly'], { errorMap: () => ({ message: 'Frequency must be daily, weekly, or monthly' }) }),
    target_days: z.number().int().positive().optional(),
  }),

  updateHabit: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    description: z.string().max(500, 'Description too long').optional().nullable(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color hex').optional(),
    icon: z.string().max(50).optional().nullable(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    target_days: z.number().int().positive().optional(),
    is_active: z.boolean().optional(),
  }),
};

/**
 * Express middleware factory — validates req.body against a Zod schema.
 * On failure returns 422 with structured field errors.
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(422).json({ error: 'Validation failed', errors });
    }
    req.body = result.data; // replace with parsed/coerced data
    next();
  };
}
