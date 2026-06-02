/**
 * Treasury Planner - core logic
 * Produces a timeline of upcoming cash flows and a running projection balance
 */
export const TreasuryService = {
  normalizeDay(day, fallback = 1) {
    const value = Number(day)
    if (!Number.isFinite(value)) return fallback
    return Math.max(1, Math.min(31, Math.trunc(value)))
  },

  makeMonthDate(baseDate, day) {
    const normalizedDay = this.normalizeDay(day, 1)
    const lastDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate()
    return new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(normalizedDay, lastDay))
  },

  /**
   * Normalize an entry to events within the next N days
   * revenue: {amount, frequency, day, startDate}
   * charge: {amount, date, priority}
   */
  generateEvents({ revenues = [], charges = [], fromDate = new Date(), days = 30 }) {
    const events = []
    const end = new Date(fromDate.getTime())
    end.setDate(end.getDate() + days)

    const addEvent = (date, amount, title, meta = {}) => {
      events.push({ date: new Date(date), amount, title, ...meta })
    }

    // Charges: date can be ISO or day-of-month number
    charges.forEach(ch => {
      if (!ch) return
      const amount = Math.abs(Number(ch.amount) || 0)
      if (amount <= 0) return

      if (ch.date instanceof Date) {
        const d = new Date(ch.date)
        if (d >= fromDate && d <= end) addEvent(d, -amount, ch.title || ch.name || 'Charge', { priority: ch.priority, dateEstimated: ch.dateEstimated === true })
      } else if (typeof ch.date === 'number') {
        const candidate = this.makeMonthDate(fromDate, ch.date)
        if (candidate < fromDate) candidate.setMonth(candidate.getMonth() + 1)
        if (candidate >= fromDate && candidate <= end) addEvent(candidate, -amount, ch.title || ch.name || 'Charge', { priority: ch.priority, dateEstimated: ch.dateEstimated === true })
      } else if (typeof ch.date === 'string') {
        const d = new Date(ch.date)
        if (!isNaN(d) && d >= fromDate && d <= end) addEvent(d, -amount, ch.title || ch.name || 'Charge', { priority: ch.priority, dateEstimated: ch.dateEstimated === true })
      }
    })

    // Revenues: frequency support monthly, weekly, biweekly, once
    revenues.forEach(r => {
      if (!r) return
      const amount = Math.abs(Number(r.amount) || 0)
      if (amount <= 0) return
      const freq = (r.frequency || 'monthly')
      if (freq === 'once' && r.date) {
        const d = new Date(r.date)
        if (!isNaN(d) && d >= fromDate && d <= end) addEvent(d, amount, r.title || 'Revenu', { dateEstimated: r.dateEstimated === true })
        return
      }

      if (freq === 'monthly') {
        const day = this.normalizeDay(r.day, 1)
        const candidate = this.makeMonthDate(fromDate, day)
        if (candidate < fromDate) candidate.setMonth(candidate.getMonth() + 1)
        let cur = new Date(candidate)
        while (cur <= end) {
          addEvent(cur, amount, r.title || r.name || 'Revenu', { dateEstimated: r.dateEstimated === true })
          cur = this.makeMonthDate(new Date(cur.getFullYear(), cur.getMonth() + 1, 1), day)
        }
        return
      }

      if (freq === 'weekly') {
        // day = weekday index 0-6 or startDate
        const start = r.startDate ? new Date(r.startDate) : new Date(fromDate)
        let cur = new Date(start)
        while (cur <= end) {
          if (cur >= fromDate) addEvent(cur, amount, r.title || r.name || 'Revenu', { dateEstimated: r.dateEstimated === true })
          cur.setDate(cur.getDate() + 7)
        }
        return
      }

      if (freq === 'biweekly') {
        const start = r.startDate ? new Date(r.startDate) : new Date(fromDate)
        let cur = new Date(start)
        while (cur <= end) {
          if (cur >= fromDate) addEvent(cur, amount, r.title || r.name || 'Revenu', { dateEstimated: r.dateEstimated === true })
          cur.setDate(cur.getDate() + 14)
        }
        return
      }
    })

    // Sort events by date
    events.sort((a, b) => a.date - b.date)
    return events
  },

  /**
   * Build timeline with running balance starting from baseBalance
   */
  buildTimeline({ baseBalance = 0, revenues = [], charges = [], fromDate = new Date(), days = 30 }) {
    const events = this.generateEvents({ revenues, charges, fromDate, days })
    let balance = Number(baseBalance) || 0
    const timeline = events.map(ev => {
      balance += Number(ev.amount)
      return { date: ev.date.toISOString().slice(0,10), amount: ev.amount, title: ev.title, balance, dateEstimated: ev.dateEstimated === true, priority: ev.priority }
    })
    return { timeline, endingBalance: balance }
  },

  /**
   * Suggest pay-now list: charges within next N days that should be paid now based on priority and projected balance
   */
  suggestPayments({ baseBalance = 0, revenues = [], charges = [], fromDate = new Date(), days = 30 }) {
    const { timeline } = this.buildTimeline({ baseBalance, revenues, charges, fromDate, days })
    // find negative dips and high priority charges with dates in next 7 days
    const toPayNow = []
    charges.forEach(ch => {
      const chDate = ch.date instanceof Date ? new Date(ch.date) : (typeof ch.date === 'number' ? this.makeMonthDate(fromDate, ch.date) : new Date(ch.date))
      if (typeof ch.date === 'number' && chDate < fromDate) chDate.setMonth(chDate.getMonth() + 1)
      const daysDiff = Math.ceil((chDate - fromDate) / (1000*60*60*24))
      if (daysDiff >=0 && daysDiff <= 7 && (ch.priority === 'critique' || ch.priority === 'importante')) {
        toPayNow.push({ name: ch.title || ch.name || 'Charge', amount: ch.amount, date: chDate.toISOString().slice(0,10), priority: ch.priority })
      }
    })
    return { toPayNow, timeline }
  }

  ,

  /**
   * Build timeline directly from current month real data (adapter)
   */
  async buildTimelineFromCurrentMonth({ monthKey, fromDate = new Date(), days = 30, baseBalance = 0 } = {}) {
    try {
      const adapter = (await import('./treasuryAdapter.js')).default
      const { revenues, charges } = await adapter.fetchCurrentMonthBudget(monthKey)
      return this.buildTimeline({ baseBalance, revenues, charges, fromDate, days })
    } catch (e) {
      console.warn('[TreasuryService] buildTimelineFromCurrentMonth failed', e)
      return this.buildTimeline({ baseBalance, revenues: [], charges: [], fromDate, days })
    }
  }
}

export default TreasuryService
