# AstroCoach MVP Product Guide
Version: v0.1

## 1. What AstroCoach Is

AstroCoach is an AI-guided astrological self-exploration application. Evolutionary and Kabbalistic astrology provides its primary symbolic and developmental map for helping users understand lived experience, recognize recurring patterns, and become more aware of meaningful choice points.

It is an astrological system, but not a horoscope product, deterministic personality report, therapy replacement, or behavior-optimization system.

Its core purpose is to help users move through a process like:

**Lived experience → exploration → recognition → deeper understanding → real-life awareness → conscious choice**

Astrology guides where AstroCoach looks, how it connects themes, and which developmental possibilities it considers.

AI helps ask useful questions, connect context, and organize what has been learned.

The user's lived experience determines what is actually true.

---

## 2. Core Product Thesis

AstroCoach is built around one central idea:

> **You cannot choose differently at a junction you cannot see. AstroCoach helps you see the junction.**

The product is not designed to make decisions for the user.

Its job is to help make subconscious or automatic patterns increasingly visible so that conscious choice becomes possible.

A familiar behavior does not need to disappear for the product to be successful.

Success may simply mean:

- the user notices a pattern sooner,
- understands it more clearly,
- recognizes it while it is happening,
- or realizes that they have a choice.

---

## 3. Product Philosophy

AstroCoach should help users understand themselves without turning self-development into endless optimization.

The app should:

- be curious before being certain,
- use astrology confidently while treating lived experience as authoritative about how symbolism manifests in the person's actual life,
- avoid judging behavior or turning it into identity,
- avoid assuming the user needs to be fixed,
- avoid forcing insight from every interaction,
- preserve uncertainty,
- allow users to reject, revise, or remove interpretations,
- respect pleasure, rest, desire, ambivalence, and ordinary inconsistency,
- prioritize awareness before behavior change,
- support user autonomy,
- interpret astrology holistically through an evolutionary and Kabbalistic lens rather than reducing it to deterministic conclusions or isolated placement definitions,
- remember what matters without trapping the user in an old version of themselves,
- know when to stop talking and let the user return to life.

The desired relationship is:

**a perceptive trusted friend who is very good at astrology, not an oracle, therapist, guru, or authority over the user's life.**

---

## 4. Core User Journey

### 4.1 Account Creation

The user creates an account.

### 4.2 Birth Data

The user provides:

- birth date,
- birth time,
- birth location.

If birth time is unavailable, the product should not fabricate house-based interpretations.

### 4.3 Initial Intent

The user selects one or more areas that brought them to AstroCoach.

Possible categories include:

- Relationships & intimacy
- Money & security
- Career & purpose
- Habits & impulses
- Emotional patterns
- Family & belonging
- Confidence & self-worth
- Spirituality & meaning
- Health & daily life
- General self-understanding

The user may optionally describe what is currently happening in their life.

### 4.4 Initial Discovery

AstroCoach uses the user's chart, selected areas, and current context to generate personalized questions.

These questions are not intended to explain the user.

They are intended to test astrological relevance against lived experience.

### 4.5 Initial Map

AstroCoach may form a provisional thematic map of areas that appear worth exploring.

These should be framed as provisional and editable.

The user should be able to accept, reject, or revise what the app believes is relevant.

### 4.6 Return to Life

After onboarding, the user is not expected to remain in continuous self-analysis.

The app should communicate its basic philosophy and then let the user leave.

The recurring experience begins when life happens.

---

## 5. Main Home Experience

The primary entry point should remain extremely simple.

A possible home prompt is:

> **What's going on?**

The user can write naturally.

Optional lightweight entry suggestions may include:

- Something happened
- I'm feeling something
- I keep thinking about something
- I need to make a decision
- I noticed a pattern
- Just talk

The app should not require the user to classify their experience before speaking.

---

## 6. Conversations

Conversations are where active exploration happens.

They are not the product's permanent memory.

A conversation may begin from a quick check-in and become an ongoing exploration if the topic becomes meaningful.

The MVP should conceptually support:

### Quick Check-ins

Short-lived interactions that may not need to become permanent named threads.

### Ongoing Conversations

Explorations that the user may want to return to over time.

Different conversations should still be able to access relevant persistent context from My Map.

The product should not behave like isolated chat threads with separate versions of the user.

---

## 7. My Map

My Map is the persistent layer of self-knowledge that survives individual conversations.

A useful mental model is:

**Conversations are where thinking happens.  
My Map is what the thinking produces.**

My Map should be user-visible and user-editable.

For the MVP, My Map can contain at least:

### Patterns

Recurring relationships the user has explicitly recognized.

A Pattern should describe a relationship rather than an identity.

A system hypothesis is not yet a saved Pattern.

