import { useState, useEffect } from 'react';

export function useAutoSave<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
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
