'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export function ClientOnly({ children }: Props) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
} 