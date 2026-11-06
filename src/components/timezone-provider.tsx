"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

const TimezoneContext = createContext({ timezone: DEFAULT_TIMEZONE, setTimezone: (_value: string) => {} });

export function TimezoneProvider({ initialTimezone, children }: { initialTimezone: string; children: React.ReactNode }) {
  const [timezone, setTimezone] = useState(initialTimezone);
  useEffect(() => { setTimezone(initialTimezone); }, [initialTimezone]);
  const value = useMemo(() => ({ timezone, setTimezone }), [timezone]);
  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export const useTimezone = () => useContext(TimezoneContext);
