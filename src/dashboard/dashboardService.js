import TreasuryService from '../treasury/treasuryService.js'

const DashboardService = {
  get7DayPlan: ({ fromDate = new Date(), baseBalance = 0, revenues = [], charges = [] } = {}) => {
    const days = 7
    const { timeline } = TreasuryService.buildTimeline({ baseBalance, revenues, charges, fromDate: new Date(fromDate), days })
    // return simplified plan: date, balance, events
    return timeline.map(e => ({ date: e.date, balance: e.balance, events: e.events || [] }))
  },

  getActionOfDay: (timeline) => {
    if (!Array.isArray(timeline) || timeline.length === 0) return { title: 'Aucune action', detail: 'Rien d’urgent' }
    // Find next negative event with highest amount
    const upcoming = timeline.flatMap(t => t.events?.map(ev => ({ date: t.date, ev })) || [])
      .filter(x => x.ev && typeof x.ev.amount === 'number')
      .sort((a,b) => b.ev.amount - a.ev.amount)
    if (upcoming.length === 0) return { title: 'Aucune action', detail: 'Rien d’urgent' }
    const top = upcoming[0]
    return { title: `Préparer: ${top.ev.title || 'Paiement'}`, detail: `Montant: ${top.ev.amount} — prévu ${new Date(top.date).toLocaleDateString()}` }
  }
}

export default DashboardService
