import { FristenRechner } from "./components/FristenRechner";

export default function App() {
  return (
    <div className="app">
      <h1>AT Legal Tools</h1>
      <p className="subtitle">
        Österreichischer Fristen-, Gebühren- und Zuständigkeitsrechner
        &mdash; Prototyp (Phase 1: Zivilverfahren)
      </p>

      <FristenRechner />

      <div className="disclaimer">
        <strong>Rechtlicher Hinweis:</strong> Dieses Tool stellt keine
        Rechtsberatung dar und ersetzt keine anwaltliche Prüfung. Trotz
        sorgfältiger Umsetzung wird für die Richtigkeit der Berechnungen
        keine Gewähr übernommen. Maßgeblich sind stets die aktuellen
        gesetzlichen Bestimmungen (RIS) und die konkreten Umstände des
        Einzelfalls. Bei fristgebundenen Handlungen wenden Sie sich
        umgehend an eine Rechtsanwältin / einen Rechtsanwalt.
      </div>
    </div>
  );
}
