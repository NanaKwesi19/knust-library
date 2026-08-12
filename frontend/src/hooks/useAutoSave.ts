import { useState, useEffect } from 'react';

export function useAutoSave<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const saved = JSON.parse(item) as T;

      // Saved form state can pre-date newer fields. Merge object-shaped
      // drafts with the current defaults so newly added inputs never receive
      // undefined values (e.g. copiesCount, barcodePrefix, isbn).
      if (
        saved !== null &&
        typeof saved === 'object' &&
        initialValue !== null &&
        typeof initialValue === 'object' &&
        !Array.isArray(saved) &&
        !Array.isArray(initialValue)
      ) {
        return { ...(initialValue as Record<string, unknown>), ...(saved as Record<string, unknown>) } as T;
      }

      return saved;
    } catch (error) {
      console.warn('Error reading localStorage', error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Error setting localStorage', error);
    }
  }, [key, value]);

  const clearSave = () => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Error removing localStorage', error);
    }
  };

  return [value, setValue, clearSave];
}
