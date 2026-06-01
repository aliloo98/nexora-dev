/**
 * Treasury Planner - core logic
 * Produces a timeline of upcoming cash flows and a running projection balance
 */
export const TreasuryService = {
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
      if (ch.date instanceof Date) {
        const d = new Date(ch.date)
        if (d >= fromDate && d <= end) addEvent(d, -Math.abs(ch.amount), ch.title || ch.name || 'Charge', { priority: ch.priority })
      } else if (typeof ch.date === 'number') {
        // day of month
        const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), ch.date)
        if (candidate < fromDate) candidate.setMonth(candidate.getMonth() + 1)
        if (candidate >= fromDate && candidate <= end) addEvent(candidate, -Math.abs(ch.amount), ch.title || ch.name || 'Charge', { priority: ch.priority })
      } else if (typeof ch.date === 'string') {
        const d = new Date(ch.date)
        if (!isNaN(d) && d >= fromDate && d <= end) addEvent(d, -Math.abs(ch.amount), ch.title || ch.name || 'Charge', { priority: ch.priority })
      }
    })

    // Revenues: frequency support monthly, weekly, biweekly, once
    revenues.forEach(r => {
      if (!r) return
      const freq = (r.frequency || 'monthly')
      if (freq === 'once' && r.date) {
        const d = new Date(r.date)
        if (!isNaN(d) && d >= fromDate && d <= end) addEvent(d, Math.abs(r.amount), r.title || 'Revenu')
        return
      }

      if (freq === 'monthly') {
        // day can be number
        const day = typeof r.day === 'number' ? r.day : (new Date().getDate())
        const candidate = new Date(fromDate.getFullYear(), fromDate.getMonth(), day)
        if (candidate < fromDate) candidate.setMonth(candidate.getMonth() + 1)
        // add occurrences while <= end
        let cur = new Date(candidate)
        while (cur <= end) {
          addEvent(cur, Math.abs(r.amount), r.title || r.name || 'Revenu')
          cur = new Date(cur.getFullYear(), cur.getMonth() + 1, day)
        }
        return
      }

      if (freq === 'weekly') {
        // day = weekday index 0-6 or startDate
        const start = r.startDate ? new Date(r.startDate) : new Date(fromDate)
        let cur = new Date(start)
        while (cur <= end) {
          if (cur >= fromDate) addEvent(cur, Math.abs(r.amount), r.title || r.name || 'Revenu')
          cur.setDate(cur.getDate() + 7)
        }
        return
      }

      if (freq === 'biweekly') {
        const start = r.startDate ? new Date(r.startDate) : new Date(fromDate)
        let cur = new Date(start)
        while (cur <= end) {
          if (cur >= fromDate) addEvent(cur, Math.abs(r.amount), r.title || r.name || 'Revenu')
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
      return { date: ev.date.toISOString().slice(0,10), amount: ev.amount, title: ev.title, balance }
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
    const nowISO = fromDate.toISOString().slice(0,10)
    charges.forEach(ch => {
      const chDate = ch.date instanceof Date ? ch.date : (typeof ch.date === 'number' ? new Date(fromDate.getFullYear(), fromDate.getMonth(), ch.date) : new Date(ch.date))
      const daysDiff = Math.ceil((chDate - fromDate) / (1000*60*60*24))
      if (daysDiff >=0 && daysDiff <= 7 && (ch.priority === 'critique' || ch.priority === 'importante')) {
        toPayNow.push({ name: ch.title || ch.name || 'Charge', amount: ch.amount, date: chDate.toISOString().slice(0,10), priority: ch.priority })
      }
    })
    return { toPayNow, timeline }
  }
}

export default TreasuryService
