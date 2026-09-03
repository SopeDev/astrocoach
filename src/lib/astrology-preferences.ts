import { z } from "zod";

export const ASTROLOGY_FAMILIARITIES = ["new", "basic", "familiar", "advanced"] as const;
export const ASTROLOGY_STYLES = ["background", "balanced", "explained", "deep"] as const;

export const astrologyFamiliaritySchema = z.enum(ASTROLOGY_FAMILIARITIES);
export const astrologyStyleSchema = z.enum(ASTROLOGY_STYLES);

export type AstrologyFamiliarity = z.infer<typeof astrologyFamiliaritySchema>;
export type AstrologyStyle = z.infer<typeof astrologyStyleSchema>;

export const DEFAULT_ASTROLOGY_FAMILIARITY: AstrologyFamiliarity = "basic";
export const DEFAULT_ASTROLOGY_STYLE: AstrologyStyle = "balanced";
