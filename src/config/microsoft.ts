/** Microsoft 365 / Graph – PHT Standard-Account */
export const MS_DEFAULT_USER = import.meta.env.VITE_MS_DEFAULT_USER ?? 'weller@pht.group';

export const MS_SCOPES = [
  'User.Read',
  'Calendars.ReadWrite',
  'Tasks.ReadWrite',
  'Mail.Send',
] as const;

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
