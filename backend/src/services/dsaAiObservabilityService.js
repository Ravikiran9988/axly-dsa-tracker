class DsaAiObservabilityService {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      databaseHits: 0,
      graphHits: 0,
      llmCalls: 0,
      cacheHits: 0,
      fallbackCalls: 0,
      codeVerifications: 0,
      successfulVerifications: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalLatencyMs: 0,
      intentsCount: {},
      providersCount: {},
      errorsCount: 0
    };
    this.recentEvents = [];
    this.maxRecentEvents = 50;
  }

  recordEvent(event = {}) {
    const {
      intent = 'UNKNOWN',
      source = 'llm',
      provider = 'none',
      latencyMs = 0,
      tokens = {},
      verified = null,
      error = null
    } = event;

    this.metrics.totalRequests++;
    this.metrics.totalLatencyMs += Number(latencyMs) || 0;

    if (source === 'database') this.metrics.databaseHits++;
    else if (source === 'graph') this.metrics.graphHits++;
    else if (source === 'cache') this.metrics.cacheHits++;
    else if (source === 'llm') this.metrics.llmCalls++;
    else if (source === 'fallback') this.metrics.fallbackCalls++;

    if (tokens?.promptTokens) this.metrics.totalPromptTokens += tokens.promptTokens;
    if (tokens?.completionTokens) this.metrics.totalCompletionTokens += tokens.completionTokens;

    if (verified !== null && verified !== undefined) {
      this.metrics.codeVerifications++;
      if (verified === true) this.metrics.successfulVerifications++;
    }

    if (error) {
      this.metrics.errorsCount++;
    }

    this.metrics.intentsCount[intent] = (this.metrics.intentsCount[intent] || 0) + 1;
    this.metrics.providersCount[provider] = (this.metrics.providersCount[provider] || 0) + 1;

    // Push lightweight sanitized event log (never storing full user code)
    const logItem = {
      timestamp: new Date().toISOString(),
      intent,
      source,
      provider,
      latencyMs: Math.round(latencyMs),
      verified: verified !== null ? Boolean(verified) : undefined,
      hasError: Boolean(error)
    };

    this.recentEvents.unshift(logItem);
    if (this.recentEvents.length > this.maxRecentEvents) {
      this.recentEvents.pop();
    }
  }

  getMetrics() {
    const avgLatency = this.metrics.totalRequests > 0
      ? Math.round(this.metrics.totalLatencyMs / this.metrics.totalRequests)
      : 0;

    return {
      ...this.metrics,
      averageLatencyMs: avgLatency,
      recentEvents: this.recentEvents.slice(0, 20)
    };
  }

  reset() {
    this.metrics.totalRequests = 0;
    this.metrics.databaseHits = 0;
    this.metrics.graphHits = 0;
    this.metrics.llmCalls = 0;
    this.metrics.cacheHits = 0;
    this.metrics.fallbackCalls = 0;
    this.metrics.codeVerifications = 0;
    this.metrics.successfulVerifications = 0;
    this.metrics.totalPromptTokens = 0;
    this.metrics.totalCompletionTokens = 0;
    this.metrics.totalLatencyMs = 0;
    this.metrics.intentsCount = {};
    this.metrics.providersCount = {};
    this.metrics.errorsCount = 0;
    this.recentEvents = [];
  }
}

module.exports = new DsaAiObservabilityService();
