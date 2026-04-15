// Fristenberechnung nach österreichischem Verfahrensrecht
// Vereinfachte Modellierung der §§ 125 ff ZPO, § 32 AVG analog, § 108 BAO sinngemäß.
// Samstag/Sonntag/Feiertag-Regel: fällt Ende auf solchen Tag -> nächster Werktag.
// Karfreitag ist kein gesetzlicher Feiertag in AT (seit 2019), daher nicht enthalten.

// Fixe gesetzliche Feiertage (Tag/Monat)
const FIXED_HOLIDAYS = [
  [1, 1],   // Neujahr
  [6, 1],   // Heilige Drei Könige
  [1, 5],   // Staatsfeiertag
  [15, 8],  // Mariä Himmelfahrt
  [26, 10], // Nationalfeiertag
  [1, 11],  // Allerheiligen
  [8, 12],  // Mariä Empfängnis
  [25, 12], // Weihnachten
  [26, 12]  // Stefanitag
]

function easterSunday(year) {
  // Gauß'sche Osterformel
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDaysUTC(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function getHolidaysAT(year) {
  const easter = easterSunday(year)
  const variable = [
    addDaysUTC(easter, 1),   // Ostermontag
    addDaysUTC(easter, 39),  // Christi Himmelfahrt
    addDaysUTC(easter, 50),  // Pfingstmontag
    addDaysUTC(easter, 60)   // Fronleichnam
  ]
  const fixed = FIXED_HOLIDAYS.map(([d, m]) => new Date(year, m - 1, d))
  return [...fixed, ...variable]
}

export function isHoliday(date) {
  const y = date.getFullYear()
  return getHolidaysAT(y).some(
    h => h.getDate() === date.getDate() && h.getMonth() === date.getMonth()
  )
}

export function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function isWorkday(date) {
  return !isWeekend(date) && !isHoliday(date)
}

export function nextWorkday(date) {
  let d = new Date(date)
  while (!isWorkday(d)) d = addDaysUTC(d, 1)
  return d
}

// Gerichtsferien (Zivilverfahren): 15.7.–17.8. und 24.12.–6.1.
// § 222 Abs 2 ZPO – Hemmung bestimmter Rechtsmittelfristen.
// Stark vereinfachte Modellierung.
export function isInGerichtsferien(date) {
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (m === 7 && d >= 15) return true
  if (m === 8 && d <= 17) return true
  if (m === 12 && d >= 24) return true
  if (m === 1 && d <= 6) return true
  return false
}

/**
 * Berechnet das Fristende.
 * @param {Date} start - Zustell- oder Auslösedatum
 * @param {Object} opts
 * @param {'days'|'weeks'|'months'|'years'} opts.unit
 * @param {number} opts.amount - z.B. 14, 4, 1
 * @param {boolean} [opts.shiftOnWeekendHoliday=true] - § 126 ZPO analog
 * @param {boolean} [opts.ferienHemmung=false] - § 222 ZPO
 * @param {boolean} [opts.startFollowingDay=true] - Fristbeginn ab Folgetag
 * @param {Date} [opts.hinterlegungAbholfrist] - Bei Hinterlegung: Beginn der Abholfrist
 */
export function calculateDeadline(start, opts) {
  if (!start || isNaN(start.getTime())) return null
  const {
    unit,
    amount,
    shiftOnWeekendHoliday = true,
    ferienHemmung = false,
    startFollowingDay = true,
    hinterlegungAbholfrist
  } = opts

  // Beginn der Frist
  let fristStart = hinterlegungAbholfrist
    ? new Date(hinterlegungAbholfrist)
    : new Date(start)
  if (startFollowingDay) fristStart = addDaysUTC(fristStart, 1)

  let end
  if (unit === 'days') {
    // Tage werden kalendermäßig gezählt
    end = addDaysUTC(fristStart, amount - 1)
  } else if (unit === 'weeks') {
    end = addDaysUTC(fristStart, amount * 7 - 1)
  } else if (unit === 'months' || unit === 'years') {
    // § 902 ABGB / § 125 ZPO: gleichnamiger Tag
    const e = new Date(fristStart)
    if (unit === 'months') e.setMonth(e.getMonth() + amount)
    else e.setFullYear(e.getFullYear() + amount)
    // -1 Tag, weil Ende ist der Tag, der dem Beginn im Datum entspricht
    // § 902 Abs 2 ABGB: Monatsfrist endet am gleichen Kalendertag.
    // Wir setzen Ende = fristStart + X Monate, Tag -1
    e.setDate(e.getDate() - 1)
    // Wenn Start z.B. 31.1. und +1 Monat = 28./29.2. (-1 = 27./28.2.): Korrektur
    if (e.getDate() === 0) {
      e.setDate(0)
    }
    end = e
  } else {
    return null
  }

  // Gerichtsferien-Hemmung: extrem vereinfachte Behandlung —
  // wenn Fristende in Gerichtsferien fällt ODER der Fristlauf sie durchquert,
  // wird das Ende auf den ersten Tag nach Ferienende verschoben.
  let ferienHinweis = null
  if (ferienHemmung) {
    // prüfe ob ein Tag zwischen Start und Ende in Ferien liegt
    let tmp = new Date(fristStart)
    while (tmp <= end) {
      if (isInGerichtsferien(tmp)) {
        ferienHinweis = 'Fristlauf wurde durch die Gerichtsferien (§ 222 ZPO) gehemmt.'
        // Anzahl der Feriertage im Fristraum grob addieren
        let extra = 0
        let s = new Date(fristStart)
        while (s <= end) {
          if (isInGerichtsferien(s)) extra++
          s = addDaysUTC(s, 1)
        }
        end = addDaysUTC(end, extra)
        break
      }
      tmp = addDaysUTC(tmp, 1)
    }
    // Ende noch in Ferien? -> schiebe bis außerhalb
    while (isInGerichtsferien(end)) end = addDaysUTC(end, 1)
  }

  if (shiftOnWeekendHoliday) {
    end = nextWorkday(end)
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const endMid = new Date(end); endMid.setHours(0, 0, 0, 0)
  const daysLeft = Math.round((endMid - today) / 86400000)

  return { end, daysLeft, ferienHinweis }
}

export function formatDateAT(date) {
  if (!date) return '—'
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][date.getDay()]
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = date.getFullYear()
  return `${wd}, ${d}.${m}.${y}`
}
