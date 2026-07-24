"use client";

import { useEffect, useMemo, useState } from "react";
import type { StageDto } from "@/lib/types";
import { stageColor } from "@/lib/stage-colors";

const FALLBACK = "#5B6B8C";

/**
 * Etapas del pipeline de la organización (orden del tablero). Un solo fetch
 * de /api/pipeline/stages por montaje; lo usan el mapa de colores y los
 * filtros por etapa de Bandeja y Contactos.
 */
export function useStages(): StageDto[] {
  const [stages, setStages] = useState<StageDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline/stages")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { stages: StageDto[] } | null) => {
        if (cancelled || !data) return;
        setStages(data.stages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return stages;
}

/**
 * Mapa nombre-de-etapa → color derivado (mock SEOMOS). Los DTOs que solo
 * traen stageName (conversaciones, contactos) resuelven su color aquí.
 */
export function useStageColors(): (stageName: string | null) => string {
  const stages = useStages();
  const byName = useMemo(
    () => Object.fromEntries(stages.map((s) => [s.name, stageColor(s)])),
    [stages]
  );
  return (stageName) => (stageName ? (byName[stageName] ?? FALLBACK) : FALLBACK);
}
