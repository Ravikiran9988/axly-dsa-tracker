# Axly DSA Tracker — AI System Architecture

## Overview

The AI system provides three core capabilities:
1. **Question Generation** — Create new DSA problems via LLM
2. **AI Coaching** — Help students understand problems
3. **Novelty Detection** — Prevent duplicate questions via RAG

---

## LLM Provider Chain

### Router (`llm/llmRouter.js`)
Sequential fallback across 5 configured providers:

| Priority | Provider | Model | Key |
|----------|----------|-------|-----|
| 1 | Groq | GPT-OSS 120B | `GROQ_API_KEY_1` |
| 2 | Gemini | 3.1 Flash-Lite | `GEMINI_API_KEY_1` |
| 3 | Groq | GPT-OSS 120B | `GROQ_API_KEY_2` |
| 4 | Gemini | 3.5 Flash-Lite | `GEMINI_API_KEY_2` |
| 5 | Groq | GPT-OSS 120B | `GROQ_API_KEY_3` |

### Provider Features
- **Groq:** Multi-key rotation with cooldown (60s × min(failures, 5))
- **Gemini:** Native API with auto-JSON mode
- **OpenAI Compatible:** Generic adapter (OpenRouter)
- **Mock:** Test-only simulated responses

---

## Question Generation Pipeline

### Flow
```
1. Pre-LLM RAG Retrieval
   → Retrieve similar questions for exclusion context
   ↓
2. LLM Generation
   → Generate contract (title, description, difficulty, topics)
   → Generate test cases
   → Generate solutions (6 languages)
   → Generate hints
   ↓
3. Schema Validation
   → Validate contract against JSON schema
   ↓
4. Starter Code Validation (Publishability Gate)
   → Run ONLY starter code in sandbox (JS/Python block on compile/runtime error)
   → Reference solutions receive structural, presence, and leak checks but are NOT sandbox-executed
   ↓
5. Duplicate Detection (3 layers)
   → Layer 1: Clean base title comparison
   → Layer 2: Problem concept + algorithmic signature
   → Layer 3: Semantic Jaccard/Overlap similarity
   ↓
6. Embedding Novelty Check
   → Compute embedding similarity
   → DUPLICATE (≥0.88) → reject
   → BORDERLINE (≥0.75) → structural re-check
   → NOVEL (<0.75) → accept
   ↓
7. Final Assembly
   → Persist to database
   → Index embedding
```

### Duplicate Detection Thresholds
| Metric | Threshold | Action |
|--------|-----------|--------|
| Title exact match | 1.0 | Reject |
| Concept + signature match | Exact | Reject |
| Semantic overlap | ≥0.70 | Reject |
| Semantic Jaccard | ≥0.50 + 2 tokens | Reject |
| Substring containment | Full | Reject |
| Embedding cosine | ≥0.88 | DUPLICATE → reject |
| Embedding cosine | ≥0.75 | BORDERLINE → structural check |

### Regeneration
- Up to 3 attempts with rejected titles accumulated
- Process-local mutex prevents concurrent generation on same topic/difficulty

---

## Embedding System

### Provider
- Primary: Gemini `gemini-embedding-001` (3072 dimensions)
- Fallback: OpenAI-compatible, Groq

### Lifecycle
1. Build embedding document from question fields
2. Compute SHA-256 content hash (idempotent dedup)
3. Generate embedding via provider
4. Store in `question_embeddings` table
5. Update `questions.embedding_indexed_at`

### Novelty Classification
```
Query embedding → cosine similarity against all indexed questions
                 ↓
         ≥0.88 → DUPLICATE (reject)
         ≥0.75 → BORDERLINE (structural re-check)
         <0.75 → NOVEL (accept)
```

---

## AI Coaching System

### Architecture (2-Phase)
1. **Phase 1 (Deterministic):** Analyze question without LLM
   - Match problem in database
   - Detect intent (regex-based)
   - Retrieve knowledge graph context
2. **Phase 2 (LLM):** Generate guidance if needed
   - DB hints served directly (0 LLM tokens)
   - DB solutions served for high-confidence matches
   - LLM called only for novel queries

### Intent Types
| Intent | Description | LLM Required |
|--------|-------------|:------------:|
| HINT | Progressive hint | Sometimes |
| APPROACH | Solution approach | Sometimes |
| EXPLAIN | Problem explanation | Yes |
| SOLUTION | Full solution | Sometimes |
| COMPLEXITY | Time/space complexity | Yes |
| DEBUG | Debug student code | Yes |
| CODE_REVIEW | Review code quality | Yes |
| CONCEPT | Explain concept | Yes |
| GENERAL_DSA | General DSA question | Yes |

### Self-Correction Loop
1. Student code submitted for verification
2. Run in sandbox
3. If fails → send diagnostics to LLM
4. LLM generates corrected code
5. Re-run in sandbox
6. Max 2 correction attempts

---

## AI Review Service

### Purpose
Reviews student submissions against problem constraints.

### Flow
1. Fetch submission + question context
2. Call LLM with structured prompt
3. Return score + feedback

---

## Cache System

### In-Memory LRU Cache
- Max 500 entries
- 1-hour TTL
- SHA-256 key: `problemId:intent:queryText:md5(code)`
- Only caches non-personalized responses

---

## Observability

### Tracked Metrics
- Total requests, database hits, graph hits
- LLM calls, cache hits, fallback calls
- Code verifications, successful verifications
- Token usage (prompt + completion)
- Total latency
- Intent distribution, provider distribution
- Errors

### Recent Events
- Last 50 events with timestamp, intent, source, provider, latency
