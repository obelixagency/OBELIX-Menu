"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AGENCY_LANG_COOKIE,
  DEFAULT_AGENCY_LOCALE,
  dirForLocale,
  getDictionary,
  parseAgencyLocale,
  type AgencyDictionary,
  type AgencyLocale,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: AgencyLocale;
  dir: "ltr" | "rtl";
  t: AgencyDictionary;
  setLocale: (next: AgencyLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function writeLangCookie(locale: AgencyLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${AGENCY_LANG_COOKIE}=${locale}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function AgencyLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: AgencyLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AgencyLocale>(
    initialLocale ?? DEFAULT_AGENCY_LOCALE
  );

  const setLocale = useCallback((next: AgencyLocale) => {
    const parsed = parseAgencyLocale(next);
    setLocaleState(parsed);
    writeLangCookie(parsed);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = dirForLocale(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: dirForLocale(locale),
      t: getDictionary(locale),
      setLocale,
    }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useAgencyLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useAgencyLocale must be used within AgencyLocaleProvider");
  }
  return ctx;
}
