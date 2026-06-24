import React, { createContext, useContext } from 'react';

interface CommunityContextType {
  isCommunityMode: boolean;
  toggleCommunityMode: () => void;
  setCommunityMode: (value: boolean) => void;
}

const CommunityContext = createContext<CommunityContextType>({
  isCommunityMode: false,
  toggleCommunityMode: () => {},
  setCommunityMode: () => {},
});

export const useCommunityMode = () => useContext(CommunityContext);

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isCommunityMode = false;
  const toggleCommunityMode = () => {};
  const setCommunityMode = () => {};

  return (
    <CommunityContext.Provider value={{ isCommunityMode, toggleCommunityMode, setCommunityMode }}>
      {children}
    </CommunityContext.Provider>
  );
};

