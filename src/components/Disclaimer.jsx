export default function Disclaimer({ rechtsstand }) {
  return (
    <p className="text-xs text-justiz-500 mt-4">
      Keine Rechtsberatung. Ergebnisse ohne Gewähr.
      {rechtsstand ? ` Rechtsstand / Tarifstand: ${rechtsstand}.` : ''}
      {' '}Bitte im Einzelfall mit Rechtsanwalt:in oder der zuständigen Stelle prüfen.
    </p>
  )
}
