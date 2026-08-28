import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminProfile from './AdminProfile';
import StudentProfile from './StudentProfile';

export default function UserProfile({ onSelectProblem }) {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminProfile onSelectProblem={onSelectProblem} />;
  }

  return <StudentProfile onSelectProblem={onSelectProblem} />;
}
