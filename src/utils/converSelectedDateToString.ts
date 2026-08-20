import { DateRage } from '@/type'
import { formatDateWith } from '@/lib/format'

const converSelectedDateToString = ([startDate, endDate]: DateRage) => {
  const dateString =
    formatDateWith(startDate, { month: 'short', day: '2-digit', fallback: '' }) +
    (endDate ? ' - ' + formatDateWith(endDate, { month: 'short', day: '2-digit', fallback: '' }) : '')
  return dateString
}

export default converSelectedDateToString
