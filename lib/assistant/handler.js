const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigiert zu einer App-Seite',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            enum: ['/', '/plan', '/command', '/tenders', '/watchlist', '/calendar', '/todo', '/go-no-go', '/workflow', '/alerts', '/analytics', '/quote'],
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'open_tender',
      description: 'Öffnet eine Ausschreibung im Detail/Drawer',
      parameters: {
        type: 'object',
        properties: { tenderId: { type: 'string' } },
        required: ['tenderId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_daily_digest',
      description: 'Sendet den Tages-Digest per E-Mail an die Ziel-Adresse',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'refresh_tenders',
      description: 'Startet eine neue globale Ausschreibungssuche',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function buildSystemPrompt(ctx) {
  return `Du bist SOPHIE, die persönliche KI-Assistentin und digitale Sekretärin der Geschäftsführung von PHT Hygiene (Industriehygiene, CIP, Food/Pharma/Hospital).

ROLLE:
- Professionell, proaktiv, präzise – wie eine erfahrene Assistentin der GF
- Du kennst alle Daten im PHT Mastertool und hilfst bei Priorisierung, Fristen, Angeboten, E-Mails und Strategie
- Antworte auf Deutsch, klar strukturiert (kurze Absätze, Bullet-Points wo sinnvoll)
- Bei dringenden Fristen immer zuerst warnen
- Nenne konkrete Ausschreibungstitel und Daten aus dem Kontext

AKTUELLER APP-KONTEXT:
${JSON.stringify(ctx, null, 0).slice(0, 12000)}

TOOLS: Nutze Funktionen wenn der Nutzer etwas ausführen will (Seite öffnen, Digest senden, Suche starten, Tender öffnen).
Bei reinen Informationsfragen antworte nur im Text.`;
}

function localReply(ctx, lastUserMsg) {
  const q = (lastUserMsg || '').toLowerCase();
  const urgent = ctx.urgentDeadlines || [];
  const top = ctx.topActions || [];
  const metrics = ctx.metrics || {};

  if (q.includes('briefing') || q.includes('tages') || q.includes('überblick') || q.includes('status')) {
    return [
      `Guten Tag – hier Ihr Briefing, ${ctx.userName || 'Geschäftsführung'}:`,
      '',
      `📊 **Lage:** ${ctx.tenderCount} Ausschreibungen · ${ctx.goCount} GO · Pipeline ${metrics.pipelineMio || '?'}M €`,
      `⚡ **Dringend:** ${urgent.length} Fristen < 14 Tage`,
      `🎯 **Must-Win:** ${ctx.mustWinCount || 0} Deals`,
      '',
      urgent.length ? '**Nächste Fristen:**\n' + urgent.slice(0, 5).map((t) => `• ${t.deadline}: ${t.title}`).join('\n') : '',
      top.length ? '\n**Top-Aktionen:**\n' + top.slice(0, 3).map((a) => `• ${a.title} – ${a.action}`).join('\n') : '',
      '',
      '*(Lokaler Modus – für volle KI: OPENAI_API_KEY in Vercel setzen)*',
    ].filter(Boolean).join('\n');
  }

  if (q.includes('frist') || q.includes('deadline') || q.includes('kalender')) {
    if (!urgent.length) return 'Keine kritischen Fristen in den nächsten 14 Tagen. Ich empfehle dennoch einen Blick auf /calendar.';
    return '**Fristen diese Woche:**\n\n' + urgent.slice(0, 8).map((t) =>
      `• **${t.deadline}** (${t.daysLeft}T) – ${t.title} · ${t.country} · Score ${t.score}`,
    ).join('\n');
  }

  if (q.includes('priorit') || q.includes('wichtig') || q.includes('top')) {
    if (!top.length) return 'Aktuell keine priorisierten Aktionen. Bitte „Neue Suche starten“ im Header.';
    return '**Ihre Top-Prioritäten:**\n\n' + top.slice(0, 5).map((a, i) =>
      `${i + 1}. **[${a.winPriority}]** ${a.title}\n   → ${a.action} (${a.daysLeft} Tage)`,
    ).join('\n\n');
  }

  if (q.includes('marktführer') || q.includes('plan') || q.includes('ziel')) {
    return `**Marktführer-Status:**\n• Umsatz vs. Ziel: ${metrics.revenueVsTarget || 0}%\n• Win-Rate: ${metrics.winRate || 0}%\n• DACH-Anteil: ${metrics.dachShare || 0}%\n\nDetails unter /plan – soll ich dorthin navigieren?`;
  }

  return [
    'Guten Tag! Ich bin **SOPHIE**, Ihre PHT-Assistentin.',
    '',
    'Ich kann helfen mit:',
    '• **Tagesbriefing** – „Gib mir ein Briefing“',
    '• **Fristen & Kalender** – „Welche Deadlines diese Woche?“',
    '• **Prioritäten** – „Was ist heute wichtig?“',
    '• **Aktionen** – Digest senden, Suche starten, Seiten öffnen',
    '',
    `Aktuell: ${ctx.tenderCount} Treffer, ${ctx.goCount} GO-Chancen.`,
    urgent.length ? `⚠️ ${urgent.length} dringende Fristen!` : '',
  ].filter(Boolean).join('\n');
}

function parseToolCalls(message) {
  const actions = [];
  let reply = message?.content || '';

  for (const tc of message?.tool_calls || []) {
    try {
      const args = JSON.parse(tc.function.arguments || '{}');
      if (tc.function.name === 'navigate') actions.push({ type: 'navigate', path: args.path });
      if (tc.function.name === 'open_tender') actions.push({ type: 'open_tender', tenderId: args.tenderId });
      if (tc.function.name === 'send_daily_digest') actions.push({ type: 'send_daily_digest' });
      if (tc.function.name === 'refresh_tenders') actions.push({ type: 'refresh_tenders' });
    } catch {
      /* ignore */
    }
  }

  return { reply: reply.trim(), actions };
}

export async function handleAssistantRequest(body, apiKey, model = 'gpt-4o-mini') {
  const { messages = [], context = {} } = body;
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

  if (!apiKey) {
    return {
      reply: localReply(context, lastUser),
      actions: [],
      mode: 'local',
    };
  }

  const openaiMessages = [
    { role: 'system', content: buildSystemPrompt(context) },
    ...messages.slice(-12).map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: openaiMessages,
      tools: ASSISTANT_TOOLS,
      tool_choice: 'auto',
      temperature: 0.65,
      max_tokens: 1400,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return {
      reply: `KI vorübergehend nicht erreichbar. Lokales Briefing:\n\n${localReply(context, lastUser)}`,
      actions: [],
      mode: 'fallback',
      error: err.slice(0, 200),
    };
  }

  const data = await res.json();
  const choice = data.choices?.[0]?.message;
  const { reply, actions } = parseToolCalls(choice);

  if (!reply && actions.length === 0) {
    return { reply: localReply(context, lastUser), actions: [], mode: 'fallback' };
  }

  return { reply: reply || 'Erledigt.', actions, mode: 'ai' };
}
