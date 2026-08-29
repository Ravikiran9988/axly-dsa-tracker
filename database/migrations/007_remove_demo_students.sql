-- Migration 007: remove demo student accounts and their demo-only data.
-- Keep the Axly admin account and all shared question/topic data intact.
BEGIN TRANSACTION;

DELETE FROM cohort_members WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM user_badges WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM submissions WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM assignments WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM notifications WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM audit_logs WHERE user_id IN ('usr-user-01','usr-user-02','usr-user-03');
DELETE FROM users WHERE id IN ('usr-user-01','usr-user-02','usr-user-03');

COMMIT;
