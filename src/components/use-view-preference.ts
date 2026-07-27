"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Preferencia visual local y no sensible. El primer render siempre usa el
 * fallback para que servidor y cliente coincidan; la restauración ocurre al
 * montar y tolera navegadores sin almacenamiento disponible.
 */
export function useViewPreference<T extends string>(
  storageKey: string,
  fallback: T,
  allowed: readonly T[]
) {
  const [value, setValue] = useState<T>(fallback);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && allowed.includes(stored as T)) {
        setValue(stored as T);
      }
    } catch {
      // La pantalla conserva el fallback si localStorage no está disponible.
    }
  }, [allowed, storageKey]);

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, next);
      } catch {
        // La selección sigue funcionando durante la sesión actual.
      }
    },
    [storageKey]
  );

  return [value, update] as const;
}
