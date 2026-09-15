process.env.NODE_ENV = 'test';

const { validateQuestion } = require('../scripts/import-local-question-bank');

describe('Local Question Bank Importer', () => {

  describe('Validation Logic', () => {
    it('should reject missing or invalid titles', () => {
      const q = { title: 'todo', description: 'test', input_format: 'i', output_format: 'o', examples: '[]', starter_code: '{"python":"pass"}' };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toMatch(/Invalid or missing title/);
    });

    it('should reject missing descriptions', () => {
      const q = { title: 'Valid Title', description: '', problem_statement: '', input_format: 'i', output_format: 'o', examples: '[]', starter_code: '{"python":"pass"}' };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toMatch(/Missing description/);
    });

    it('should reject missing input format', () => {
      const q = { title: 'Valid Title', description: 'Valid Desc', input_format: 'todo', output_format: 'o', examples: '[]', starter_code: '{"python":"pass"}' };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toMatch(/Missing input_format/);
    });

    it('should reject malformed examples JSON', () => {
      const q = { title: 'Title', description: 'Desc', input_format: 'i', output_format: 'o', examples: 'invalid', starter_code: '{"python":"pass"}' };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toMatch(/Invalid JSON in examples/);
    });

    it('should reject empty test cases', () => {
      const q = { title: 'Title', description: 'Desc', input_format: 'i', output_format: 'o', examples: '[]', starter_code: '{"python":"pass"}' };
      expect(validateQuestion(q, [])).toMatch(/Question has no test cases/);
    });

    it('should reject invalid starter code', () => {
      const q = { title: 'Title', description: 'Desc', input_format: 'i', output_format: 'o', examples: '[]', starter_code: '{}' };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toMatch(/Missing or invalid starter_code/);
    });

    it('should accept valid questions', () => {
      const q = { 
        title: 'Valid Title', 
        description: 'Valid Desc', 
        input_format: 'Valid in', 
        output_format: 'Valid out', 
        examples: '[{"input":"1", "output":"1"}]', 
        starter_code: '{"python":"def func(): pass"}' 
      };
      expect(validateQuestion(q, [{ input: '1', expected_output: '1' }])).toBeNull();
    });
  });

});
