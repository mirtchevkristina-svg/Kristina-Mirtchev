import { useMemo, useState } from "react";
import zivilData from "../data/fristen/zivilverfahren.json";
import type { Verfahrensart } from "../types";
import {
  berechneFristende,
  formatDatumAt,
} from "../logic/fristBerechnung";

const VERFAHREN: Verfahrensart[] = zivilData.verfahren as Verfahrensart[];

function fristDauerLabel(v: Verfahrensart): string {
  if (v.fristTage != null) return `${v.fristTage} Tage`;
  if (v.fristWochen != null) return `${v.fristWochen} Wochen`;
  if (v.fristMonate != null) return `${v.fristMonate} Monate`;
  return "–";
}

function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FristenRechner() {
  const [verfahrenId, setVerfahrenId] = useState<string>(VERFAHREN[0].id);
  const [datumIso, setDatumIso] = useState<string>(heuteIso());

  const verfahren = useMemo(
    () => VERFAHREN.find((v) => v.id === verfahrenId)!,
    [verfahrenId],
  );

  const ergebnis = useMemo(() => {
    if (!datumIso) return null;
    const [y, m, d] = datumIso.split("-").map(Number);
    if (!y || !m || !d) return null;
    const ereignis = new Date(y, m - 1, d);
    return berechneFristende(ereignis, verfahren);
  }, [datumIso, verfahren]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Fristenrechner – Zivilverfahren</h2>
      <p style={{ marginTop: 0, color: "#555", fontSize: "0.9rem" }}>
        Berechnet Fristen nach §§ 125, 126, 222 ZPO inkl. Wochenende,
        Feiertagen (§ 903 ABGB) und verhandlungsfreier Zeit.
      </p>

      <div className="form-row">
        <div>
          <label htmlFor="verfahren">Verfahrensart / Rechtsmittel</label>
          <select
            id="verfahren"
            value={verfahrenId}
            onChange={(e) => setVerfahrenId(e.target.value)}
          >
            {VERFAHREN.map((v) => (
              <option key={v.id} value={v.id}>
                {v.bezeichnung} ({fristDauerLabel(v)})
              </option>
            ))}
          </select>
          <div className="legal-source" style={{ marginTop: "0.35rem" }}>
            {verfahren.rechtsgrundlage} · Frist: {fristDauerLabel(verfahren)}
          </div>
        </div>

        <div>
          <label htmlFor="datum">
            {verfahren.fristbeginn === "zustellung"
              ? "Zustelldatum"
              : verfahren.fristbeginn === "verkuendung"
                ? "Verkündungsdatum"
                : "Datum des Ereignisses"}
          </label>
          <input
            id="datum"
            type="date"
            value={datumIso}
            onChange={(e) => setDatumIso(e.target.value)}
          />
        </div>
      </div>

      {verfahren.hinweis && (
        <div className="warning">ℹ {verfahren.hinweis}</div>
      )}

      {ergebnis && (
        <div className="result">
          <div style={{ fontSize: "0.85rem", color: "#345" }}>
            Letzter Tag der Frist
          </div>
          <div className="date">
            {formatDatumAt(ergebnis.tatsaechlichesFristende)}
          </div>
          <dl className="meta">
            <div>
              <dt>Fristbeginn:</dt>
              <dd>{formatDatumAt(ergebnis.fristbeginn)}</dd>
            </div>
            <div>
              <dt>Nominales Fristende:</dt>
              <dd>{formatDatumAt(ergebnis.nominalesFristende)}</dd>
            </div>
            {ergebnis.verlaengerungen.length > 0 && (
              <div>
                <dt>Verlängerungen:</dt>
                <dd>
                  <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                    {ergebnis.verlaengerungen.map((v, i) => (
                      <li key={i}>
                        +{v.tage} {v.tage === 1 ? "Tag" : "Tage"} – {v.detail}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
