import type { ElementType, ReactNode } from 'react';
import { useTranslatedText } from '../hooks/useTranslatedText';

type TranslatedTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
  showBadge?: boolean;
  /** When false, skip API translation (e.g. long lists on first paint). */
  enabled?: boolean;
  children?: never;
};

export function TranslatedText({
  text,
  as: Tag = 'span',
  className,
  showBadge = false,
  enabled = true,
}: TranslatedTextProps) {
  const { displayText, wasTranslated } = useTranslatedText(text, enabled);

  let badge: ReactNode = null;
  if (showBadge && wasTranslated) {
    badge = (
      <span className="ml-1.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500 bg-dark-600/80 border border-dark-500/60 align-middle">
        Übersetzt
      </span>
    );
  }

  return (
    <Tag className={className}>
      {displayText}
      {badge}
    </Tag>
  );
}
