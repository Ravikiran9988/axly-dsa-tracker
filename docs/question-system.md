# Axly DSA Tracker — Question System

## Overview

The question system manages a unified corpus of DSA problems shared across both **Daily Challenge** and **Practice** modes. All problems live in the `questions` table; Daily Challenge problems additionally have a record in `daily_challenge_metadata`.

---

## Schema

### questions (Unified Question Corpus)
- **Purpose:** Single source of truth for all problem content
- **Key fields:** title, description, difficulty, topic, pattern, examples, constraints, starter_code, reference_solution, test_cases
- **Statuses:** draft → published → archived
- **Sources:** manual, ai, ai_automation

### daily_challenge_metadata
- **Purpose:** Scheduling and lifecycle for Daily Challenge problems
- **1:1:** Links to questions via `question_id` (PK of metadata)
- **Fields:** scheduled_date, status, created_via, custom_topic

### test_cases
- **Purpose:** Test inputs/outputs per question
- **Type:** hidden (used for verification) or visible (shown as examples)

---

## Question Lifecycle

### 1. Creation
| Method | Pipeline |
|--------|----------|
| Manual | Admin fills form → save → published |
| AI Generate | 8-phase pipeline → preview → save |
| AI + Sandbox | Full validation before save |
| Promote | From practice bank → DC metadata |

### 2. Publication
- Question set to `status: 'published'`
- Becomes available for students

### 3. Daily Challenge
- Question linked to DC metadata
- Scheduled for specific IST date
- Published on scheduled date
- Archived after 00:30 IST next day

### 4. Expiration
- DC status → archived
- Question `is_practice` → true
- Moves to practice bank

---

## AI Generation Pipeline

### Phase 1: Context Gathering
- Load existing questions (titles, concepts, signatures)
- Embed question bank for duplicate detection
- Load recent AI generations for freshness
- Pre-RAG: embed task for semantic diversity

### Phase 2: Contract Generation
- LLM generates: title, description, difficulty, tags, topics, examples
- Schema validated before proceeding

### Phase 3: Test Case Generation
- Input/output pairs per difficulty
- 2-3 hidden test cases + 1-2 visible examples
- Edge cases covered

### Phase 4: Solution Generation
- 6 languages: JS, Python, Java, C, C++, TypeScript
- LLM generates solutions with reasoning
- Solutions are stripped of comments/formatting

### Phase 5: Hint Generation
- 3 hints (progressive difficulty)
- Metadata about hint specificity

### Phase 6: Starter Code
- Empty function templates per language
- Includes function signature and docstring

### Phase 7: Starter Code Validation (Publishability Gate)
- Run ONLY the starter code in the sandbox
- Block generation if JS/Python starter code fails to compile or run
- Reference solutions are NOT executed (they receive only structural/leak checks)

### Phase 8: Duplicate Detection
- Clean base title match
- Concept + signature match
- Semantic Jaccard/Overlap (≥0.70 or ≥0.50 with 2 tokens)
- Substring containment
- Embedding cosine similarity

---

## Duplicate Detection

### 3-Layer System
1. **Exact Title:** Normalized clean title comparison
2. **Concept + Signature:** Problem concept + algorithmic signature
3. **Semantic:** Jaccard similarity + embedding cosine

### Embedding-Based
- Provider: Gemini `gemini-embedding-001` (3072 dimensions)
- Storage: `question_embeddings` table
- Similarity: Cosine via dot product (pre-normalized vectors)
- Thresholds: ≥0.88 DUPLICATE, ≥0.75 BORDERLINE, <0.75 NOVEL

### Content Hash
- SHA-256 of normalized content fields
- Used for idempotent embedding updates

---

## Embedding System

### Build Process
```javascript
buildEmbeddingDocument(question)
  → Extract: title, description, constraints, examples, hints, tags, difficulty, topic
  → Normalize: whitespace, case, quotes, special tokens
  → Filter: stop words (a, the, is, in, on, to, for, etc.)
  → Concatenate: normalized fields joined with newlines
```

### Lifecycle
1. Build embedding document from question fields
2. Compute SHA-256 content hash (idempotent dedup)
3. Generate embedding via provider
4. Store in `question_embeddings` table
5. Update `questions.embedding_indexed_at`

### Provider Chain
- Primary: Gemini `gemini-embedding-001`
- Fallback: OpenAI-compatible, Groq

---

## Starter Code

### Per-Language Templates
| Language | Template |
|----------|----------|
| JavaScript | `function solve(input) { /* your code here */ }` |
| Python | `def solve(input): # your code here pass` |
| Java | `class Solution { public static String solve(String input) { return ""; } }` |
| TypeScript | `function solve(input: string): string { /* your code here */ }` |
| C | `#include <stdio.h>\nchar* solve(const char* input) { return ""; }` |
| C++ | `#include <iostream>\nusing namespace std;\nstring solve(string input) { return ""; }` |

### Validation (Publishability Gate)
- Run ONLY starter code in sandbox
- Verify it compiles/runs without syntax errors
- **Block:** JS and Python compile/runtime failures block the pipeline
- **Warn:** TS/Java/C/C++ failures warn only (due to environment limits)
- **Note:** Reference solutions bypass sandbox execution completely to avoid blocking generation on LLM hallucinations.

---

## Question Metadata

### Scoring
| Difficulty | Base Points | Typical Tests | Time Limit |
|-----------|-------------|---------------|------------|
| Easy | 10 | 10-15 | 30 min |
| Medium | 15 | 15-20 | 45 min |
| Hard | 25 | 20+ | 60 min |

### Daily Challenge Points
| Difficulty | Points | Streak Bonus |
|-----------|--------|--------------|
| Easy | 50 | +10 per day (max +50) |
| Medium | 100 | +10 per day (max +50) |
| Hard | 150 | +10 per day (max +50) |

---

## Question Search

### Practice Mode
- Filter by: topic, difficulty, status
- Sort by: title, created_at
- Paginated

### Admin Search
- Filter by: title, status, source_type
- Sort by: created_at, updated_at
- Paginated

### Novelty Search (for AI generation)
- Embedding cosine similarity
- Configurable threshold
- Returns top-N most similar

---

## Version Control

### question_versions
- Stores snapshots of question changes
- Triggered on update (pre-save)
- Version number auto-incremented
- Changed by (admin user ID)

### Rollback
- Manual: admin selects version to restore
- API: `POST /questions/:id/rollback/:version`

---

## Topic & Pattern Management

### Topics
- Hierarchical with category
- Order index for display
- Can be deactivated (soft delete)

### Patterns
- Linked to topics via `topic_id`
- Can apply to multiple topics via `applicable_topics`
- Order index for display

### AI-Assisted Topic Recommendation
- Load topic registry from database
- Format for LLM consumption
- Return top-3 suggestions

---

## Known Issues

1. **Stale embeddings:** Questions updated without re-embedding
2. **No bulk reindex:** No UI to re-embed all questions
3. **Comment stripping:** AI solutions have formatting artifacts
4. **No question import:** No bulk CSV/JSON import
5. **No question export:** No bulk export capability
