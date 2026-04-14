import { describe, it, expect } from "vitest";
import { berechneFristende } from "./fristBerechnung";
import type { Verfahrensart } from "../types";

const berufung: Verfahrensart = {
  id: "zivil.berufung",
  rechtsgebiet: "zivil",
  bezeichnung: "Berufung",
  rechtsmittel: "Berufung",
  fristWochen: 4,
  fristbeginn: "zustellung",
  gerichtsferienRelevant: true,
  rechtsgrundlage: "§ 464 Abs 1 ZPO",
  stand: "2026-01-01",
};

const rekurs: Verfahrensart = {
  id: "zivil.rekurs",
  rechtsgebiet: "zivil",
  bezeichnung: "Rekurs",
  rechtsmittel: "Rekurs",
  fristTage: 14,
  fristbeginn: "zustellung",
  gerichtsferienRelevant: true,
  rechtsgrundlage: "§ 521 Abs 1 ZPO",
  stand: "2026-01-01",
};

const evRekurs: Verfahrensart = {
  id: "zivil.ev-rekurs",
  rechtsgebiet: "zivil",
  bezeichnung: "Rekurs gg einstweilige Verfügung",
  rechtsmittel: "Rekurs",
  fristTage: 14,
  fristbeginn: "zustellung",
  gerichtsferienRelevant: false,
  rechtsgrundlage: "§ 402 EO",
  stand: "2026-01-01",
};

describe("berechneFristende – Grundregel (§ 125 ZPO)", () => {
  it("Wochenfrist endet am selben Wochentag X Wochen später", () => {
    // Zustellung Mo 02.03.2026, Berufung 4 Wochen → Mo 30.03.2026
    // Nominal: 02.03 + 28 Tage = 30.03.2026 (Mo) – Werktag.
    const r = berechneFristende(new Date(2026, 2, 2), berufung);
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 2, 30).toDateString(),
    );
    expect(r.verlaengerungen).toHaveLength(0);
  });

  it("Tagesfrist: Tag 1 ist der Tag nach Zustellung", () => {
    // Zustellung Mo 02.03.2026, Rekurs 14 Tage.
    // Fristbeginn Di 03.03, Ende = 03.03 + 13 = 16.03.2026 (Mo)
    const r = berechneFristende(new Date(2026, 2, 2), rekurs);
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 2, 16).toDateString(),
    );
  });
});

describe("berechneFristende – § 126 ZPO / § 903 ABGB", () => {
  it("verschiebt Fristende vom Sonntag auf Montag", () => {
    // Zustellung So 01.03.2026. 4 Wochen → So 29.03.2026 → Mo 30.03.2026.
    const r = berechneFristende(new Date(2026, 2, 1), berufung);
    expect(r.nominalesFristende.toDateString()).toBe(
      new Date(2026, 2, 29).toDateString(),
    );
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 2, 30).toDateString(),
    );
    expect(r.verlaengerungen[0].grund).toBe("wochenende");
  });

  it("verschiebt Fristende vom Karfreitag über Osterwochenende auf Dienstag", () => {
    // Karfreitag 2026 = 03.04. Ostermontag = 06.04.
    // 4 Wochen vor 03.04.2026 = 06.03.2026 (Fr).
    // Zustellung Fr 06.03.2026 → nominal Fr 03.04.2026 (Karfreitag)
    // → 07.04.2026 (Di).
    const r = berechneFristende(new Date(2026, 2, 6), berufung);
    expect(r.nominalesFristende.toDateString()).toBe(
      new Date(2026, 3, 3).toDateString(),
    );
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 3, 7).toDateString(),
    );
  });
});

describe("berechneFristende – § 222 ZPO verhandlungsfreie Zeit", () => {
  it("verschiebt Fristende aus Sommerferien auf ersten Werktag danach", () => {
    // Zustellung Mo 20.07.2026. 4 Wochen → Mo 17.08.2026 (letzter Tag GF).
    // → 18.08.2026 (Di).
    const r = berechneFristende(new Date(2026, 6, 20), berufung);
    expect(r.nominalesFristende.toDateString()).toBe(
      new Date(2026, 7, 17).toDateString(),
    );
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 7, 18).toDateString(),
    );
    expect(r.verlaengerungen.some((v) => v.grund === "gerichtsferien")).toBe(
      true,
    );
  });

  it("greift NICHT, wenn gerichtsferienRelevant=false (EV-Rekurs)", () => {
    // 14 Tage nach Zustellung 20.07.2026 → 03.08.2026 (Mo, in Sommerferien).
    // EV-Rekurs ist ferienfrei → Ergebnis bleibt 03.08.2026.
    const r = berechneFristende(new Date(2026, 6, 20), evRekurs);
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2026, 7, 3).toDateString(),
    );
    expect(
      r.verlaengerungen.some((v) => v.grund === "gerichtsferien"),
    ).toBe(false);
  });

  it("verschiebt Fristende aus Weihnachtsferien über Jahreswechsel", () => {
    // Zustellung Mo 07.12.2026. 4 Wochen → Mo 04.01.2027 (in Weih.-Ferien
    // 24.12.2026–06.01.2027) → 07.01.2027 (Do).
    const r = berechneFristende(new Date(2026, 11, 7), berufung);
    expect(r.nominalesFristende.toDateString()).toBe(
      new Date(2027, 0, 4).toDateString(),
    );
    expect(r.tatsaechlichesFristende.toDateString()).toBe(
      new Date(2027, 0, 7).toDateString(),
    );
  });
});
