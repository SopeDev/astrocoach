const TECHNICAL_ASTROLOGY_PATTERNS = [
  {
    label: "planet or chart-point name",
    pattern: /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Sol|Luna|Mercurio|Marte|Júpiter|Saturno|Urano|Neptuno|Plutón|Quirón)\b/iu,
  },
  {
    label: "zodiac sign",
    pattern: /\b(?:Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces|Tauro|Géminis|Cáncer|Escorpio|Sagitario|Capricornio|Acuario|Piscis)\b/iu,
  },
  {
    label: "aspect terminology",
    pattern: /\b(?:conjunctions?|conjunct(?:s|ed|ing)?|oppositions?|opposite|sextiles?|trines?|squares?|quincunx|quadrature|cuadraturas?|conjunciones?|oposiciones?|sextiles?|trígonos?|quincuncio)\b/iu,
  },
  {
    label: "angle or house terminology",
    pattern: /\b(?:ascendant|descendant|midheaven|imum coeli|ascendente|descendente|medio cielo|fondo del cielo|casa \d{1,2}|\d{1,2}(?:st|nd|rd|th)[ -]house|(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth)[ -]house|(?:primera|segunda|tercera|cuarta|quinta|sexta|séptima|octava|novena|décima|undécima|duodécima) casa)\b/iu,
  },
  {
    label: "chart terminology",
    pattern: /\b(?:natal chart|birth chart|placements?|astrological chart|carta natal|carta astral|posición astrológica|posiciones astrológicas|North Node|South Node|lunar nodes?|nodo norte|nodo sur|nodos? lunares?)\b/iu,
  },
  {
    label: "aspect measurement",
    pattern: /(?:°|\b(?:orb|orbe|applying|separating|aplicativo|separativo|\d+(?:[.,]\d+)?\s*(?:degree|degrees|grado|grados))\b)/iu,
  },
] as const;

export const HUMAN_FIRST_ASTROLOGY_INSTRUCTIONS = `Astrology works backstage here. Use the supplied chart material to decide what to notice, connect, or gently test, but translate the result completely into ordinary human language. The visible text must not name planets, signs, houses, aspects, chart points, degrees, orbs, applying/separating status, placements, or the natal chart. Exact astrology remains private provenance and must never take space that could describe how the pattern may actually feel or appear in a person's life.`;

export const DISCOVERY_QUESTION_STYLE_INSTRUCTIONS = `The questions should feel like they come from a perceptive close friend: someone who already notices a potentially important human tension and is curious about how it actually works for this person. Lead naturally with that observation when useful, then ask one clear question that gives the person room to confirm it, correct it, or describe a different expression. Be specific enough to feel personal, but never claim the chart-derived possibility as known biography. Selected life areas show interest, not proof of a problem or circumstance.

Every visible question must:
- contain exactly one question, even if a short observation comes first;
- use simple conversational language and stay meaningfully distinct from the others;
- ask about recognizable recent experiences, wants, needs, reactions, tensions, or uncertainty;
- avoid answer menus, forced choices, diagnoses, advice, recommendations, Practices, Patterns, or Insights;
- never explain the astrological reason for asking.`;

export class TechnicalAstrologyLanguageError extends Error {
  readonly terms: string[];

  constructor(terms: string[]) {
    super(`Visible text included prohibited technical astrology language: ${terms.join(", ")}`);
    this.name = "TechnicalAstrologyLanguageError";
    this.terms = terms;
  }
}

export function findTechnicalAstrologyLanguage(values: string[]) {
  return TECHNICAL_ASTROLOGY_PATTERNS
    .filter(({ pattern }) => values.some((value) => pattern.test(value)))
    .map(({ label }) => label);
}

export function assertHumanFirstAstrologyLanguage(values: string[]) {
  const terms = findTechnicalAstrologyLanguage(values);
  if (terms.length > 0) throw new TechnicalAstrologyLanguageError(terms);
}
