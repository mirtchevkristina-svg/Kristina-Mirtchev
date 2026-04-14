import { describe, it, expect } from "vitest";
import {
  ostersonntag,
  feiertageJahr,
  istDiesNon,
  naechsterWerktag,
  liegtInGerichtsferien,
} from "./feiertagsLogik";

describe("ostersonntag", () => {
  it("berechnet Ostersonntag für bekannte Jahre korrekt", () => {
    // Verifizierte Werte (Gregorianischer Kalender)
    expect(ostersonntag(2024).toDateString()).toBe(
      new Date(2024, 2, 31).toDateString(),
    );
    expect(ostersonntag(2025).toDateString()).toBe(
      new Date(2025, 3, 20).toDateString(),
    );
    expect(ostersonntag(2026).toDateString()).toBe(
      new Date(2026, 3, 5).toDateString(),
    );
    expect(ostersonntag(2027).toDateString()).toBe(
      new Date(2027, 2, 28).toDateString(),
    );
  });
});

describe("feiertageJahr", () => {
  it("enthält alle fixen Feiertage für 2026", () => {
    const f = feiertageJahr(2026);
    expect(f.has("2026-01-01")).toBe(true);
    expect(f.has("2026-05-01")).toBe(true);
    expect(f.has("2026-10-26")).toBe(true);
    expect(f.has("2026-12-25")).toBe(true);
    expect(f.has("2026-12-26")).toBe(true);
  });

  it("berechnet bewegliche Feiertage 2026 korrekt", () => {
    const f = feiertageJahr(2026);
    // Ostern 2026: 05.04.
    expect(f.get("2026-04-03")?.name).toBe("Karfreitag");
    expect(f.get("2026-04-06")?.name).toBe("Ostermontag");
    expect(f.get("2026-05-14")?.name).toBe("Christi Himmelfahrt");
    expect(f.get("2026-05-25")?.name).toBe("Pfingstmontag");
    expect(f.get("2026-06-04")?.name).toBe("Fronleichnam");
  });
});

describe("istDiesNon", () => {
  it("erkennt Samstag und Sonntag", () => {
    expect(istDiesNon(new Date(2026, 2, 7))).toBe(true); // Sa
    expect(istDiesNon(new Date(2026, 2, 8))).toBe(true); // So
    expect(istDiesNon(new Date(2026, 2, 9))).toBe(false); // Mo
  });

  it("erkennt Karfreitag (§ 903 ABGB)", () => {
    // Karfreitag 2026: 03.04.
    expect(istDiesNon(new Date(2026, 3, 3))).toBe(true);
  });

  it("erkennt gesetzliche Feiertage", () => {
    expect(istDiesNon(new Date(2026, 9, 26))).toBe(true); // Nationalfeiertag
    expect(istDiesNon(new Date(2026, 0, 6))).toBe(true); // Heilige Drei Könige
  });
});

describe("naechsterWerktag", () => {
  it("gibt Werktag unverändert zurück", () => {
    const mo = new Date(2026, 2, 9); // Mo
    expect(naechsterWerktag(mo).toDateString()).toBe(mo.toDateString());
  });

  it("springt über Wochenende", () => {
    const sa = new Date(2026, 2, 7);
    expect(naechsterWerktag(sa).toDateString()).toBe(
      new Date(2026, 2, 9).toDateString(),
    );
  });

  it("springt über Karfreitag + Osterwochenende", () => {
    // 03.04.2026 (Karfreitag) → 07.04.2026 (Di)
    const kf = new Date(2026, 3, 3);
    expect(naechsterWerktag(kf).toDateString()).toBe(
      new Date(2026, 3, 7).toDateString(),
    );
  });
});

describe("liegtInGerichtsferien", () => {
  it("erkennt Tag in Sommerferien", () => {
    const d = new Date(2026, 6, 20); // 20.07.2026
    const r = liegtInGerichtsferien(d);
    expect(r).not.toBeNull();
    expect(r!.endeKonkret.toDateString()).toBe(
      new Date(2026, 7, 17).toDateString(),
    );
  });

  it("erkennt Tag vor Sommerferien nicht", () => {
    expect(liegtInGerichtsferien(new Date(2026, 6, 14))).toBeNull();
  });

  it("erkennt Weihnachtsferien über Jahreswechsel", () => {
    const silvester = new Date(2026, 11, 31);
    const r = liegtInGerichtsferien(silvester);
    expect(r).not.toBeNull();
    expect(r!.endeKonkret.toDateString()).toBe(
      new Date(2027, 0, 6).toDateString(),
    );

    const neujahr = new Date(2026, 0, 2);
    const r2 = liegtInGerichtsferien(neujahr);
    expect(r2).not.toBeNull();
    expect(r2!.endeKonkret.toDateString()).toBe(
      new Date(2026, 0, 6).toDateString(),
    );
  });
});
