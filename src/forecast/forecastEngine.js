/**
 * Forecast Engine - Moteur de Prévision de Trésorerie
 * Simule la trajectoire jour par jour, identifie le point bas, le risque de découvert
 * et le jour de retour à l'équilibre.
 */

export function calculateForecast(metrics = {}, options = {}) {
  const revReel = Number(metrics.revReel || 0)
  const fixReel = Number(metrics.fixReel || 0)
  const varReel = Number(metrics.varReel || 0)
  const billSchedules = options.billSchedules || metrics.billSchedules || []

  const now = options.referenceDate ? new Date(options.referenceDate) : new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dailyTrajectory = []
  let currentBalance = revReel
  let lowestBalance = revReel
  let lowestBalanceDay = 1
  let positiveReturnDay = null
  let wasOverdrawn = false

  const dailyBills = new Array(daysInMonth + 1).fill(0)
  if (Array.isArray(billSchedules) && billSchedules.length > 0) {
    billSchedules.forEach(bill => {
      const day = Math.min(daysInMonth, Math.max(1, Number(bill.day || bill.date) || 1))
      dailyBills[day] += Number(bill.amount || 0)
    })
  } else {
    dailyBills[1] = fixReel * 0.7
    dailyBills[15] = fixReel * 0.3
  }

  const dailyVarRate = daysInMonth > 0 ? varReel / daysInMonth : 0

  for (let day = 1; day <= daysInMonth; day++) {
    const billToday = dailyBills[day] || 0
    currentBalance -= (billToday + dailyVarRate)

    if (currentBalance < lowestBalance) {
      lowestBalance = currentBalance
      lowestBalanceDay = day
    }

    if (currentBalance < 0) {
      wasOverdrawn = true
    } else if (wasOverdrawn && positiveReturnDay === null && currentBalance >= 0) {
      positiveReturnDay = day
    }

    dailyTrajectory.push({
      day,
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      balance: Math.round(currentBalance)
    })
  }

  let overdraftRisk = 'NONE'
  if (lowestBalance < -200) {
    overdraftRisk = 'HIGH'
  } else if (lowestBalance < 0) {
    overdraftRisk = 'MODERATE'
  }

  return {
    lowestBalance: Math.round(lowestBalance),
    lowestBalanceDay,
    positiveReturnDay,
    overdraftRisk,
    dailyTrajectory,
    finalBalance: Math.round(currentBalance)
  }
}
