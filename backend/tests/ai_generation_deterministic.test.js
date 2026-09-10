const { validateGeneratedQuestionAsync } = require('../src/services/aiQuestionService');
const { getTemplate } = require('../src/services/fallbackTemplates');

describe('AI Generation Deterministic Validations', () => {
  it('should validate a correct fallback template', async () => {
    const template = getTemplate('Arrays', 'Easy');
    const result = await validateGeneratedQuestionAsync(JSON.stringify(template), 4);
    expect(result.valid).toBe(true);
    expect(result.candidate).toBeDefined();
    expect(result.candidate.title).toBe(template.title);
  });

  it('should reject malformed JSON', async () => {
    const malformed = '```json\n{ "title": "Missing quotes }\n```';
    const result = await validateGeneratedQuestionAsync(malformed, 4);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('INVALID_GENERATION');
  });

  it('should reject missing required fields', async () => {
    const template = getTemplate('Arrays', 'Easy');
    const invalid = { ...template, difficulty: undefined };
    const result = await validateGeneratedQuestionAsync(JSON.stringify(invalid), 4);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('missing: difficulty');
  });

  it('should reject starter code leaking reference solution in python', async () => {
    const template = getTemplate('Arrays', 'Easy');
    const leakTemplate = {
      ...template,
      starter_code: {
        ...template.starter_code,
        python: template.reference_solution.python
      }
    };
    const result = await validateGeneratedQuestionAsync(JSON.stringify(leakTemplate), 4);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('INVALID_GENERATION: Solution leakage detected');
  });
  
  it('should fail sandbox verification if reference solution is wrong', async () => {
    const template = getTemplate('Arrays', 'Easy');
    const brokenTemplate = {
      ...template,
      reference_solution: {
        ...template.reference_solution,
        python: 'def sumEven(nums): return sum(nums)' // Incorrect, sum of all nums, not even nums
      }
    };
    const result = await validateGeneratedQuestionAsync(JSON.stringify(brokenTemplate), 4);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Sandbox verification failed: Reference solution resulted in Wrong Answer');
  });
});
