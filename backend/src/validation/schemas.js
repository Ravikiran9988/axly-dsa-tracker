const { z } = require('zod');

const difficultyEnum = z.enum(['easy', 'medium', 'hard'], {
  errorMap: () => ({ message: 'difficulty must be one of easy|medium|hard' })
});

const submissionStatusEnum = z.enum([
  'not_started', 'attempted', 'solved', 'skipped', 
  'pending', 'submitted', 'under_review', 'approved', 'changes_requested', 'completed', 'rejected'
], {
  errorMap: () => ({ message: 'status must be a valid submission status' })
});

const assignmentStatusEnum = z.enum([
  'assigned', 'unassigned', 'ongoing', 'submitted', 'under_review', 'completed', 'incomplete', 'overdue'
], {
  errorMap: () => ({ message: 'status must be a valid assignment status' })
});

const testCaseSchema = z.object({
  id: z.string().optional(),
  input: z.string().default(''),
  expected_output: z.string().default(''),
  is_hidden: z.boolean().or(z.number()).default(false)
});

// Questions
const createQuestionSchema = z.object({
  title: z.string().trim().min(1, { message: 'title is required' }),
  difficulty: difficultyEnum,
  topic_id: z.string().trim().nullable().optional(),
  url: z.string().trim().url({ message: 'url must be a valid URL' }).optional().or(z.literal('')),
  description: z.string().optional(),
  problem_statement: z.string().optional(),
  constraints: z.string().optional(),
  input_format: z.string().optional(),
  output_format: z.string().optional(),
  example_input: z.string().optional(),
  example_output: z.string().optional(),
  hints: z.string().optional(),
  tags: z.string().optional().or(z.array(z.string())),
  estimated_time: z.string().optional(),
  points: z.coerce.number().optional(),
  assigned_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  starter_code: z.string().optional().or(z.record(z.string())),
  test_cases: z.array(testCaseSchema).optional()
});

const updateQuestionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  difficulty: difficultyEnum.optional(),
  topic_id: z.string().trim().nullable().optional(),
  url: z.string().trim().url({ message: 'url must be a valid URL' }).optional().or(z.literal('')),
  description: z.string().optional(),
  problem_statement: z.string().optional(),
  constraints: z.string().optional(),
  input_format: z.string().optional(),
  output_format: z.string().optional(),
  example_input: z.string().optional(),
  example_output: z.string().optional(),
  hints: z.string().optional(),
  tags: z.string().optional().or(z.array(z.string())),
  estimated_time: z.string().optional(),
  points: z.coerce.number().optional(),
  assigned_date: z.string().optional(),
  due_date: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  starter_code: z.string().optional().or(z.record(z.string())),
  test_cases: z.array(testCaseSchema).optional(),
  is_active: z.boolean().optional()
});

// Daily Question
const setDailyQuestionSchema = z.object({
  question_id: z.string().trim().min(1, { message: 'question_id is required' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' }).optional()
});

// Assignments
const createAssignmentSchema = z.object({
  user_id: z.string().trim().min(1, { message: 'user_id is required' }),
  question_id: z.string().trim().min(1, { message: 'question_id is required' }),
  cohort_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  instructions: z.string().optional().nullable()
});

const bulkAssignmentSchema = z.object({
  user_ids: z.array(z.string().trim().min(1)).min(1, { message: 'user_ids array cannot be empty' }),
  question_ids: z.array(z.string().trim().min(1)).min(1, { message: 'question_ids array cannot be empty' }),
  cohort_id: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  instructions: z.string().optional().nullable()
});

// Submissions
const updateSubmissionSchema = z.object({
  status: submissionStatusEnum
});

// Code Execution Schemas
const runCodeSchema = z.object({
  question_id: z.string().trim().min(1, { message: 'question_id is required' }),
  language: z.enum(['javascript', 'js', 'node', 'python', 'py', 'python3', 'java', 'cpp', 'c', 'typescript', 'ts']).default('javascript'),
  source_code: z.string().min(1, { message: 'source_code cannot be empty' }),
  custom_input: z.string().optional()
});

const submitCodeSchema = z.object({
  question_id: z.string().trim().min(1, { message: 'question_id is required' }),
  language: z.enum(['javascript', 'js', 'node', 'python', 'py', 'python3', 'java', 'cpp', 'c', 'typescript', 'ts']).default('javascript'),
  source_code: z.string().min(1, { message: 'source_code cannot be empty' })
});

// Query params validator
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20)
});

module.exports = {
  createQuestionSchema,
  updateQuestionSchema,
  setDailyQuestionSchema,
  createAssignmentSchema,
  bulkAssignmentSchema,
  updateSubmissionSchema,
  runCodeSchema,
  submitCodeSchema,
  paginationSchema,
  difficultyEnum,
  submissionStatusEnum,
  assignmentStatusEnum
};
