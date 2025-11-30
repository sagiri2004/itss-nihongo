import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { translations, type LanguageCode } from '../i18n/translations'

type TranslationParams = Record<string, string | number>

type LanguageContextValue = {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: string, params?: TranslationParams) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)

const STORAGE_KEY = 'itss.nihongo.language'

const resolveKey = (language: LanguageCode, key: string) => {
  const segments = key.split('.')
  let current: unknown = translations[language]

  for (const segment of segments) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return typeof current === 'string' ? current : undefined
}

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window === 'undefined') {
      return 'ja'
    }
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null
    return stored ?? 'ja'
  })

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language
    }
  }, [language])

  const translate = useCallback(
    (key: string, params?: TranslationParams) => {
      const template = resolveKey(language, key)
      if (!template) {
        return key
      }

      if (!params) {
        return template
      }

      return template.replace(/\{(\w+)\}/g, (_, token: string) => {
        const value = params[token]
        return value !== undefined ? String(value) : ''
      })
    },
    [language],
  )

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translate,
    }),
    [language, setLanguage, translate],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}


