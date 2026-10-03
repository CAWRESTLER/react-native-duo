import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

const DraftContext = createContext<{
  draft: string;
  setDraft: (value: string) => void;
} | null>(null);

// The draft belongs above routes/tabs: neither fold updates nor navigating back can delete it.
export function DraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState(
    'A draft that survives folding, tabs, and modals.'
  );
  const value = useMemo(() => ({ draft, setDraft }), [draft]);
  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
}

export function useDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error('Navigation example requires DraftProvider');
  return value;
}
