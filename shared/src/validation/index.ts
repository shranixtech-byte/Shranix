import { z } from 'zod';
import { VALIDATION } from '../constants';

// ── Common Field Validators ─────────────────────────────
export const nameField = z
  .string()
  .min(VALIDATION.NAME_MIN_LENGTH, `Name must be at least ${VALIDATION.NAME_MIN_LENGTH} characters`)
  .max(VALIDATION.NAME_MAX_LENGTH, `Name must be at most ${VALIDATION.NAME_MAX_LENGTH} characters`)
  .trim();

export const emailField = z
  .string()
  .email('Invalid email address')
  .max(VALIDATION.EMAIL_MAX_LENGTH)
  .toLowerCase()
  .trim();

export const phoneField = z
  .string()
  .regex(/^\d{10}$/, 'Phone number must be 10 digits');

export const passwordField = z
  .string()
  .min(VALIDATION.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters`)
  .max(VALIDATION.PASSWORD_MAX_LENGTH);

export const pincodeField = z
  .string()
  .regex(/^\d{6}$/, 'Pincode must be 6 digits');

export const gstField = z
  .string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST number format')
  .optional()
  .or(z.literal(''));

export const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const uuidField = z.string().uuid('Invalid UUID');

// ── Common Schema Builders ──────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const dateRangeSchema = z.object({
  start: dateField,
  end: dateField,
}).refine((data) => data.start <= data.end, {
  message: 'Start date must be before end date',
});

export const addressSchema = z.object({
  line1: z.string().min(1, 'Address is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(1, 'State is required').max(100),
  pincode: pincodeField,
  country: z.string().min(1, 'Country is required').max(100),
});

// ── Helper Functions ────────────────────────────────────
export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  return result.data;
}

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: { field: string; message: string }[];
} {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
  }
  return { success: true, data: result.data };
}
