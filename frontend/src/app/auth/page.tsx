'use client';

import { redirect } from 'next/navigation';

export default function AuthPage() {
  // Redirect to signup page by default
  redirect('/auth/signup');
}