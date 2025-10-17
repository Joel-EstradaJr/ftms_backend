'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * JEV Module Root
 * Redirects to Chart of Accounts by default
 */
export default function JEVPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Chart of Accounts as the default view
    router.push('/jev/chart-of-accounts');
  }, [router]);

  return null;
}
