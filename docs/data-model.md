# Axly DSA Tracker — Data Model

## Entity Relationship Overview

```
users ──┬── auth_tokens
        ├── user_daily_activity
        ├── submissions ──── code_submissions_log
        │       └── submission_score_audit
        ├── points_ledger
        ├── user_badges ──── badges
        ├── notifications
        ├── admin_audit_logs (as actor)
        ├── practice_progress
        ├── dsa_ai_logs
        └── assignments (REMOVED)

questions ──┬── test_cases
            ├── daily_challenge_metadata
            ├── question_embeddings
            ├── question_versions
            ├── question_bank_automation_logs (via question_id)
            └── daily_challenge_automation_logs (via question_id)

topics ──┬── patterns
         └── questions (via topic_id)

patterns ── questions (via pattern_id)

daily_challenge_automation_settings (singleton)
question_bank_automation_settings (singleton)
```

## Table Details

### 1. `roles`
| Column | Type | Constraints |
|--------|------|-------------|
| `name` | TEXT | **PRIMARY KEY** |

**Seed:** admin, user, mentor

### 2. `users`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | TEXT | — | **PK** |
| `name` | TEXT | NOT NULL | |
| `email` | TEXT | NOT NULL | UNIQUE |
| `role` | TEXT | 'user' | FK → roles |
| `username` | TEXT | — | |
| `institution` | TEXT | 'Axly Tech Academy' | |
| `bio` | TEXT | — | |
| `github_url` | TEXT | — | |
| `linkedin_url` | TEXT | — | |
| `skills` | JSONB | '["JavaScript","DSA"]' | |
| `avatar_url` | TEXT | — | |
| `password_hash` | TEXT | — | |
| `email_verified` | BOOLEAN | FALSE | |
| `points` | INTEGER | 0 | Practice points |
| `practice_points` | INTEGER | 0 | |
| `daily_challenge_points` | INTEGER | 0 | Competitive points |
| `streak_bonus` | INTEGER | 0 | |
| `leaderboard_score` | INTEGER | 0 | |
| `individual_streak` | INTEGER | 0 | Daily login streak |
| `individual_best_streak` | INTEGER | 0 | |
| `daily_challenge_streak` | INTEGER | 0 | DC solve streak |
| `daily_challenge_best_streak` | INTEGER | 0 | |
| `last_login_date` | DATE | — | |
| `last_daily_challenge_solve_date` | DATE | — | |
| `rank` | INTEGER | 1 | Materialized rank |
| `is_active` | BOOLEAN | TRUE | PG only |
| `last_active_at` | TIMESTAMPTZ | now | |
| `created_at` | TIMESTAMPTZ | now | |
| `updated_at` | TIMESTAMPTZ | now | PG only |

### 3. `auth_tokens`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `token_hash` | TEXT | NOT NULL, UNIQUE |
| `token_type` | TEXT | CHECK (verification, otp_verification, password_reset) |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `used_at` | TIMESTAMPTZ | — |
| `created_at` | TIMESTAMPTZ | now |

### 4. `user_daily_activity`
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `activity_date` | DATE | NOT NULL |
| `activity_type` | TEXT | DEFAULT 'login' |
| `created_at` | TIMESTAMPTZ | now |

**UNIQUE:** (user_id, activity_date)

### 5. `topics`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `name` | TEXT | NOT NULL, UNIQUE |
| `category` | TEXT | 'Core' |
| `description` | TEXT | — |
| `order_index` | INTEGER | 0 |
| `is_active` | BOOLEAN | TRUE |

### 6. `patterns`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `name` | TEXT | NOT NULL, UNIQUE |
| `topic_id` | TEXT | FK → topics SET NULL |
| `description` | TEXT | — |
| `order_index` | INTEGER | 0 |
| `applicable_topics` | JSONB | '[]' |

