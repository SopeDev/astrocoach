import { z } from "zod";

export const patternIdSchema = z.string().uuid();
export const patternStatementSchema = z.string().trim().min(1).max(500);
