import { useEffect, useState } from 'react';
import { looksGermanLocally, translateText } from '../services/translateService';

export interface TranslatedTextState {
  displayText: string;
  loading: boolean;
  wasTranslated: boolean;
}

export function useTranslatedText(text: string): TranslatedTextState {
  const original = text?.trim() ?? '';
  const [displayText, setDisplayText] = useState(original);
  const [loading, setLoading] = useState(false);
  const [wasTranslated, setWasTranslated] = useState(false);

  useEffect(() => {
    const normalized = original;
    setDisplayText(normalized);
    setWasTranslated(false);

    if (!normalized) {
      setLoading(false);
      return;
    }

    if (looksGermanLocally(normalized)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void translateText(normalized).then((translated) => {
      if (cancelled) return;
      const result = translated || normalized;
      setDisplayText(result);
      setWasTranslated(result !== normalized);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [original]);

  return { displayText, loading, wasTranslated };
}
