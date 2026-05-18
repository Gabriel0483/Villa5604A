
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToHistory() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect residents to their new billing history subpage
    router.replace('/my-bills/history');
  }, [router]);

  return null;
}
