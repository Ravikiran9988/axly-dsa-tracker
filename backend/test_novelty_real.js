const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// ─── Load .env manually (no dotenv dependency needed) ───
const envPath = path.join(__dirname, '.env');
const envText = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim();
  env[key] = value;
}

const API_KEY   = env['EMBEDDING_PROVIDER_API_KEY'];
const BASE_URL  = env['EMBEDDING_PROVIDER_BASE_URL'];
const MODEL     = env['EMBEDDING_MODEL'];
const DIMS      = parseInt(env['EMBEDDING_DIMENSIONS'] || '3072', 10);

console.log('=== CONFIG ===');
console.log('BASE_URL:', BASE_URL);
console.log('MODEL:', MODEL);
console.log('DIMENSIONS:', DIMS);
console.log('API_KEY (first 20 chars):', API_KEY ? API_KEY.slice(0, 20) + '...' : 'MISSING');
console.log();

// ─── 1. Load DB ───
const dbPath = path.join(__dirname, 'data', 'axly_dsa.db');
console.log('Loading DB:', dbPath);
const db = new Database(dbPath, { readonly: true });

const rows = db.prepare('SELECT id, title, embedding FROM questions WHERE embedding IS NOT NULL').all();
console.log(`Found ${rows.length} questions with embeddings.`);

if (rows.length === 0) {
  console.error('No embeddings found in database. Exiting.');
  process.exit(1);
}

// Parse embeddings from JSON blobs
const corpus = rows.map(r => {
  let emb;
  if (typeof r.embedding === 'string') {
    emb = JSON.parse(r.embedding);
  } else {
    emb = r.embedding; // already array/blob
  }
  // Handle Buffer (SQLite stores as blob)
  if (Buffer.isBuffer(emb)) {
    // Try to decode as JSON text first, fallback to float array
    try {
      emb = JSON.parse(emb.toString('utf-8'));
    } catch {
      // Decode as float32 array from raw bytes
      const floats = [];
      for (let i = 0; i < emb.length; i += 4) {
        floats.push(emb.readFloatLE(i));
      }
      emb = floats;
    }
  }
  return { id: r.id, title: r.title, embedding: emb };
});

console.log(`Parsed ${corpus.length} embeddings.`);
console.log('Sample embedding length:', corpus[0].embedding.length);
console.log('Sample embedding first 5 values:', corpus[0].embedding.slice(0, 5));
console.log('Sample question:', corpus[0].title);
console.log();

// ─── 2. Embed via Gemini OpenAI-compatible endpoint ───
async function embedTexts(texts) {
  const url = `${BASE_URL}/embeddings`;
  const body = {
    model: MODEL,
    input: texts,
    dimensions: DIMS,
    encoding_format: 'float'
  };

  console.log(`Embedding ${texts.length} texts via ${url}...`);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Embedding API error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  // Sort by index to maintain order
  data.data.sort((a, b) => a.index - b.index);
  return data.data.map(d => d.embedding);
}

// ─── 3. Cosine similarity ───
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── 4. Define candidates ───
const exactTitle = corpus[0].title; // First question in DB
const candidates = [
  {
    label: 'A',
    text: exactTitle,
    expected: 'DUPLICATE',
    description: `Exact duplicate of "${exactTitle}"`
  },
  {
    label: 'B',
    text: 'Given an array of integers, find two numbers that add up to a target sum and return their indices',
    expected: 'DUPLICATE or BORDERLINE',
    description: 'Two Sum rephrased'
  },
  {
    label: 'C',
    text: 'Design a LRU cache data structure with O(1) get and put operations',
    expected: 'NOVEL',
    description: 'LRU Cache - clearly different'
  },
  {
    label: 'D',
    text: 'Given a binary tree, return the level order traversal of its nodes values from left to right',
    expected: 'NOVEL',
    description: 'Binary Tree Level Order Traversal'
  }
];

// ─── 5. Run ───
async function main() {
  // Embed all 4 candidates
  const candidateTexts = candidates.map(c => c.text);
  const candidateEmbeddings = await embedTexts(candidateTexts);
  console.log(`Got ${candidateEmbeddings.length} candidate embeddings, each with ${candidateEmbeddings[0].length} dims.\n`);

  const DUPLICATE_T  = 0.88;
  const BORDERLINE_T = 0.75;

  const results = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const emb = candidateEmbeddings[i];

    let maxSim = -1;
    let bestTitle = '';
    let bestId = null;

    for (const row of corpus) {
      const sim = cosineSimilarity(emb, row.embedding);
      if (sim > maxSim) {
        maxSim = sim;
        bestTitle = row.title;
        bestId = row.id;
      }
    }

    let classification;
    if (maxSim >= DUPLICATE_T) classification = 'DUPLICATE';
    else if (maxSim >= BORDERLINE_T) classification = 'BORDERLINE';
    else classification = 'NOVEL';

    const passOrObserve = classification === 'NOVEL' ? 'PASS' :
                          classification === 'BORDERLINE' ? 'OBSERVE' : 'REJECT';

    const result = {
      candidate: c.label,
      inputText: c.text,
      description: c.description,
      expected: c.expected,
      classification,
      maxSimilarity: parseFloat(maxSim.toFixed(6)),
      mostSimilarTitle: bestTitle,
      mostSimilarId: bestId,
      passOrObserve
    };

    results.push(result);

    console.log(`--- Candidate ${c.label} ---`);
    console.log(`Input:      "${c.text}"`);
    console.log(`Expected:   ${c.expected}`);
    console.log(`Got:        ${classification} (sim=${maxSim.toFixed(6)})`);
    console.log(`Best match: "${bestTitle}" (id=${bestId})`);
    console.log(`Action:     ${passOrObserve}`);
    console.log();
  }

  // ─── 6. Summary ───
  console.log('========== FINAL JSON ==========');
  console.log(JSON.stringify(results, null, 2));
  console.log();

  // Check correctness
  let allCorrect = true;
  for (const r of results) {
    const exp = r.expected;
    const cls = r.classification;
    let ok = false;
    if (exp === cls) ok = true;
    if (exp === 'DUPLICATE or BORDERLINE' && (cls === 'DUPLICATE' || cls === 'BORDERLINE')) ok = true;
    if (!ok) allCorrect = false;
    console.log(`Candidate ${r.candidate}: expected ${exp} → got ${cls}  ${ok ? '✓' : '✗ MISMATCH'}`);
  }
  console.log(`\nOverall: ${allCorrect ? 'ALL CORRECT ✓' : 'SOME MISMATCHES ✗'}`);
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
