# Axly DSA Tracker — Environment Variables

*Do NOT include actual secret values. Only document variable names and purpose.*

## Backend (`backend/.env`)

### Required for Production
| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing secret | *(must be set)* |
| `JWT_EXPIRES_IN` | JWT token expiry | `30d` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | *(must be set)* |
| `ADMIN_EMAIL` | Admin user email for auto-promotion | `admin@axly.in` |

### LLM Providers
| Variable | Purpose | Provider |
|----------|---------|----------|
| `GROQ_API_KEY_1` | Groq API key (primary) | Groq |
| `GROQ_API_KEY_2` | Groq API key (secondary) | Groq |
| `GROQ_API_KEY_3` | Groq API key (tertiary) | Groq |
| `GEMINI_API_KEY_1` | Gemini API key (primary) | Google AI |
| `GEMINI_API_KEY_2` | Gemini API key (secondary) | Google AI |
| `GEMINI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `LLM_MODEL` | Groq model name | `openai/gpt-oss-120b` |
| `GROQ_MODEL` | Groq model override | `openai/gpt-oss-120b` |

### Embeddings
| Variable | Purpose | Default |
|----------|---------|---------|
| `EMBEDDING_PROVIDER` | Embedding provider | `gemini` |
| `EMBEDDING_PROVIDER_API_KEY` | Embedding API key | *(auto-fallback)* |
| `EMBEDDING_MODEL` | Embedding model | `gemini-embedding-001` |
| `EMBEDDING_DIMENSIONS` | Embedding dimensions | `3072` |

### Code Execution
| Variable | Purpose | Default |
|----------|---------|---------|
| `CODE_EXECUTION_SERVICE_URL` | Docker runner URL | `http://localhost:8080` |
| `CODE_RUNNER_TOKEN` | Runner auth token | *(must be set)* |

### Email
| Variable | Purpose | Default |
|----------|---------|---------|
| `RESEND_API_KEY` | Resend email API key | *(console fallback)* |
| `EMAIL_FROM` | Sender email address | — |

### Optional
| Variable | Purpose | Default |
|----------|---------|---------|
| `SUPABASE_ANON_KEY` | Supabase anonymous key | — |
| `ADMIN_BOOTSTRAP_ENABLED` | Enable admin bootstrap | `false` |
| `NOVELTY_DUPLICATE_THRESHOLD` | Novelty duplicate threshold | `0.88` |
| `NOVELTY_BORDERLINE_THRESHOLD` | Novelty borderline threshold | `0.75` |

## Frontend (`frontend/.env`)

| Variable | Purpose | Required |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes (for Google OAuth) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes (for Google OAuth) |
| `VITE_API_URL` | Backend API URL | Yes (defaults to `/api/v1`) |

## CI/CD (GitHub Actions Secrets)

| Secret | Purpose |
|--------|---------|
| `HEROKU_API_KEY` | Heroku deploy token |
| `HEROKU_APP_NAME` | Heroku app name |
| `PRODUCTION_BASE_URL` | Production URL for E2E tests |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

## Docker Code Runner

| Variable | Purpose | Default |
|----------|---------|---------|
| `CODE_RUNNER_TOKEN` | Bearer auth token | *(must be set)* |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Runner port | `8080` |
