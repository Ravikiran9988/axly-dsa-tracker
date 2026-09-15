# Axly DSA Tracker — Testing Audit

## Backend Tests

### Test Configuration
- **Framework:** Jest 29.7
- **Runner:** `jest --runInBand --forceExit`
- **Database:** SQLite in-memory (test.db)
- **Timeout:** Default (5s per test)

### Test Files (36 files, ~280 tests)

#### Daily Challenge (7 files)
| File | Tests | Coverage |
|------|-------|----------|
| `daily_challenge_v2_complete.test.js` | 32 | Full DC lifecycle, automation, admin/scheduled flows |
| `daily_challenge_ai_and_admin.test.js` | ~15 | AI generation, admin workflows |
| `daily_challenge_architecture.test.js` | ~10 | Schema, relationships, constraints |
| `daily_challenge_automation_settings.test.js` | 9 | Automation settings CRUD |
| `daily_challenge_delete_functional.test.js` | ~8 | Delete/archive operations |
| `daily_challenge_dynamic_topics.test.js` | ~6 | Topic recommendation |
| `centralized_ai_pipeline.test.js` | 17 | Pipeline correctness, CASE A/B |

#### AI System (5 files)
| File | Tests | Coverage |
|------|-------|----------|
| `ai_generation_pipeline.test.js` | ~12 | Pipeline phases |
| `ai_generation_deterministic.test.js` | ~8 | Deterministic behavior |
| `ai_validation_strictness.test.js` | ~10 | Schema validation |
| `autofill_indexing_gate.test.js` | 6 | Indexing before scheduling |

#### AI Coach (6 files)
| File | Tests | Coverage |
|------|-------|----------|
| `dsa_ai_coach.test.js` | ~15 | Coach v1 |
| `dsa_ai_coach_v2.test.js` | ~20 | Coach v2 |
| `dsa_ai_coach_input_clearing.test.js` | ~8 | Input clearing |
| `dsa_ai_complete_validation.test.js` | ~12 | Full validation |
| `dsa_ai_foundation.test.js` | ~10 | Foundation |
| `dsa_ai_router.test.js` | ~8 | LLM router |
| `dsa_ai_groq_multikey.test.js` | ~6 | Multi-key Groq |

#### Auth & Security (3 files)
| File | Tests | Coverage |
|------|-------|----------|
| `auth_flow.test.js` | ~12 | Auth flow |
| `jwt_auth.test.js` | ~10 | JWT verification |
| `rls_supabase.test.js` | ~6 | Row-level security |

#### Practice (3 files)
| File | Tests | Coverage |
|------|-------|----------|
| `practice_v1_complete.test.js` | ~20 | Full practice flow |
| `practice_integrity_execution.test.js` | ~10 | Execution integrity |
| `execution.test.js` | ~8 | Code execution |

#### Scoring & Gamification (3 files)
| File | Tests | Coverage |
|------|-------|----------|
| `scoringService.test.js` | ~10 | Score calculation |
| `streakSeparation.test.js` | ~8 | Streak isolation |
| `leaderboardIsolation.test.js` | ~6 | Leaderboard isolation |

#### Questions & Novelty (3 files)
| File | Tests | Coverage |
|------|-------|----------|
| `question_novelty.test.js` | ~10 | Novelty detection |
| `question_novelty_integration.test.js` | ~8 | Integration |
| `embedding_service.test.js` | ~6 | Embedding service |

#### Other (6 files)
| File | Tests | Coverage |
|------|-------|----------|
| `admin_stats.test.js` | ~6 | Admin statistics |
| `audit_and_lifecycle.test.js` | ~8 | Audit logging |
| `notificationService.test.js` | ~6 | Notifications |
| `phase4_comprehensive.test.js` | ~15 | Comprehensive |
| `api.test.js` | ~10 | API integration |

---

## Playwright E2E Tests

### Configuration
- **Framework:** Playwright 1.x
- **Browsers:** Chromium (primary)
- **Dev Config:** Spins up backend (5000) + frontend (5173)
- **Production Config:** Points to `PRODUCTION_BASE_URL`

### Test Specs (9 files)
| File | Coverage |
|------|----------|
| `daily_challenge_lifecycle.spec.js` | DC full lifecycle, automation, admin flows |
| `auth.spec.js` | Login, signup, OAuth |
| `practice.spec.js` | Practice workspace |
| `admin.spec.js` | Admin dashboard |
| `dashboard.spec.js` | Student dashboard |
| `leaderboard.spec.js` | Leaderboard |
| `submissions.spec.js` | Submissions |
| `responsive.spec.js` | Mobile responsiveness |
| `theme.spec.js` | Theme toggling |

---

## Feature → Test Coverage Matrix

| Feature | Backend Tests | Playwright | Coverage Level |
|---------|:------------:|:----------:|:--------------:|
| Auth (Login/Signup) | Yes | Yes | Good |
| JWT Verification | Yes | — | Good |
| Practice Problems | Yes | Yes | Good |
| Code Execution | Yes | Yes | Good |
| Daily Challenge | Yes | Yes | Good |
| DC Automation | Yes | Yes | Good |
| DC Settings | Yes | — | Good |
| AI Generation | Yes | Partial | Good |
| AI Coach | Yes | Yes | Good |
| Question CRUD | Yes | Yes | Good |
| Submissions | Yes | Yes | Good |
| Scoring | Yes | — | Good |
| Streaks | Yes | — | Good |
| Leaderboard | Yes | Yes | Good |
| Notifications | Yes | Yes | Good |
| Admin Dashboard | Yes | Yes | Good |
| Audit Logs | Yes | Yes | Good |
| User Management | Yes | Yes | Good |
| Theme Toggle | — | Yes | Partial |
| Responsive UI | — | Yes | Partial |
| Recommendations | Yes | — | Partial |
| Achievements | Yes | — | Partial |
| Embeddings/Novelty | Yes | — | Good |
| Email Service | Yes | — | Partial |

### Coverage Assessment
- **Well-covered:** Auth, Practice, DC, Code Execution, AI, Scoring, Leaderboard
- **Partially covered:** Theme, Responsive, Recommendations, Email
- **Not covered:** Deployment scripts, Migration scripts, Edge cases in production
