// expect: no-restricted-imports
import { createContext } from 'react';

export const BadThemeContext = createContext('light');
