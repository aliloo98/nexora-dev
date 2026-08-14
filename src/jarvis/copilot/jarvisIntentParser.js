const INTENTS = Object.freeze({
  GLOBAL_STATUS: 'GLOBAL_STATUS',
  WHY_STATUS: 'WHY_STATUS',
  TOP_RISK: 'TOP_RISK',
  PRIORITY: 'PRIORITY',
  AFFORDABILITY: 'AFFORDABILITY',
  REMAINING_SPEND: 'REMAINING_SPEND',
  SAVINGS: 'SAVINGS',
  EXPENSE_ANALYSIS: 'EXPENSE_ANALYSIS',
  HISTORY_COMPARE: 'HISTORY_COMPARE',
  GOAL: 'GOAL',
  DEBT: 'DEBT',
  FORECAST: 'FORECAST',
  WHAT_IF: 'WHAT_IF',
  EXPLAIN_RECOMMENDATION: 'EXPLAIN_RECOMMENDATION',
  UNSUPPORTED: 'UNSUPPORTED'
})

const SCENARIO_TYPES = Object.freeze({
  ADD_EXPENSE: 'ADD_EXPENSE',
  REDUCE_EXPENSE: 'REDUCE_EXPENSE',
  ADD_SAVINGS: 'ADD_SAVINGS',
  DEBT_EXTRA_PAYMENT: 'DEBT_EXTRA_PAYMENT'
})

const QUICK_PROMPT_INTENTS = new Set(Object.values(INTENTS))

function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[?!.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAmount(text = '') {
  const normalized = String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const match = normalized.match(/(?:^|\s)(\d{1,7}(?:[.,]\d{1,2})?)\s*(?:€|eur|euro|euros)?(?:\s|$)/)
  if (!match) return null

  const amount = Number(String(match[1]).replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100) / 100
}

function isAmountOnlyFollowUp(text) {
  const normalized = normalizeText(text)
  return /^(?:et\s*)?\d{1,7}(?:[.,]\d{1,2})?\s*(?:€|eur|euro|euros)?$/.test(normalized)
}

function hasAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text))
}

function resolveScenarioType(normalized) {
  if (hasAny(normalized, [/rembours/, /dette/])) return SCENARIO_TYPES.DEBT_EXTRA_PAYMENT
  if (hasAny(normalized, [/reduis/, /reduit/, /reduction/, /baisse/, /moins/, /coupe/, /diminue/])) {
    return SCENARIO_TYPES.REDUCE_EXPENSE
  }
  if (hasAny(normalized, [/epargn/, /mettre de cote/, /mets de cote/])) return SCENARIO_TYPES.ADD_SAVINGS
  return SCENARIO_TYPES.ADD_EXPENSE
}

function fromStructuredPrompt(prompt) {
  if (!prompt || typeof prompt !== 'object') return null
  if (!QUICK_PROMPT_INTENTS.has(prompt.intent)) return null
  return {
    intent: prompt.intent,
    amount: typeof prompt.amount === 'number' ? prompt.amount : null,
    scenarioType: prompt.scenarioType || null,
    source: 'quick-prompt',
    confidence: 1
  }
}

function parseJarvisIntent(input = '', context = {}) {
  const structured = fromStructuredPrompt(input)
  if (structured) return structured

  const raw = String(input || '')
  const normalized = normalizeText(raw)
  const amount = parseAmount(raw)

  if (!normalized) {
    return { intent: INTENTS.UNSUPPORTED, amount: null, scenarioType: null, source: 'empty', confidence: 0 }
  }

  if (amount && isAmountOnlyFollowUp(raw) && context?.lastScenarioType) {
    return {
      intent: context.lastIntent === INTENTS.WHAT_IF ? INTENTS.WHAT_IF : INTENTS.AFFORDABILITY,
      amount,
      scenarioType: context.lastScenarioType,
      source: 'follow-up',
      confidence: 0.95
    }
  }

  if (hasAny(normalized, [/^pourquoi$/, /^explique$/, /sur quoi.*base/, /pourquoi.*conseille/, /pourquoi.*priorite/])) {
    return {
      intent: context?.lastIntent ? INTENTS.EXPLAIN_RECOMMENDATION : INTENTS.WHY_STATUS,
      amount,
      scenarioType: context?.lastScenarioType || null,
      source: 'follow-up',
      confidence: 0.9
    }
  }

  if (amount && hasAny(normalized, [/et si/, /que se passe/, /si je/, /scenario/, /simulation/, /de plus/])) {
    return {
      intent: INTENTS.WHAT_IF,
      amount,
      scenarioType: resolveScenarioType(normalized),
      source: 'parser',
      confidence: 0.9
    }
  }

  if (amount && hasAny(normalized, [/je peux/, /puis je/, /possible/, /acheter/, /depenser/, /sortir/, /week end/, /weekend/])) {
    return {
      intent: INTENTS.AFFORDABILITY,
      amount,
      scenarioType: SCENARIO_TYPES.ADD_EXPENSE,
      source: 'parser',
      confidence: 0.9
    }
  }

  if (hasAny(normalized, [/pourquoi/, /pose probleme/, /score.*baisse/, /se degrade/, /moyenne/])) {
    return { intent: INTENTS.WHY_STATUS, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/fin.*mois/, /prevision/, /projection/, /finir.*mois/, /sera.*combien/])) {
    return { intent: INTENTS.FORECAST, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/comment va/, /ca va/, /fais moi le point/, /^resume$/, /ou j en suis/, /point budget/, /situation/])) {
    return { intent: INTENTS.GLOBAL_STATUS, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/risque/, /surveiller/, /dangereux/, /dans le rouge/, /decouvert/])) {
    return { intent: INTENTS.TOP_RISK, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/priorite/, /je fais quoi/, /faire en premier/, /action/, /conseilles tu/, /recommande/])) {
    return { intent: INTENTS.PRIORITY, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/combien.*depenser/, /marge.*reste/, /budget libre/, /reste.*depenser/, /encore depenser/])) {
    return { intent: INTENTS.REMAINING_SPEND, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/epargn/, /mettre.*cote/, /mets.*cote/])) {
    return { intent: INTENTS.SAVINGS, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/ou part/, /cout.*plus/, /depenses.*elevees/, /poste.*reduire/, /depenses.*trop/])) {
    return { intent: INTENTS.EXPENSE_ANALYSIS, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/mois dernier/, /avant/, /compare/, /change/, /augmente/, /diminue/])) {
    return { intent: INTENTS.HISTORY_COMPARE, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/objectif/, /dans les temps/, /atteindrai/, /accelerer/])) {
    return { intent: INTENTS.GOAL, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  if (hasAny(normalized, [/dette/, /rembours/])) {
    return { intent: INTENTS.DEBT, amount, scenarioType: null, source: 'parser', confidence: 0.85 }
  }

  return { intent: INTENTS.UNSUPPORTED, amount, scenarioType: null, source: 'parser', confidence: 0.2 }
}

export {
  INTENTS,
  SCENARIO_TYPES,
  normalizeText,
  parseAmount,
  parseJarvisIntent
}
