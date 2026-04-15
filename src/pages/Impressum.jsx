export default function Impressum() {
  return (
    <div className="card max-w-3xl">
      <h1>Impressum &amp; Datenschutz</h1>
      <h2>Impressum</h2>
      <p>
        Betreiber: <em>[Name / Firma eintragen]</em><br />
        Anschrift: <em>[Adresse eintragen]</em><br />
        Kontakt: <em>[E-Mail eintragen]</em>
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        Die Inhalte dieser Anwendung dienen ausschließlich der allgemeinen
        rechtlichen Erstorientierung. Sie stellen keine Rechtsberatung dar und
        begründen kein Mandatsverhältnis. Für die Richtigkeit, Vollständigkeit
        und Aktualität der Berechnungen und Informationen wird keine Haftung
        übernommen. Im Zweifel ziehen Sie bitte eine Rechtsanwältin oder einen
        Rechtsanwalt bei.
      </p>

      <h2>Datenschutz</h2>
      <p>
        Die Anwendung speichert Eingaben standardmäßig nur lokal im Browser
        (z.&nbsp;B. für den Modus-Toggle). Dokumente, die Sie im
        Dokument-Scanner hochladen, werden ausschließlich zur Analyse an die
        Claude-API übermittelt und nicht dauerhaft gespeichert, sofern Sie die
        Speicherung nicht ausdrücklich aktivieren. Für die Übermittlung an die
        Claude-API gelten die Datenschutzbestimmungen von Anthropic.
      </p>

      <h2>Externe Links</h2>
      <p>
        Für Inhalte verlinkter externer Seiten wird keine Haftung übernommen.
        Maßgeblich sind die amtlichen Quellen, insbesondere{' '}
        <a className="underline" href="https://justiz.gv.at" target="_blank" rel="noreferrer">justiz.gv.at</a>,{' '}
        <a className="underline" href="https://www.ris.bka.gv.at" target="_blank" rel="noreferrer">ris.bka.gv.at</a>{' '}
        und <a className="underline" href="https://www.oerak.at" target="_blank" rel="noreferrer">oerak.at</a>.
      </p>
    </div>
  )
}
