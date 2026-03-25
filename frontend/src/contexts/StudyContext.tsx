import { createContext, useContext, useState, ReactNode } from 'react';

interface StudyContextType {
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
  aiDisclosureAccepted: boolean;
  setAiDisclosureAccepted: (v: boolean) => void;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export function StudyProvider({ children }: { children: ReactNode }) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [aiDisclosureAccepted, setAiDisclosureAccepted] = useState(false);

  return (
    <StudyContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        aiDisclosureAccepted,
        setAiDisclosureAccepted,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error('useStudy must be used within a StudyProvider');
  }
  return context;
}
