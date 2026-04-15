// Einfacher ICS-Export für Fristtermine inkl. Vorwarnung.

function pad(n) { return String(n).padStart(2, '0') }

function toICSDate(d) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    '00Z'
  )
}

function toICSDateAllDay(d) {
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate())
}

export function buildFristICS({ title, date, description = '', warnDaysBefore = 3 }) {
  const uid = 'alt-' + Math.random().toString(36).slice(2) + '@austrian-legal-tools'
  const dtstamp = toICSDate(new Date())
  const dtstart = toICSDateAllDay(date)
  const dtend = toICSDateAllDay(new Date(date.getTime() + 86400000))

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Austrian Legal Tools//Fristenrechner//DE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    'BEGIN:VALARM',
    `TRIGGER:-P${warnDaysBefore}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(title)} — Frist naht`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ]
  return lines.join('\r\n')
}

function escape(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

export function downloadICS(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
