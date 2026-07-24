import { renderTreasuryTimeline } from '../components/TreasuryTimeline.js'
import { buildEmptyState, parseAmount } from './planFormatters.js'
import { buildPlanContent } from './planMarkupBuilder.js'
import { buildPlanData, readDebts, saveDebts, makeDebtId } from './planDataBuilder.js'

const attachPlanEditors = (root, planData) => {
  root.querySelectorAll('.plan-edit-item[data-goal-id]').forEach((item) => {
    const goalId = item.dataset.goalId
    const readPatch = () => {
      const patch = {}
      item.querySelectorAll('.plan-goal-input').forEach((input) => {
        const field = input.dataset.field
        if (['target', 'current'].includes(field)) {
          const parsed = parseAmount(input.value)
          if (parsed === null) throw new Error('invalid-amount')
          patch[field] = parsed
        } else {
          patch[field] = input.value
        }
      })
      return patch
    }

    item.querySelector('.plan-goal-save')?.addEventListener('click', async () => {
      try {
        await window.GoalsService?.updateGoal?.(goalId, readPatch())
      } catch {
        window.showToast?.('Expression financière invalide')
        return
      }
      window.showToast?.('Objectif mis à jour')
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-primary')?.addEventListener('click', async () => {
      await window.GoalsService?.setPrimaryGoal?.(goalId)
      window.showToast?.('Objectif principal mis à jour')
      if (typeof window.updateDashboardPrimaryGoal === 'function') await window.updateDashboardPrimaryGoal()
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-complete')?.addEventListener('click', async () => {
      const goal = (planData.goals || []).find((entry) => String(entry.id) === String(goalId))
      await window.GoalsService?.updateGoal?.(goalId, { current: Number(goal?.target) || 0 })
      window.showToast?.('Objectif marqué comme atteint')
      await renderPlanHub(root.id)
    })
    item.querySelector('.plan-goal-delete')?.addEventListener('click', async () => {
      await window.GoalsService?.deleteGoal?.(goalId)
      window.showToast?.('Objectif supprimé')
      await renderPlanHub(root.id)
    })
  })

  root.querySelector('#plan-goal-create')?.addEventListener('click', async () => {
    const name = root.querySelector('#plan-new-goal-name')?.value?.trim()
    const target = parseAmount(root.querySelector('#plan-new-goal-target')?.value)
    if (target === null) {
      window.showToast?.('Expression financière invalide')
      return
    }
    if (!name || target <= 0) {
      window.showToast?.('Nom et cible requis')
      return
    }
    await window.GoalsService?.createGoal?.({ name, target, current: 0 })
    window.showToast?.('Objectif créé')
    await renderPlanHub(root.id)
  })

  const saveDebtList = async (debts) => {
    await saveDebts(debts)
    window.showToast?.('Dette mise à jour')
    if (typeof window.updateAll === 'function') window.updateAll()
    await renderPlanHub(root.id)
  }

  root.querySelectorAll('.plan-edit-item[data-debt-index]').forEach((item) => {
    const index = Number(item.dataset.debtIndex)
    const readDebtPatch = () => {
      const patch = {}
      item.querySelectorAll('.plan-debt-input').forEach((input) => {
        const field = input.dataset.field
        patch[field] = ['initial', 'remaining', 'monthly'].includes(field) ? parseAmount(input.value) : input.value
      })
      return patch
    }

    item.querySelector('.plan-debt-save')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts[index] = { ...debts[index], ...readDebtPatch(), id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-pay')?.addEventListener('click', async () => {
      const payment = parseAmount(item.querySelector('.plan-debt-payment')?.value)
      if (payment === null) {
        window.showToast?.('Expression financière invalide')
        return
      }
      if (payment <= 0) {
        window.showToast?.('Montant de paiement requis')
        return
      }
      const debts = await readDebts()
      const debt = debts[index] || {}
      debts[index] = { ...debt, remaining: Math.max(0, (Number(debt.remaining) || 0) - payment), id: debt.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-complete')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts[index] = { ...debts[index], remaining: 0, id: debts[index]?.id || makeDebtId() }
      await saveDebtList(debts)
    })
    item.querySelector('.plan-debt-delete')?.addEventListener('click', async () => {
      const debts = await readDebts()
      debts.splice(index, 1)
      await saveDebts(debts)
      window.showToast?.('Dette supprimée')
      if (typeof window.updateAll === 'function') window.updateAll()
      await renderPlanHub(root.id)
    })
  })

  root.querySelector('#plan-debt-create')?.addEventListener('click', async () => {
    const name = root.querySelector('#plan-new-debt-name')?.value?.trim()
    const remaining = parseAmount(root.querySelector('#plan-new-debt-remaining')?.value)
    const monthly = parseAmount(root.querySelector('#plan-new-debt-monthly')?.value)
    if (remaining === null || monthly === null) {
      window.showToast?.('Expression financière invalide')
      return
    }
    if (!name || remaining <= 0) {
      window.showToast?.('Nom et montant restant requis')
      return
    }
    const debts = await readDebts()
    debts.push({ id: makeDebtId(), name, initial: remaining, remaining, monthly })
    await saveDebtList(debts)
  })
}

export async function renderPlanHub(rootId) {
  const root = document.getElementById(rootId)
  if (!root) return

  root.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text2);">Chargement du plan...</div>'

  try {
    const planData = await buildPlanData()
    root.innerHTML = buildPlanContent(planData)
    if (planData.timeline.length) renderTreasuryTimeline('plan-timeline-root', planData.timeline)
    attachPlanEditors(root, planData)
    window.NexoraMotion?.animateCards?.(root)
    window.NexoraMotion?.animateTimeline?.(root)
    window.NexoraMotion?.animateKpiNumbers?.(root)
  } catch (error) {
    console.warn('[PlanHub] render failed', error)
    root.innerHTML = buildEmptyState()
  }
}

export async function updatePlanHub(rootId = 'plan-root') {
  await renderPlanHub(rootId)
}

export default { renderPlanHub, updatePlanHub }
