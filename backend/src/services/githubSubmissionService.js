const { db } = require('../db/db');
const { AppError } = require('../middleware/errorHandler');

// Keep GitHub submission snapshots separate from the mutable submission row.
db.exec(`
  CREATE TABLE IF NOT EXISTS github_submission_versions (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    github_url TEXT NOT NULL,
    owner TEXT NOT NULL,
    repository TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    commit_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_github_versions_submission ON github_submission_versions(submission_id);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_github_versions_submission_commit ON github_submission_versions(submission_id, commit_sha);
`);

function parseGithubUrl(value) {
  let url;
  try { url = new URL(String(value || '').trim()); } catch (_) { throw new AppError('Invalid GitHub URL', 400, 'VALIDATION_ERROR', 'github_url'); }
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
    throw new AppError('Only https://github.com repository URLs are allowed', 400, 'VALIDATION_ERROR', 'github_url');
  }
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) throw new AppError('Please provide a GitHub repository URL', 400, 'VALIDATION_ERROR', 'github_url');
  const owner = parts[0];
  const repository = parts[1].replace(/\.git$/, '');
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repository)) {
    throw new AppError('Invalid GitHub repository URL', 400, 'VALIDATION_ERROR', 'github_url');
  }
  return { owner, repository, canonicalUrl: `https://github.com/${owner}/${repository}` };
}

async function getRepositorySnapshot(githubUrl) {
  const parsed = parseGithubUrl(githubUrl);
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Axly-DSA-Tracker' }
  });
  if (response.status === 404) throw new AppError('GitHub repository was not found or is private', 400, 'GITHUB_REPOSITORY_NOT_FOUND', 'github_url');
  if (!response.ok) throw new AppError('Unable to verify the GitHub repository right now', 502, 'GITHUB_VERIFICATION_FAILED');
  const repo = await response.json();
  if (repo.archived) throw new AppError('Archived GitHub repositories cannot be submitted', 400, 'VALIDATION_ERROR', 'github_url');
  if (!repo.default_branch) throw new AppError('GitHub repository has no default branch', 400, 'VALIDATION_ERROR', 'github_url');

  const branchResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repository)}/commits/${encodeURIComponent(repo.default_branch)}`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Axly-DSA-Tracker' }
  });
  if (!branchResponse.ok) throw new AppError('Unable to resolve the latest GitHub commit', 502, 'GITHUB_VERIFICATION_FAILED');
  const commit = await branchResponse.json();
  if (!commit.sha) throw new AppError('GitHub commit SHA could not be resolved', 502, 'GITHUB_VERIFICATION_FAILED');

  return {
    ...parsed,
    defaultBranch: repo.default_branch,
    commitSha: commit.sha,
    commitUrl: `https://github.com/${parsed.owner}/${parsed.repository}/commit/${commit.sha}`
  };
}

function recordSnapshot({ id, submissionId, snapshot }) {
  db.prepare(`
    INSERT INTO github_submission_versions
      (id, submission_id, github_url, owner, repository, commit_sha, commit_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, submissionId, snapshot.canonicalUrl, snapshot.owner, snapshot.repository, snapshot.commitSha, snapshot.commitUrl);
}

function listSnapshots(submissionId) {
  return db.prepare(`
    SELECT id, submission_id, github_url, owner, repository, commit_sha, commit_url, created_at
    FROM github_submission_versions
    WHERE submission_id = ?
    ORDER BY created_at DESC
  `).all(submissionId);
}

module.exports = { parseGithubUrl, getRepositorySnapshot, recordSnapshot, listSnapshots };
