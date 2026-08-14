function createJarvisConversationState(initial = {}) {
  return {
    lastIntent: initial.lastIntent || null,
    lastEntity: initial.lastEntity || null,
    lastAmount: typeof initial.lastAmount === 'number' ? initial.lastAmount : null,
    lastResponseId: initial.lastResponseId || null,
    lastScenarioType: initial.lastScenarioType || null
  }
}

function updateJarvisConversationState(previousState = {}, response = {}, parsedIntent = {}) {
  return createJarvisConversationState({
    lastIntent: response.intent || parsedIntent.intent || previousState.lastIntent || null,
    lastEntity: response.entity || parsedIntent.entity || previousState.lastEntity || null,
    lastAmount: typeof parsedIntent.amount === 'number'
      ? parsedIntent.amount
      : (typeof response.amount === 'number' ? response.amount : previousState.lastAmount || null),
    lastResponseId: response.id || previousState.lastResponseId || null,
    lastScenarioType: parsedIntent.scenarioType || response.scenario?.type || previousState.lastScenarioType || null
  })
}

export {
  createJarvisConversationState,
  updateJarvisConversationState
}