### 7. `questions` (Unified Question Corpus)
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `id` | TEXT | **PK** | |
| `title` | TEXT | NOT NULL | |
| `slug` | TEXT | — | UNIQUE partial |
| `difficulty` | TEXT | NOT NULL | CHECK (easy/medium/hard) |
| `topic_id` | TEXT | — | FK → topics |
| `pattern_id` | TEXT | — | FK → patterns |
| `url` | TEXT | '' | |
| `description` | TEXT | — | |
| `problem_statement` | TEXT | — | |
| `constraints` | TEXT | — | |
| `input_format` | TEXT | — | |
| `output_format` | TEXT | — | |
| `examples` | JSONB | '[]' | |
| `example_input` | TEXT | — | |
| `example_output` | TEXT | — | |
| `hints` | JSONB | '[]' | |
| `tags` | JSONB | '[]' | |
| `estimated_time` | INTEGER | 30 | Minutes |
| `points` | INTEGER | 10 | |
| `status` | TEXT | 'published' | CHECK (draft/published/archived) |
| `supported_languages` | JSONB | '["python","javascript","java","cpp","c","typescript"]' | |
| `starter_code` | JSONB | '{}' | Per-language starter code |
| `reference_solution` | TEXT | — | |
| `editorial` | TEXT | — | |
| `solution_approach` | TEXT | — | |
| `complexity` | TEXT | — | |
| `problem_signature` | TEXT | — | For duplicate detection |
| `problem_concept` | TEXT | — | Algorithmic concept |
| `version` | INTEGER | 1 | |
| `is_active` | BOOLEAN | TRUE | |
| `created_by` | TEXT | — | FK → users |
| `is_practice` | BOOLEAN | FALSE | true = practice bank |
| `generation_slot` | TEXT | — | UNIQUE partial |
| `created_via` | TEXT | 'manual' | CHECK (manual/ai/ai_automation) |
| `embedding_indexed_at` | TIMESTAMPTZ | — | |
| `created_at` | TIMESTAMPTZ | now | |
| `updated_at` | TIMESTAMPTZ | now | PG only |

### 8. `test_cases`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `question_id` | TEXT | FK → questions CASCADE |
| `input` | TEXT | NOT NULL |
| `expected_output` | TEXT | NOT NULL |
| `is_hidden` | BOOLEAN | FALSE |
| `created_at` | TIMESTAMPTZ | now |

### 9. `submissions`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `question_id` | TEXT | NOT NULL |
| `assignment_id` | TEXT | FK → assignments SET NULL |
| `submission_type` | TEXT | 'code' |
| `language` | TEXT | 'javascript' |
| `source_code` | TEXT | — |
| `github_url` | TEXT | — |
| `status` | TEXT | 'not_started' |
| `review_status` | TEXT | 'pending' |
| `feedback` | TEXT | — |
| `reviewer_id` | TEXT | FK → users SET NULL |
| `reviewed_at` | TIMESTAMPTZ | — |
| `passed_tests` | INTEGER | 0 |
| `total_tests` | INTEGER | 0 |
| `execution_time_ms` | DOUBLE | 0 |
| `test_score` | NUMERIC(5,2) | 0 |
| `time_score` | NUMERIC(5,2) | 0 |
| `attempt_score` | NUMERIC(5,2) | 0 |
| `final_score` | NUMERIC(5,2) | 0 |
| `started_at` | TIMESTAMPTZ | — |
| `attempt_count` | INTEGER | 0 |
| `solve_duration_seconds` | DOUBLE | 0 |
| `created_at` | TIMESTAMPTZ | now |
| `updated_at` | TIMESTAMPTZ | now |

**UNIQUE:** (user_id, question_id)

### 10. `daily_challenge_metadata`
| Column | Type | Default |
|--------|------|---------|
| `question_id` | TEXT | **PK**, FK → questions CASCADE |
| `scheduled_date` | TEXT | — | UNIQUE |
| `custom_topic` | TEXT | — |
| `created_via` | TEXT | 'manual' |
| `status` | TEXT | 'draft' |
| `created_at` | TIMESTAMPTZ | now |
| `updated_at` | TIMESTAMPTZ | now |

**Status lifecycle:** draft → scheduled → published → archived

