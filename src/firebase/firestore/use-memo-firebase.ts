
'use client';

import { useMemo, useRef } from 'react';

/**
 * A specialized hook to stabilize Firestore references and queries.
 * Firestore references (collection, doc) and queries (query) are objects that are
 * recreated on every call, even with the same parameters. This hook ensures
 * that the same instance is returned as long as the dependencies don't change,
 * preventing unnecessary re-subscriptions in hooks like useCollection and useDoc.
 */
export function useMemoFirebase<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<T>(null);
  const depsRef = useRef<React.DependencyList>(null);

  const changed = !depsRef.current || !deps.every((d, i) => d === depsRef.current![i]);

  if (changed) {
    depsRef.current = deps;
    ref.current = factory();
  }

  return ref.current!;
}
