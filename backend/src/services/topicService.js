const { getRepository } = require('../db/repositoryFactory');

const repo = getRepository();

function parseJsonField(val, fallback = []) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * List all topics and associated patterns for Daily Challenges
 */
async function listDailyChallengeTopics() {
  const topics = await repo.many(`
    SELECT * FROM topics
    ORDER BY name ASC
  `);

  const patterns = await repo.many(`
    SELECT * FROM patterns
    ORDER BY name ASC
  `);

  const formattedPatterns = patterns.map(p => ({
    id: p.id,
    name: p.name,
    topic_id: p.topic_id || null,
    applicable_topics: parseJsonField(p.applicable_topics, [])
  }));

  const topicList = topics.map(t => {
    const matchingPatterns = formattedPatterns.filter(p => 
      p.topic_id === t.id || p.applicable_topics.includes(t.id)
    ).map(p => ({ id: p.id, name: p.name }));

    return {
      id: t.id,
      name: t.name,
      category: t.category || 'Other',
      description: t.description || '',
      patterns: matchingPatterns
    };
  });

  // Ensure "other" exists
  if (!topicList.some(t => t.id === 'other')) {
    topicList.push({
      id: 'other',
      name: 'Other',
      category: 'Other',
      description: 'Custom topic specification',
      patterns: []
    });
  }

  // Group by category
  const categories = {
    'Core': [],
    'Trees': [],
    'Graphs': [],
    'Advanced': [],
    'Other': []
  };

  topicList.forEach(t => {
    const cat = categories[t.category] ? t.category : 'Other';
    categories[cat].push(t);
  });

  return {
    topics: topicList,
    categories,
    patterns: formattedPatterns
  };
}

/**
 * Recommend topic & pattern for AI generation or manual selection based on challenge history & topic diversity
 */
async function recommendTopicForDailyChallenge({ difficulty = 'medium' } = {}) {
  const { topics, patterns } = await listDailyChallengeTopics();

  // Query recent challenges (last 15) to evaluate topic frequency
  const recent = await repo.many(`
    SELECT dc.topic_id, dc.custom_topic, t.name AS topic_name, dc.created_at
    FROM daily_challenge_problems dc
    LEFT JOIN topics t ON dc.topic_id = t.id
    WHERE dc.status != 'archived' AND dc.is_active = 1
    ORDER BY dc.created_at DESC
    LIMIT 15
  `);

  const topicCounts = {};
  recent.forEach(r => {
    const key = r.topic_id || (r.custom_topic ? 'other' : 'arrays');
    topicCounts[key] = (topicCounts[key] || 0) + 1;
  });

  const normDiff = String(difficulty || 'medium').toLowerCase();

  // Difficulty suitability affinity maps
  const difficultyAffinity = {
    easy: ['arrays', 'strings', 'two-pointers', 'hashing', 'linked-list', 'math', 'stack', 'binary-search'],
    medium: ['graphs', 'bfs', 'dfs', 'trees', 'binary-trees', 'binary-search', 'sliding-window', 'heap-priority-queue', 'greedy', 'prefix-sum', 'monotonic-stack', 'dynamic-programming'],
    hard: ['dynamic-programming', 'shortest-path', 'union-find-dsu', 'topological-sort', 'tries', 'segment-tree', 'fenwick-tree-bit', 'advanced-algorithms', 'heap-priority-queue']
  };

  const preferredIds = difficultyAffinity[normDiff] || difficultyAffinity.medium;

  // Filter out "other" from automatic recommendation pool unless necessary
  const candidates = topics.filter(t => t.id !== 'other');

  // Sort candidates by:
  // 1. Frequency in recent challenges (ascending - least used first)
  // 2. Preferred affinity for difficulty
  candidates.sort((a, b) => {
    const countA = topicCounts[a.id] || 0;
    const countB = topicCounts[b.id] || 0;

    if (countA !== countB) return countA - countB;

    const prefA = preferredIds.includes(a.id) ? 0 : 1;
    const prefB = preferredIds.includes(b.id) ? 0 : 1;
    return prefA - prefB;
  });

  const chosenTopic = candidates[0] || topics[0];

  // Pick matching pattern
  const topicPatterns = chosenTopic.patterns || [];
  const chosenPattern = topicPatterns.length > 0
    ? topicPatterns[Math.floor(Math.random() * topicPatterns.length)]
    : null;

  const recentCount = topicCounts[chosenTopic.id] || 0;
  const reason = recentCount === 0
    ? `Recommended "${chosenTopic.name}" because it has not been featured in recent challenges, promoting curriculum diversity.`
    : `Recommended "${chosenTopic.name}" (${chosenPattern ? chosenPattern.name : 'standard pattern'}) to maintain topic balance across ${normDiff.toUpperCase()} difficulty challenges.`;

  return {
    topic_id: chosenTopic.id,
    topic_name: chosenTopic.name,
    category: chosenTopic.category,
    pattern_id: chosenPattern ? chosenPattern.id : '',
    pattern_name: chosenPattern ? chosenPattern.name : '',
    reason
  };
}

module.exports = {
  listDailyChallengeTopics,
  recommendTopicForDailyChallenge
};
