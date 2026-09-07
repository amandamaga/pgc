import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { saveSession, type SessionLanguageCode } from "../lib/session-store";

export interface Participant {
  id: string;
  code: string;
  age: number;
  sex: string;
  school: string;
  createdAt: string;
}

export interface ExperimentRecord {
  id: string;
  name: string;
  description: string;
  status: "Draft" | "Active" | "Finished";
  language: "pt-BR" | "no-NO";
  conditionSequence: string;
  tutorialVideoUrl?: string;
  lastModified: string;
  createdAt: string;
  participants: number;
}

export interface SessionRecord {
  id: string;
  experimentId: string;
  name: string;
  participant1: Participant;
  participant2: Participant;
  scheduledDateTime: string;
  status: "Scheduled" | "Running" | "Completed";
  language: SessionLanguageCode;
}

interface ExperimentContextValue {
  experiments: ExperimentRecord[];
  sessions: SessionRecord[];
  participants: Participant[];
  createExperiment: (data: Omit<ExperimentRecord, "id" | "lastModified" | "createdAt" | "participants">) => ExperimentRecord;
  deleteExperiment: (id: string) => void;
  getExperimentById: (id: string) => ExperimentRecord | undefined;
  getSessionsByExperiment: (experimentId: string) => SessionRecord[];
  createSession: (data: Omit<SessionRecord, "id">) => SessionRecord;
  deleteSession: (id: string) => void;
  updateSessionStatus: (id: string, status: SessionRecord["status"]) => void;
  addParticipant: (data: Omit<Participant, "id" | "createdAt">) => Participant;
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

export function useExperimentContext() {
  const ctx = useContext(ExperimentContext);
  if (!ctx) throw new Error("useExperimentContext must be used within ExperimentProvider");
  return ctx;
}

const SEED_PARTICIPANTS: Participant[] = [
  { id: "p1", code: "P001", age: 8, sex: "Feminino", school: "Escola Municipal Centro", createdAt: "2026-01-15" },
  { id: "p2", code: "P002", age: 7, sex: "Masculino", school: "Escola Municipal Centro", createdAt: "2026-01-15" },
  { id: "p3", code: "P003", age: 9, sex: "Feminino", school: "Escola Estadual Norte", createdAt: "2026-02-01" },
  { id: "p4", code: "P004", age: 8, sex: "Masculino", school: "Escola Estadual Norte", createdAt: "2026-02-01" },
  { id: "p5", code: "P005", age: 10, sex: "Feminino", school: "Colégio São João", createdAt: "2026-02-10" },
];

const SEED_EXPERIMENTS: ExperimentRecord[] = [
  {
    id: "exp-1",
    name: "Estudo de Punição Altruísta - TCC 2026",
    description:
      "Investigando como crianças fazem escolhas de punição quando confrontadas com distribuições injustas de recursos. Protocolo com 64 tentativas (4 condições × 16 tentativas).",
    status: "Active",
    language: "pt-BR",
    conditionSequence: "ABAC",
    lastModified: "há 2 horas",
    createdAt: "2026-02-20",
    participants: 4,
  },
  {
    id: "exp-2",
    name: "Fairness Game - Grupo Controle",
    description:
      "Experimento de controle para avaliar comportamento de justiça distributiva em diferentes contextos sociais. Sequência ACAB com 64 tentativas.",
    status: "Draft",
    language: "no-NO",
    conditionSequence: "ACAB",
    lastModified: "há 3 dias",
    createdAt: "2026-03-01",
    participants: 0,
  },
];

const SEED_SESSIONS: SessionRecord[] = [
  {
    id: "sess-1",
    experimentId: "exp-1",
    name: "Sessão Matinal - Dupla 1",
    participant1: SEED_PARTICIPANTS[0],
    participant2: SEED_PARTICIPANTS[1],
    scheduledDateTime: "2026-03-10T09:00",
    status: "Completed",
    language: "pt-BR",
  },
  {
    id: "sess-2",
    experimentId: "exp-1",
    name: "Sessão da Tarde - Dupla 2",
    participant1: SEED_PARTICIPANTS[2],
    participant2: SEED_PARTICIPANTS[3],
    scheduledDateTime: "2026-03-12T14:00",
    status: "Scheduled",
    language: "pt-BR",
  },
];

export function ExperimentProvider({ children }: { children: ReactNode }) {
  const [experiments, setExperiments] = useState<ExperimentRecord[]>(SEED_EXPERIMENTS);
  const [sessions, setSessions] = useState<SessionRecord[]>(SEED_SESSIONS);
  const [participants, setParticipants] = useState<Participant[]>(SEED_PARTICIPANTS);

  useEffect(() => {
    SEED_SESSIONS.forEach((s) => saveSession({ id: s.id, language: s.language }));
  }, []);

  const createExperiment = (
    data: Omit<ExperimentRecord, "id" | "lastModified" | "createdAt" | "participants">
  ): ExperimentRecord => {
    const newExp: ExperimentRecord = {
      ...data,
      id: crypto.randomUUID(),
      lastModified: "agora mesmo",
      createdAt: new Date().toISOString().split("T")[0],
      participants: 0,
    };
    setExperiments((prev) => [newExp, ...prev]);
    return newExp;
  };

  const deleteExperiment = (id: string) => {
    setExperiments((prev) => prev.filter((e) => e.id !== id));
    setSessions((prev) => prev.filter((s) => s.experimentId !== id));
  };

  const getExperimentById = (id: string) => experiments.find((e) => e.id === id);

  const getSessionsByExperiment = (experimentId: string) =>
    sessions.filter((s) => s.experimentId === experimentId);

  const createSession = (data: Omit<SessionRecord, "id">): SessionRecord => {
    const newSession: SessionRecord = { ...data, id: crypto.randomUUID() };
    saveSession({ id: newSession.id, language: newSession.language });
    setSessions((prev) => [...prev, newSession]);
    return newSession;
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSessionStatus = (id: string, status: SessionRecord["status"]) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const addParticipant = (data: Omit<Participant, "id" | "createdAt">): Participant => {
    const newP: Participant = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString().split("T")[0],
    };
    setParticipants((prev) => [...prev, newP]);
    return newP;
  };

  return (
    <ExperimentContext.Provider
      value={{
        experiments,
        sessions,
        participants,
        createExperiment,
        deleteExperiment,
        getExperimentById,
        getSessionsByExperiment,
        createSession,
        deleteSession,
        updateSessionStatus,
        addParticipant,
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}
