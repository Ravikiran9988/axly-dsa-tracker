const { z } = require('zod');

const difficultyEnum = z.enum(['easy', 'medium', 'hard'], {
  errorMap: () => ({ message: 'difficulty must be one of easy|medium|hard' })
});

const submissionStatusEnum = z.enum(['not_started', 'attempted', 'solved', 'skipped'], {
  errorMap: () => ({ message: 'status must be one of not_started|attempted|solved|skipped' })
});

const assignmentStatusEnum = z.enum(['assigned', 'unassigned'], {
  errorMap: () => ({ message: 'status must be one of assigned|unassigned' })
});

// Questions
const createQuestionSchema = z.object({
  title: z.string().trim().min(1, { message: 'title is required' }),
  difficulty: difficultyEnum,
  topic_id: z.string().trim().nullable().optional(),
  url: z.string().trim().url({ message: 'url must be a valid URL' })
});

const updateQuestionSchema = z.object({
  title: z.string().trim().min(1).optional(),
  difficulty: difficultyEnum.optional(),
  topic_id: z.string().trim().nullable().optional(),
  url: z.string().trim().url({ message: 'url must be a valid URL' }).optional(),
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
  question_id: z.string().trim().min(1, { message: 'question_id is required' })
});

const bulkAssignmentSchema = z.object({
  user_ids: z.array(z.string().trim().min(1)).min(1, { message: 'user_ids array cannot be empty' }),
  question_ids: z.array(z.string().trim().min(1)).min(1, { message: 'question_ids array cannot be empty' })
});

// Submissions
const updateSubmissionSchema = z.object({
  status: submissionStatusEnum
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
  paginationSchema,
  difficultyEnum,
  submissionStatusEnum
};
