import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ExamState {
  patient: Record<string, unknown> | null;
  protocolId: number | null;
  protocolName: string | null;
  sequences: Array<{
    id: number;
    nombre_secuencia: string;
    plane?: string;
    tr_default?: number | null;
    te_default?: number | null;
    fov_default?: number | null;
    slice_thickness_default?: number | null;
  }>;
}

interface ExamContextType {
  exam: ExamState;
  setExam: (exam: ExamState) => void;
  clearExam: () => void;
}

const defaultExam: ExamState = {
  patient: null,
  protocolId: null,
  protocolName: null,
  sequences: [],
};

const ExamContext = createContext<ExamContextType | null>(null);

export function ExamProvider({ children }: { children: ReactNode }) {
  const [exam, setExamState] = useState<ExamState>(defaultExam);

  const setExam = (newExam: ExamState) => setExamState(newExam);
  const clearExam = () => setExamState(defaultExam);

  return (
    <ExamContext.Provider value={{ exam, setExam, clearExam }}>
      {children}
    </ExamContext.Provider>
  );
}

export function useExam(): ExamContextType {
  const ctx = useContext(ExamContext);
  if (!ctx) throw new Error('useExam must be used within ExamProvider');
  return ctx;
}