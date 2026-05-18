
"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RedirectToMyBills() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the primary bills page
    router.replace('/my-bills');
  }, [router]);

  return null;
}
