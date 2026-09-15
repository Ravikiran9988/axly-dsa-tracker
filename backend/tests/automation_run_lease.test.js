let mockRepo;

jest.mock('../src/db/repositoryFactory', () => ({
  getRepository: () => mockRepo
}));

const {
  recoverStaleAutomationRun,
  STALE_RUN_THRESHOLD_MS
} = require('../src/services/automationRunLease');

describe('Daily automation run lease', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRepo = {
      one: jest.fn(),
      execute: jest.fn()
    };
  });

  test('recovers a RUNNING run after the stale threshold', async () => {
    const staleAt = new Date(Date.now() - STALE_RUN_THRESHOLD_MS - 1000).toISOString();
    mockRepo.one.mockResolvedValue({ last_run_status: 'running', last_run_at: staleAt });
    mockRepo.execute
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValueOnce({ changes: 1 });

    const result = await recoverStaleAutomationRun();

    expect(result.recovered).toBe(true);
    expect(mockRepo.execute).toHaveBeenCalledTimes(2);
    expect(mockRepo.execute.mock.calls[0][0]).toContain("last_run_status = 'failed'");
    expect(mockRepo.execute.mock.calls[1][0]).toContain('STALE_RUN_RECOVERED');
  });

  test('does not recover a fresh RUNNING run', async () => {
    const freshAt = new Date(Date.now() - 30 * 1000).toISOString();
    mockRepo.one.mockResolvedValue({ last_run_status: 'running', last_run_at: freshAt });

    const result = await recoverStaleAutomationRun();

    expect(result.recovered).toBe(false);
    expect(mockRepo.execute).not.toHaveBeenCalled();
  });

  test('does nothing when the automation is not running', async () => {
    mockRepo.one.mockResolvedValue({ last_run_status: 'success', last_run_at: new Date().toISOString() });

    const result = await recoverStaleAutomationRun();

    expect(result.recovered).toBe(false);
    expect(mockRepo.execute).not.toHaveBeenCalled();
  });
});