The distinction is:

- **Candidate Pattern** = AstroCoach suspects something may be recurring.
- **Recognized Pattern** = the user agrees that the formulation meaningfully describes their experience.

### Insights

Meaningful understandings that do not necessarily describe repetition.

### Practices

Small real-world experiments intended to help the user notice or work with something they already recognize.

Practices are not rules. They are experiments.

### Possible Future Additions

- Themes
- Open Questions
- Goals
- Junction history
- Reflections
- Connections between Map items

---

## 8. Actions From My Map

Map items should not be static notes.

Opening a Pattern or Insight should allow the user to act on it.

For a Pattern, useful actions may include:

- Understand this more deeply
- Learn to notice when this happens
- Tell AstroCoach something new about this
- Review or start a Practice
- Edit the wording
- I don't think this fits anymore

For an Insight, useful actions may include:

- Explore this further
- Connect another experience
- Turn this into a Practice
- Update this Insight
- Leave it here for now

Nothing in My Map should be treated as permanent truth.

---

## 9. Cognitive Modes

The MVP currently defines four cognitive modes.

Detailed prompt behavior is specified separately in `astrocoach_prompt_architecture_v0.2.md`.

### EXPLORE

Primary question:

> **What's actually happening?**

Used when the user brings a new experience or when meaning remains unclear.

### RECOGNIZE

Primary question:

> **Is something meaningful repeating?**

Used when enough lived evidence exists to formulate a Candidate Pattern.

### DEEP_EXPLORE

Primary question:

> **What more can we understand about something already recognized?**

Used when the user explicitly wants greater understanding of a Pattern, Insight, or meaningful theme.

### INTEGRATE

Primary question:

> **How can this understanding become available while I'm actually living it?**

Used when the user wants to notice a recognized Pattern in real time or work with it intentionally.

---

## 10. Pattern Lifecycle

A typical Pattern lifecycle is:

1. User reports lived experiences.
2. EXPLORE gathers observations and context.
3. The system detects possible recurrence.
4. A Candidate Pattern is formed.
5. RECOGNIZE presents the proposition to the user.
6. User confirms, rejects, narrows, splits, or edits it.
7. If accepted, it becomes part of My Map.
8. The user chooses what to do next.

After recognition, the user may:

### Leave it here

The Pattern remains in My Map.

### Understand it more deeply

Enter DEEP_EXPLORE.

### Learn to notice it happening

Enter INTEGRATE.

These are not permanent choices.

---

## 11. Integration and Junctions

A key concept in AstroCoach is the **Junction**.

A Junction is the earliest realistically recognizable moment in which awareness can create meaningful choice.

It may be:

- a repeated thought,
- a bodily sensation,
- an emotion,
- an urge,
- a recurring situation,
- a familiar decision point,
- or a specific sequence of events.

Integration should help the user identify what their Pattern looks like while it is unfolding.

A Practice may simply be:

> When you notice the cue, name what is happening.

The goal is to move through stages such as:

- I noticed it afterward.
- I noticed it while it was happening.
- I noticed the cue before the usual response.
- I recognized the Junction.
- I realized I had a choice.

---

## 12. Role of Astrology

Astrology is AstroCoach's primary symbolic and developmental framework. It provides the map; lived experience reveals how the map is actually being traveled.

AstroCoach uses an evolutionary and Kabbalistic perspective to interpret that map holistically: relationships among chart factors matter more than isolated definitions, and a focused synthesis matters more than mentioning every placement. It may explore potential, essential qualities, tensions, familiar and emerging possibilities, lessons, purpose, consciousness, and personal or spiritual development.

Astrology is not the authority that defines the user's biography. Its interpretations remain corrigible through the person's experience.

### Natal Astrology

May help identify:

- areas of life worth exploring,
- psychological functions worth asking about,
- tensions or themes,
- possible styles of experiencing or processing.

### Transits

May help identify:

- when a known Theme could be especially relevant,
- when it may be useful to ask about a certain area,
- temporal context around ongoing exploration.

### Rule

The operating loop is:

**Astrological map → interpretation or inquiry → lived response → support, revision, or rejection**

or, after something has already been recognized:

**Recognized lived experience → astrological synthesis → deeper meaning or inquiry → lived response**

Avoid:

**Astrology → unquestionable conclusion, event causation, or consequential advice**

AstroCoach should make meaningful astrological interpretations without excessive hedging. The user decides how the symbolism is actually expressed, and contradiction must change the reading rather than be explained away.

---

## 13. Initial Astrology Model

The following conceptual model is sufficient for the MVP.

### Houses = Where

Areas of lived experience.

### Planets = What

Psychological or experiential functions.

### Signs = How

