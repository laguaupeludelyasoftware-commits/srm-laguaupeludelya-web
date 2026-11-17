import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { DemoState } from '../domain/models';
import { createSeed } from './seed';

const KEY = 'lya-demo-v1';
type DemoContextValue = {
  state: DemoState;
  update: (change: (draft: DemoState) => void) => void;
  reset: () => void;
  storageError: boolean;
};
const DemoContext = createContext<DemoContextValue | null>(null);

/** Recupera únicamente datos del prototipo; una versión incompatible vuelve al ejemplo inicial. */
function readState(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw);
    if (
      parsed.version === 1 &&
      Array.isArray(parsed.clients) &&
      parsed.clients.length &&
      Array.isArray(parsed.appointments) &&
      parsed.settings?.hours
    )
      return parsed;
  } catch {
    /* Almacenamiento bloqueado o JSON inválido: se puede seguir en memoria. */
  }
  return createSeed();
}

/** Provee un estado compartido de demostración sin almacenar contraseñas ni credenciales. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readState);
  const [storageError, setStorageError] = useState(false);
  /** Persiste fuera del actualizador de React para evitar efectos duplicados en StrictMode. */
  function commit(next: DemoState) {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  /** Aplica una mutación a una copia, preservando la inmutabilidad del estado publicado. */
  function update(change: (draft: DemoState) => void) {
    const next = structuredClone(state);
    change(next);
    commit(next);
  }
  return (
    <DemoContext.Provider
      value={{ state, update, reset: () => commit(createSeed()), storageError }}
    >
      {children}
    </DemoContext.Provider>
  );
}

/** Expone el adaptador local; reemplazar este límite al conectar la API real. */
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error('useDemo debe utilizarse dentro de DemoProvider.');
  return context;
}