### 11. `daily_challenge_automation_settings`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** ('global-settings') |
| `mode` | TEXT | 'ai_assist' |
| `is_enabled` | INTEGER | 1 |
| `target_hour_utc` | INTEGER | 19 (= 00:30 IST) |
| `retry_limit` | INTEGER | 3 |
| `last_run_at` | TIMESTAMPTZ | — |
| `last_run_status` | TEXT | — |
| `next_run_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | now |

### 12. `daily_challenge_automation_logs`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `target_date` | TEXT | NOT NULL |
| `mode` | TEXT | NOT NULL |
| `attempt_count` | INTEGER | 1 |
| `validation_result` | TEXT | — |
| `sandbox_result` | TEXT | — |
| `status` | TEXT | CHECK (success/failed/skipped) |
| `failure_category` | TEXT | — |
| `question_id` | TEXT | FK → questions SET NULL |
| `details` | TEXT | — |
| `created_at` | TIMESTAMPTZ | now |

### 13. `question_embeddings`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `question_id` | TEXT | FK → questions CASCADE |
| `embedding` | JSONB | NOT NULL |
| `content_hash` | TEXT | NOT NULL |
| `embedding_model` | TEXT | 'gemini-embedding-001' |
| `embedding_version` | INTEGER | 1 |
| `indexed_at` | TIMESTAMP | now |
| `created_at` | TIMESTAMP | now |
| `updated_at` | TIMESTAMP | now |

**UNIQUE:** (question_id, embedding_model, embedding_version)

### 14. `points_ledger`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `source_type` | TEXT | NOT NULL |
| `source_id` | TEXT | NOT NULL |
| `points` | INTEGER | NOT NULL |
| `category` | TEXT | NOT NULL |
| `reason` | TEXT | — |
| `created_at` | TIMESTAMPTZ | now |

**UNIQUE:** (user_id, source_type, source_id)

### 15. `practice_progress`
| Column | Type | Default |
|--------|------|---------|
| `user_id` | TEXT | FK → users CASCADE |
| `question_id` | TEXT | FK → questions CASCADE |
| `status` | TEXT | 'in_progress' |
| `started_at` | TIMESTAMP | now |
| `updated_at` | TIMESTAMP | now |
| `solved_at` | TIMESTAMP | — |
| `attempts` | INTEGER | 0 |
| `last_submission_id` | TEXT | — |

**PRIMARY KEY:** (user_id, question_id)

### 16. `notifications`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `title` | TEXT | NOT NULL |
| `message` | TEXT | NOT NULL |
| `category` | TEXT | 'system' |
| `type` | TEXT | 'system_alert' |
| `link` | TEXT | — |
| `is_read` | BOOLEAN | FALSE |
| `created_at` | TIMESTAMPTZ | now |

### 17. `badges`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `name` | TEXT | NOT NULL, UNIQUE |
| `description` | TEXT | NOT NULL |
| `icon` | TEXT | NOT NULL |

### 18. `user_badges`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `user_id` | TEXT | FK → users CASCADE |
| `badge_id` | TEXT | FK → badges CASCADE |
| `awarded_at` | TIMESTAMPTZ | now |

**UNIQUE:** (user_id, badge_id)

### 19. `admin_audit_logs`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `actor_id` | TEXT | FK → users SET NULL |
| `actor_email` | TEXT | — |
| `action` | TEXT | NOT NULL |
| `resource_type` | TEXT | NOT NULL |
| `resource_id` | TEXT | — |
| `before_data` | JSONB | — |
| `after_data` | JSONB | — |
| `metadata` | JSONB | — |
| `ip_address` | TEXT | — |
| `user_agent` | TEXT | — |
| `created_at` | TIMESTAMPTZ | now |

### 20. `question_versions`
| Column | Type | Default |
|--------|------|---------|
| `id` | TEXT | **PK** |
| `question_id` | TEXT | FK → questions CASCADE |
| `version` | INTEGER | NOT NULL |
| `snapshot` | JSONB | NOT NULL |
| `changed_by` | TEXT | FK → users SET NULL |
| `change_type` | TEXT | 'update' |
| `created_at` | TIMESTAMPTZ | now |

**UNIQUE:** (question_id, version)
