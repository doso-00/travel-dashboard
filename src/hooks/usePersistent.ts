import { useEffect, useState } from 'react';
import { load, save } from '../lib/storage';

export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}
