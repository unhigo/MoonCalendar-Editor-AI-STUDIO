import { createContext, useContext } from 'react';

export const LunarContext = createContext<any>(null);

export function useLunarContext() {
  return useContext(LunarContext);
}
