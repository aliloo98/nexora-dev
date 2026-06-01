/**
 * Debt Planner
 * Implements avalanche and snowball strategies in a simple simulator
 */
export const DebtPlanner = {
  /**
   * Simulate payments until debts cleared
   * debts: [{id, balance, ratePct, minPayment}]
   * monthlyExtra: additional money to allocate each month
   * method: 'avalanche' | 'snowball'
   * returns summary {months, totalInterest, paidOrder}
   */
  simulate({ debts = [], monthlyExtra = 0, method = 'avalanche', maxMonths = 240 }) {
    // shallow clone
    const ds = debts.map(d => ({ ...d, balance: Number(d.balance) || 0 }))
    let month = 0
    let totalInterest = 0

    const paidOrder = []

    const allZero = () => ds.every(d => d.balance <= 0)

    while (!allZero() && month < maxMonths) {
      month++
      // interest accrues
      ds.forEach(d => {
        if (d.balance <= 0) return
        const monthlyRate = (Number(d.ratePct) || 0) / 100 / 12
        const interest = d.balance * monthlyRate
        d.balance += interest
        totalInterest += interest
      })

      // determine order
      const active = ds.filter(d => d.balance > 0)
      if (active.length === 0) break

      let primary
      if (method === 'avalanche') {
        primary = active.sort((a,b) => (b.ratePct||0) - (a.ratePct||0))[0]
      } else {
        primary = active.sort((a,b) => (a.balance||0) - (b.balance||0))[0]
      }

      // pay minimums
      active.forEach(d => {
        const pay = Math.min(d.balance, d.minPayment || 0)
        d.balance -= pay
      })

      // allocate extra to primary
      let extra = monthlyExtra
      if (extra > 0 && primary) {
        const pay = Math.min(primary.balance, extra)
        primary.balance -= pay
        extra -= pay
        if (primary.balance <= 0) paidOrder.push(primary.id || primary.name || 'debt')
      }

      // small normalization
      ds.forEach(d => { if (Math.abs(d.balance) < 0.01) d.balance = 0 })
    }

    return { months: month, totalInterest: Number(totalInterest.toFixed(2)), paidOrder }
  }
}

export default DebtPlanner