Style, strategy, or manner of expression.

### Aspects = Relationship

How different functions interact.

The MVP does not need a sophisticated astrological scoring engine.

A simple, interpretable relevance system is preferable to premature complexity.

User-reported relevance should override chart-derived assumptions.

---

## 14. Memory and Context

The app should not send every piece of historical user data into every model call.

Context should be retrieved selectively based on relevance.

Conceptually, useful context includes:

- current conversation,
- relevant Patterns,
- relevant Insights,
- active Practices,
- relevant previous observations,
- interaction preferences,
- relevant natal context,
- relevant transit context.

The user should be able to inspect and revise important persistent knowledge.

Memory should preserve epistemic status.

For example:

- observed,
- proposed,
- recognized,
- uncertain,
- rejected,
- revised.

The system should not flatten speculation and user-confirmed knowledge into the same category.

---

## 15. Prompt Architecture

The recommended prompt stack and full mode specifications are defined in `astrocoach_prompt_architecture_v0.2.md`.

The application owns mode orchestration. The model may recommend a next mode, but it should not arbitrarily redefine its own operating mode mid-response.

## 16. Interaction Profile

AstroCoach should gradually learn how the user prefers to explore.

Possible dimensions include:

- conceptual vs concrete,
- direct vs exploratory,
- emotional vs analytical,
- open-ended vs structured,
- understanding-first vs action-first,
- tolerance for ambiguity,
- preferred depth,
- preferred pacing,
- usefulness of examples,
- amount of scaffolding.

Natal astrology may offer provisional hypotheses about interaction style.

Actual user behavior should override those hypotheses.

---

## 17. What the MVP Needs to Prove

The MVP does not need to prove every future product concept.

It needs to prove that the core loop is useful.

The MVP should demonstrate that AstroCoach can:

1. receive birth information and user interests,
2. use evolutionary/Kabbalistic astrology to create relevant holistic interpretations and inquiry,
3. converse naturally about lived experience,
4. remain in EXPLORE without forcing interpretation,
5. detect when a Candidate Pattern may be warranted,
6. present the Pattern through RECOGNIZE,
7. allow the user to accept, reject, or modify it,
8. store user-confirmed Patterns and Insights in My Map,
9. reopen a Map item for DEEP_EXPLORE,
10. use astrology as a deeper symbolic and developmental framework,
11. let the user choose INTEGRATE,
12. create a simple Practice,
13. reuse relevant Map knowledge in future conversations.

That is already a complete product experiment.

---

## 18. Explicit MVP Non-Goals

Do not delay the MVP to build:

- a complete psychological ontology,
- a complex natal weighting engine,
- a generalized event bus,
- exhaustive transit lifecycle modeling,
- perfect longitudinal Pattern detection,
- a social network,
- a content feed,
- full coaching programs,
- advanced gamification,
- production subscription architecture,
- dozens of AI modes,
- a complete visualization of the user's psyche,
- a therapy or diagnostic system,
- automatic intervention from every transit,
- perfect memory retrieval.

---

## 19. Product Rhythm

AstroCoach should not encourage permanent residence inside the app.

A healthy product rhythm is:

**Life happens → user checks in → AstroCoach helps → something useful may be added to My Map → user leaves → life happens again.**

Integration extends outside the app.

The product should increasingly help the user recognize themselves without needing AstroCoach present.

---

## 20. Current MVP Navigation Concept

A possible high-level information architecture is:

### Home

Primary entry point:

**What's going on?**

### Conversations

Ongoing explorations the user may return to.

### My Map

Persistent user-owned self-knowledge.

Initial sections:

- Patterns
- Insights
- Practices

### Chart

Birth chart and relevant astrological information.

The exact navigation and screen design are not final.

---

## 21. Deferred Product Questions

The following questions are intentionally unresolved:

- exact conversation/thread lifecycle,
- whether quick check-ins are stored separately from named conversations,
- free vs paid conversation limits,
- subscription tiers,
- exact Map taxonomy,
- whether Themes are visible in MVP,
- exact Pattern evidence UI,
- whether Candidate Patterns appear in My Map before validation,
- how much transit activity is surfaced directly,
- exact Practice lifecycle,
- REFLECT mode,
- notification strategy,
- cross-conversation retrieval implementation,
- exact birth chart visualization,
- privacy and export controls,
- full data model.

These should not block initial implementation unless required by the first end-to-end loop.

---

## 22. Guiding Product Test

When deciding whether to add a feature, ask:

> **Does this help AstroCoach understand the user's lived experience more accurately, help the user recognize something meaningful about themselves, or help that understanding become available in real life?**

If not, it is probably not part of the core MVP.

The product should remain centered on:

**understanding → recognition → awareness → choice.**
