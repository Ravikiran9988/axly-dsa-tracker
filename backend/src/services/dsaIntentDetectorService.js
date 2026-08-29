class DsaIntentDetectorService {
  /**
   * Deterministically detect user intent from query text
   * @param {string} text 
   * @returns {{ intent: string, confidence: number, matchedKeywords: string[] }}
   */
  detectIntent(text) {
    if (!text || typeof text !== 'string') {
      return { intent: 'GENERAL_DSA', confidence: 0.5, matchedKeywords: [] };
    }

    const cleaned = text.trim().toLowerCase();

    // 1. CODE REVIEW & REFACTOR
    if (
      /(review|check|evaluate|critique|improve|refactor|clean\s*up)\s+(my\s+)?(code|solution|implementation|logic)/i.test(cleaned) ||
      (/```[a-z]*[\s\S]+```/i.test(text) && !/(error|bug|fail|wrong|fix|exception)/i.test(cleaned)) ||
      /(is\s+(this|my)\s+(code|solution|approach)\s+(good|optimal|clean|correct))/i.test(cleaned)
    ) {
      return {
        intent: 'CODE_REVIEW',
        confidence: 0.95,
        matchedKeywords: ['code_review', 'refactor']
      };
    }

    // 2. DEBUG & ERROR ANALYSIS
    if (
      /(why\s+is\s+(this|it|my\s+code)\s+(failing|giving\s+error|wrong|throwing|slow))/i.test(cleaned) ||
      /(fix\s+(my\s+)?(code|bug|error|issue|solution))/i.test(cleaned) ||
      /(time\s*limit\s*exceeded|tle|wrong\s*answer|wa|runtime\s*error|memory\s*limit|nullpointer|index\s*out\s*of\s*bounds|segmentation\s*fault|recursion\s*error|stack\s*overflow)/i.test(cleaned) ||
      /(getting\s+(error|wrong\s+output|garbage\s+value|infinite\s+loop))/i.test(cleaned) ||
      /(debug|find\s+(the\s+)?bug|where\s+am\s+i\s+going\s+wrong)/i.test(cleaned)
    ) {
      return {
        intent: 'DEBUG',
        confidence: 0.95,
        matchedKeywords: ['debug', 'error_troubleshooting']
      };
    }

    // 3. COMPLEXITY ANALYSIS
    if (
      /(time\s*complexity|space\s*complexity|big\s*o|o\(n\)|o\(1\)|o\(log\s*n\)|asymptotic|runtime\s+complexity|memory\s+complexity|what\s+is\s+the\s+complexity)/i.test(cleaned) ||
      /(how\s+fast\s+does|how\s+much\s+memory|space\s+and\s+time)/i.test(cleaned)
    ) {
      return {
        intent: 'COMPLEXITY',
        confidence: 0.98,
        matchedKeywords: ['time_complexity', 'space_complexity', 'big_o']
      };
    }

    // 4. TEST CASE & EDGE CASES
    if (
      /(test\s*cases?|edge\s*cases?|corner\s*cases?|boundary\s*conditions?|example\s*inputs?|sample\s*inputs?|sample\s*cases?)/i.test(cleaned) ||
      /(empty\s+array|single\s+element|negative\s+numbers|all\s+duplicates|large\s+input|overflow\s+cases)/i.test(cleaned)
    ) {
      return {
        intent: 'TEST_CASE',
        confidence: 0.95,
        matchedKeywords: ['test_cases', 'edge_cases']
      };
    }

    // 5. HINT / CLUE / NUDGE
    if (
      /(give\s*(me)?\s*(a\s*)?hint|clue|nudge|push|stuck|give\s+me\s+a\s+small\s+hint|first\s+step\s+hint|small\s+hint|don'?t\s+give\s+me\s+the\s+full\s+solution)/i.test(cleaned) ||
      /^(hint|hints|give\s+hint)(\s+please)?$/i.test(cleaned)
    ) {
      return {
        intent: 'HINT',
        confidence: 0.98,
        matchedKeywords: ['hint', 'nudge']
      };
    }

    // 6. SOLUTION / COMPLETE CODE
    if (
      /(full\s+.*solution|complete\s+.*solution|give\s+.*(the\s+)?(code|solution)|show\s+.*(the\s+)?(code|solution)|optimal\s*code|python\s+code|javascript\s+code|cpp\s+code|c\+\+\s+code|java\s+code|solution\s+code|write\s+(the\s+)?code)/i.test(cleaned) ||
      /^(solution|show\s+solution|code\s+solution|give\s+code)$/i.test(cleaned)
    ) {
      return {
        intent: 'SOLUTION',
        confidence: 0.95,
        matchedKeywords: ['solution', 'code_implementation']
      };
    }

    // 7. APPROACH / STRATEGY
    if (
      /(optimal\s*approach|what\s+is\s+the\s+(optimal\s+)?approach|how\s+(do\s+i|to|should\s+i|can\s+i|should\s+we|can\s+we)\s+approach|how\s+do\s+i\s+solve|how\s+should\s+i\s+solve|what\s+approach|what\s+algorithm|strategy|thought\s+process|logic\s+behind|how\s+can\s+we\s+solve|optimal\s+way\s+to\s+solve|approach\s+to\s+solve|approach)/i.test(cleaned) ||
      /(best\s+way\s+to\s+solve|intuition\s+behind|technique\s+to\s+use)/i.test(cleaned)
    ) {
      return {
        intent: 'APPROACH',
        confidence: 0.94,
        matchedKeywords: ['approach', 'strategy', 'algorithm_intuition']
      };
    }

    // 8. EXPLANATION / WALKTHROUGH
    if (
      /(explain|what\s+does\s+this\s+problem\s+mean|break\s+down|walk\s+me\s+through|understand|simplify|clarify|elaborate|what\s+is\s+the\s+problem\s+asking)/i.test(cleaned)
    ) {
      return {
        intent: 'EXPLANATION',
        confidence: 0.92,
        matchedKeywords: ['explanation', 'problem_breakdown']
      };
    }

    // 9. CONCEPT / DSA TOPIC INQUIRY
    if (
      /(what\s+is\s+(a\s+)?(binary\s+search|dynamic\s+programming|tree|graph|hash\s+map|stack|sliding\s+window|two\s+pointers|heap|trie|dsu|monotonic\s+stack|bfs|dfs))/i.test(cleaned) ||
      /(how\s+does\s+.*(work|differ)|difference\s+between|when\s+to\s+use)/i.test(cleaned) ||
      /(concept\s+of|tutorial\s+on|fundamentals\s+of)/i.test(cleaned)
    ) {
      return {
        intent: 'CONCEPT',
        confidence: 0.90,
        matchedKeywords: ['concept', 'dsa_topic']
      };
    }

    // 10. GENERAL DSA FALLBACK
    return {
      intent: 'GENERAL_DSA',
      confidence: 0.65,
      matchedKeywords: ['general_inquiry']
    };
  }
}

module.exports = new DsaIntentDetectorService();
