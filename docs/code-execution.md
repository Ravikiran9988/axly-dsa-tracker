# Axly DSA Tracker — Code Execution System

## Overview

Code execution is handled by a Docker-sandboxed runner that supports 6 programming languages. The backend sends code + test cases to the runner, which executes in an isolated environment and returns results.

---

## Architecture

```
Frontend (ProblemWorkspace)
  → POST /api/v1/code/run
    → executionService.executeCode()
      → POST CODE_EXECUTION_SERVICE_URL/execute
        → Docker Code Runner (port 8080)
          → Write temp file → Compile (if needed) → Execute → Compare output
        ← Results
      ← Results
    ← Response
```

---

## Supported Languages

| Language | Compiler/Runtime | Timeout |
|----------|-----------------|---------|
| JavaScript | Node.js 22 | 5s |
| Python 3 | Python 3.x | 5s |
| Java 17 | OpenJDK 17 | 5s (+10s compile) |
| TypeScript | tsc (global) | 5s (+10s compile) |
| C | gcc | 5s (+10s compile) |
| C++ | g++ | 5s (+10s compile) |

---

## Runner Architecture

### Docker Image
- **Base:** `node:22-bookworm-slim`
- **Installed:** python3, openjdk-17-jdk-headless, gcc, g++, typescript
- **User:** Non-root `runner` user
- **Port:** 8080

### Security Hardening
| Setting | Value |
|---------|-------|
| `read_only` | true |
| `cap_drop` | ALL |
| `security_opt` | no-new-privileges:true |
| `mem_limit` | 256MB |
| `cpus` | 1.0 |
| `pids_limit` | 64 |
| Filesystem | tmpfs (128MB /runner/work, 32MB /tmp) |
| Network | Isolated `runner_internal` |

### Authentication
- Bearer token: `CODE_RUNNER_TOKEN`
- Validated on every request

---

## Execution Flow

### Run Code (Practice/Workspace)
1. Validate input (code, language, test cases)
2. Send to runner: `POST /execute`
3. Runner writes code to temp file
4. Compile if needed (Java, C, C++, TypeScript)
5. Execute per test case with 5s timeout
6. Compare output (exact match + JSON structural fallback)
7. Short-circuit on first failure
8. Return results (pass/fail per test, execution time)
9. Clean up temp directory

### Submit Solution (Scoring)
1. Run code against all test cases
2. Calculate score:
   - Test performance: (passed/total) × 60
   - Time performance: 0-20 (based on execution time)
   - Attempt efficiency: 0-20 (based on attempt count)
3. Record submission in database
4. Award points if first correct solve

---

## Limits

| Limit | Value |
|-------|-------|
| Max source code | 100KB |
| Max input per test | 20KB |
| Max output | 64KB |
| Max test cases | 20 |
| Max request body | 500KB |
| Execution timeout | 5s |
| Compilation timeout | 10s |
| Backend fetch timeout | 7s |

---

## Error Handling

| Error Type | HTTP Status | Code |
|-----------|-------------|------|
| Missing code | 400 | VALIDATION_ERROR |
| Missing language | 400 | VALIDATION_ERROR |
| Missing test cases | 400 | VALIDATION_ERROR |
| Unsupported language | 400 | VALIDATION_ERROR |
| Compilation error | 422 | COMPILATION_ERROR |
| Runtime error | 422 | RUNTIME_ERROR |
| Time limit exceeded | 422 | TIME_LIMIT_EXCEEDED |
| Output limit exceeded | 422 | OUTPUT_LIMIT_EXCEEDED |
| Runner unavailable | 503 | CODE_EXECUTION_UNAVAILABLE |

---

## Auto-Driver Injection

The `ensureExecutableDriver()` function auto-injects stdin-reading boilerplate:

- **JavaScript:** Reads from `process.stdin` if no `console.log` detected
- **Python:** Reads from `sys.stdin` if no `print` detected
- Other languages: No auto-injection

---

## Local Development

### Without Docker
- Falls back to spawning local processes (`node`, `python3`, `java`, `gcc`, `g++`)
- Same timeout and comparison logic
- Temp files created in OS temp directory
- Cleanup in `finally` block

### With Docker
- Set `CODE_EXECUTION_SERVICE_URL=http://localhost:8080`
- Set `CODE_RUNNER_TOKEN=<your-token>`
- Run: `cd backend/docker/code-runner && docker-compose up`

---

## Output Comparison

### Exact Match
- Normalize line endings (`\r\n` → `\n`)
- Trim whitespace
- Compare strings

### JSON Structural Fallback
- Parse both expected and actual as JSON
- Deep compare objects/arrays
- Handles key ordering differences

---

## Known Limitations

1. **No persistent storage:** Temp files cleaned after each execution
2. **No network access:** Runner has no internet access
3. **No file system access:** Read-only filesystem
4. **Single-threaded:** One execution per request
5. **No streaming:** Results returned after full execution
6. **No custom input save:** Custom input not persisted
