import { INTENTS, parseJarvisIntent } from './jarvisIntentParser.js'
import { createJarvisConversationState, updateJarvisConversationState } from './jarvisConversationState.js'
import { composeJarvisResponse } from './jarvisResponseComposer.js'

function createJarvisCopilotEngine(options = {}) {
  let state = createJarvisConversationState(options.initialState)

  return {
    ask(snapshot, input) {
      const parsedIntent = parseJarvisIntent(input, state)
      const response = composeJarvisResponse(snapshot, parsedIntent, state)
      state = updateJarvisConversationState(state, response, parsedIntent)
      return { parsedIntent, response, state }
    },
    getState() {
      return createJarvisConversationState(state)
    },
    reset(nextState = {}) {
      state = createJarvisConversationState(nextState)
    }
  }
}

function createQuickPrompt(label, intent, extra = {}) {
  return {
    label,
    prompt: extra.prompt || label,
    intent,
    scenarioType: extra.scenarioType || null
  }
}

function getJarvisQuickPrompts(snapshot = {}) {
  const prompts = []
  const risks = Array.isArray(snapshot.risks) ? snapshot.risks : []
  const hasGoal = Boolean(snapshot.goal)
  const hasDebt = Boolean(snapshot.debt)
  const margin = Number(snapshot?.cashflow?.projected || 0)

  if (risks.length > 0) {
    prompts.push(createQuickPrompt('Quel est mon risque principal ?', INTENTS.TOP_RISK))
  }

  if (hasGoal) {
    prompts.push(createQuickPrompt('Suis-je dans les temps ?', INTENTS.GOAL))
  }

  if (hasDebt) {
    prompts.push(createQuickPrompt('Quelle dette prioriser ?', INTENTS.DEBT))
  }

  if (margin > 0) {
    prompts.push(createQuickPrompt('Combien puis-je encore dépenser ?', INTENTS.REMAINING_SPEND))
  }

  prompts.push(createQuickPrompt('Que dois-je faire en priorité ?', INTENTS.PRIORITY))
  prompts.push(createQuickPrompt('Comment va finir le mois ?', INTENTS.FORECAST))

  const unique = []
  const seen = new Set()
  for (const prompt of prompts) {
    if (seen.has(prompt.intent)) continue
    seen.add(prompt.intent)
    unique.push(prompt)
  }
  return unique.slice(0, 4)
}

export {
  createJarvisCopilotEngine,
  getJarvisQuickPrompts
}
