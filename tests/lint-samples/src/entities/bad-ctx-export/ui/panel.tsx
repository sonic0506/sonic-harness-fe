import { createContext } from 'react';

export const PanelContext = createContext(false);
export const Panel = () => (
  <PanelContext.Provider value>panel</PanelContext.Provider>
);
