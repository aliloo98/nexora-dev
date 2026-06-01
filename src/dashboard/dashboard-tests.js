import assert from 'assert'
import DashboardService from './dashboardService.js'
import TreasuryService from '../treasury/treasuryService.js'

const plan = DashboardService.get7DayPlan({ fromDate: new Date(), baseBalance: 1000, revenues: [], charges: [{ amount:200, date: new Date() }] })
assert(Array.isArray(plan), 'Plan should be an array')
const action = DashboardService.getActionOfDay(plan)
assert(action && action.title, 'Action should have a title')

console.log('dashboard-tests: OK')
