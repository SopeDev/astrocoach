import { z } from "zod";
import { mapItemKindSchema } from "./recognize-contract";

export const mapItemIdSchema = z.string().uuid();
export const mapItemStatementSchema = z.string().trim().min(1).max(500);
export { mapItemKindSchema };
