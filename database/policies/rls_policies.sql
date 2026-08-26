-- Row Level Security (RLS) Policies for Axly DSA Tracker (V1.0)
-- Target: Supabase PostgreSQL

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_questions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. users table policies
-- Any authenticated user can read public user records (needed for mentor/assignee listing by admins, and self profile)
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can manage user roles"
  ON users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. topics table policies
-- All authenticated users can view topics
CREATE POLICY "Anyone authenticated can view topics"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage topics"
  ON topics FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. questions table policies
-- Users can only read active questions; admins can view all questions (including inactive)
CREATE POLICY "Users can view active questions, admins can view all"
  ON questions FOR SELECT
  TO authenticated
  USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. assignments table policies
-- Users can only view their own assignments; admins can view all
CREATE POLICY "Users view own assignments, admins view all"
  ON assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins can create assignments"
  ON assignments FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update assignments"
  ON assignments FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. submissions table policies
-- Users can only select and update their own submissions; admins can view all submissions
CREATE POLICY "Users can view own submissions, admins can view all"
  ON submissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. daily_questions table policies
-- All authenticated users can view daily questions
CREATE POLICY "Authenticated users can view daily questions"
  ON daily_questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage daily questions"
  ON daily_questions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
