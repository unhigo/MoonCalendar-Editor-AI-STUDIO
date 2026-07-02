/**
 * Hook for persisting state to localStorage with type safety
 */

import { useEffect, useCallback } from 'react';

interface UseLocalStorageOptions {
  serializer?: (value: any) => string;
  deserializer?: (value: string) => any;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
) {
  const { serializer = JSON.stringify, deserializer = JSON.parse } = options;

  // Get from local storage by key
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue, deserializer]);

  // State to store our value
  const [storedValue, setStoredValue] = useLocalStorage_Internal(
    readValue,
    initialValue
  );

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serializer(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, serializer, setStoredValue]
  );

  return [storedValue, setValue] as const;
}

// Helper hook to avoid infinite loops
function useLocalStorage_Internal<T>(readValue: () => T, initialValue: T) {
  const [storedValue, setStoredValue] = React.useState<T>(initialValue);

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  return [storedValue, setStoredValue] as const;
}

import React from 'react';
