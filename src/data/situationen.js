// "Was tun wenn ..." — Katalog häufiger Alltagssituationen.

export const SITUATIONEN = [
  {
    id: 'zahlungsbefehl',
    title: 'Ich habe einen Zahlungsbefehl bekommen',
    passiert:
      'Ein Gericht hat Ihnen einen Zahlungsbefehl zugestellt. Das ist ein Titel, der in 4 Wochen vollstreckbar wird, wenn Sie nichts tun.',
    sofort: [
      'Prüfen Sie Zustelldatum und Frist (i.d.R. 4 Wochen für den Einspruch).',
      'Prüfen Sie, ob die Forderung berechtigt ist.',
      'Legen Sie rechtzeitig Einspruch ein (Formular des Gerichts verwenden).'
    ],
    nicht: [
      'Nicht einfach ignorieren — sonst wird er vollstreckbar.',
      'Nicht ohne Prüfung zahlen, wenn Sie Zweifel haben.'
    ],
    anwalt: 'Empfehlenswert bei Streitwert über € 5.000 oder komplexer Sachlage; ab € 5.000 besteht im Prozess ohnehin Anwaltspflicht.',
    frist: { label: 'Einspruch gegen Zahlungsbefehl', fristId: 'zpo-einspruch-zb' },
    module: ['/fristen', '/gebuehren', '/verfahrenshilfe']
  },
  {
    id: 'klage',
    title: 'Ich habe eine Klage erhalten',
    passiert:
      'Eine Partei hat Sie bei Gericht geklagt. Sie müssen binnen bestimmter Frist eine Klagebeantwortung einbringen.',
    sofort: [
      'Zustelldatum prüfen.',
      'Frist zur Klagebeantwortung notieren (i.d.R. 4 Wochen).',
      'Prozessakt aufmerksam lesen.',
      'Beweise sammeln (Verträge, Nachrichten, Zahlungsbelege).'
    ],
    nicht: [
      'Frist nicht versäumen — sonst droht Versäumungsurteil.',
      'Keine voreiligen Eingaben ohne rechtliche Prüfung.'
    ],
    anwalt: 'Ab € 5.000 Streitwert anwaltliche Vertretung verpflichtend.',
    frist: { label: 'Klagebeantwortung', fristId: 'zpo-klagebeantwortung' },
    module: ['/fristen', '/prozesskosten', '/verfahrenshilfe']
  },
  {
    id: 'raeumungsklage',
    title: 'Ich habe eine Räumungsklage bekommen',
    passiert:
      'Der Vermieter oder eine andere Partei verlangt die Räumung der Wohnung/Liegenschaft.',
    sofort: [
      'Zustelldatum und Frist prüfen.',
      'Mietvertrag, Zahlungsbelege, Mahnungen bereithalten.',
      'Prüfen, ob Räumungsgrund besteht (qualifizierter Mietzinsrückstand etc.).',
      'Allenfalls offene Rückstände dringend klären.'
    ],
    nicht: ['Nicht tatenlos abwarten — Räumungsurteil droht.'],
    anwalt: 'Empfohlen. Bei Wohnungsmietsachen oft auch Mieterschutzorganisationen hilfreich.',
    frist: { label: 'Klagebeantwortung', fristId: 'zpo-klagebeantwortung' },
    module: ['/fristen', '/verfahrenshilfe', '/situationen']
  },
  {
    id: 'versaeumungsurteil',
    title: 'Ein Versäumungsurteil wurde gegen mich gefällt',
    passiert:
      'Weil keine (rechtzeitige) Äußerung eingebracht wurde, hat das Gericht nach Antrag der Gegenseite entschieden.',
    sofort: [
      'Sofort prüfen: Widerspruch / Berufung wegen Nichtigkeit?',
      'Wenn Frist unverschuldet versäumt: Antrag auf Wiedereinsetzung binnen 14 Tagen.',
      'Eingangsdatum des Urteils dokumentieren.'
    ],
    nicht: ['Nicht passiv bleiben — Urteil wird sonst rasch vollstreckbar.'],
    anwalt: 'Dringend empfohlen.',
    frist: { label: 'Wiedereinsetzung', fristId: 'zpo-wiedereinsetzung' },
    module: ['/fristen', '/rechtsmittel']
  },
  {
    id: 'pfaendung',
    title: 'Ich habe eine Pfändung / Exekution erhalten',
    passiert:
      'Ein Gläubiger betreibt auf Grundlage eines Exekutionstitels die Einbringung seiner Forderung.',
    sofort: [
      'Titel prüfen (welche Forderung, wie hoch, wann entstanden?).',
      'Existenzminimum prüfen — ein bestimmter Betrag ist unpfändbar.',
      'Oppositions- oder Impugnationsklage bei inhaltlichen Einwänden prüfen.',
      'Ratenzahlung mit Gläubiger verhandeln.'
    ],
    nicht: ['Keine Absprachen ohne schriftliche Bestätigung.'],
    anwalt: 'Empfohlen, insbesondere bei Einwänden gegen den Titel.',
    module: ['/verfahrenshilfe', '/fristen']
  },
  {
    id: 'kuendigung',
    title: 'Ich wurde gekündigt',
    passiert:
      'Ihr Arbeitgeber hat Ihr Dienstverhältnis beendet. Eine Anfechtung ist unter engen Voraussetzungen möglich.',
    sofort: [
      'Kündigungserklärung prüfen (schriftlich, mündlich?).',
      'Kündigungsfristen und Kündigungstermine prüfen.',
      'Binnen 2 Wochen ab Zugang über Betriebsrat Anfechtung prüfen (§ 105 ArbVG).',
      'Arbeitsmarktservice (AMS) umgehend kontaktieren.'
    ],
    nicht: ['Keine voreilige Unterschrift unter einvernehmliche Auflösung.'],
    anwalt: 'Empfohlen — auch Arbeiterkammer und Gewerkschaft bieten Beratung.',
    frist: { label: 'Kündigungs-/Entlassungsanfechtung', fristId: 'asg-kuendigungsanfechtung' },
    module: ['/fristen']
  },
  {
    id: 'entlassung',
    title: 'Ich wurde entlassen',
    passiert:
      'Der Arbeitgeber hat Ihr Dienstverhältnis fristlos beendet und wirft Ihnen i.d.R. eine schwere Pflichtverletzung vor.',
    sofort: [
      'Schriftliche Rechtfertigung / Widerspruch vorbereiten.',
      'Entlassungsgrund genau hinterfragen.',
      'Arbeiterkammer / Gewerkschaft kontaktieren.',
      'AMS umgehend informieren.'
    ],
    nicht: ['Keine unüberlegte einvernehmliche Auflösung.'],
    anwalt: 'Dringend empfohlen.',
    frist: { label: 'Kündigungs-/Entlassungsanfechtung', fristId: 'asg-kuendigungsanfechtung' },
    module: ['/fristen']
  },
  {
    id: 'unterhalt',
    title: 'Ich brauche / schulde Unterhalt',
    passiert:
      'Kindes- oder Ehegattenunterhalt richtet sich nach Einkommen, Alter der Kinder und Sonderbedarf.',
    sofort: [
      'Einkommensnachweise sammeln (Lohnzettel, Steuerbescheid).',
      'Unterhaltsbedarf grob berechnen (Richtwerte).',
      'Außergerichtliche Einigung (Jugendamt/KJH) versuchen.'
    ],
    nicht: ['Keine einseitige Zahlungseinstellung — Exekution droht.'],
    anwalt: 'Bei Streit empfohlen; Kinder- und Jugendhilfe unterstützt bei Kindesunterhalt.',
    module: ['/unterhalt']
  },
  {
    id: 'strafzettel',
    title: 'Ich habe einen Strafzettel / eine Strafverfügung (VStG) bekommen',
    passiert:
      'Die Behörde hat eine Verwaltungsstrafe verhängt. Sie können binnen 2 Wochen Einspruch erheben.',
    sofort: [
      'Zustelldatum notieren.',
      'Prüfen, ob Sie tatsächlich lenker:in / täter:in waren.',
      'Ggf. Einspruch mit Begründung erheben.'
    ],
    nicht: ['Nicht einfach bezahlen, wenn Sie die Strafe anfechten wollen.'],
    anwalt: 'In leichten Fällen nicht nötig; bei Führerscheinfolgen oder hoher Strafe sinnvoll.',
    frist: { label: 'Einspruch gegen Strafverfügung (VStG)', fristId: 'vstg-einspruch-strafverfuegung' },
    module: ['/fristen']
  },
  {
    id: 'fuehrerschein',
    title: 'Mir droht ein Führerscheinentzug',
    passiert:
      'Die Behörde hat die Entziehung der Lenkberechtigung angeordnet oder angekündigt.',
    sofort: [
      'Entziehungsbescheid genau lesen — Dauer? Auflagen?',
      'Beschwerde an LVwG prüfen (4 Wochen).',
      'Parallele Verwaltungsstrafverfahren prüfen.'
    ],
    nicht: ['Nicht trotz Entzug fahren — Folgekonsequenzen.'],
    anwalt: 'Empfohlen bei längerem Entzug oder besonderen Umständen.',
    frist: { label: 'Beschwerde gegen Straferkenntnis', fristId: 'vstg-beschwerde' },
    module: ['/fristen']
  },
  {
    id: 'inkasso',
    title: 'Ich habe ein Inkassoschreiben erhalten',
    passiert:
      'Ein Inkassobüro verlangt Zahlung einer Forderung. Noch KEIN gerichtlicher Titel.',
    sofort: [
      'Forderung prüfen (Rechnung? Vertrag? Mahnung?).',
      'Inkasso-Nebengebühren genau prüfen — oft überhöht.',
      'Bei unberechtigter Forderung schriftlich widersprechen.',
      'Nicht einfach Raten zustimmen ohne Prüfung.'
    ],
    nicht: ['Keine unüberlegte Ratenzustimmung — diese kann Anerkenntnis sein.'],
    anwalt: 'Bei unklaren Fällen Rechtsberatung (AK, Konsumentenschutz) einholen.',
    module: ['/verjaehrung']
  },
  {
    id: 'ueberschuldung',
    title: 'Ich bin überschuldet',
    passiert:
      'Die Schulden übersteigen Ihr Vermögen / Einkommen. Ein Schuldenregulierungsverfahren („Privatkonkurs“) kommt in Betracht.',
    sofort: [
      'Einnahmen-/Ausgabenplan erstellen.',
      'Schuldenberatung kontaktieren (anerkannte staatl. Schuldenberatung).',
      'Prüfen: Abschöpfungsverfahren / Tilgungsplan.',
      'Gläubigerverhandlungen versuchen.'
    ],
    nicht: ['Keine neuen Kredite zur Tilgung alter Kredite.'],
    anwalt: 'Schuldenberatung ist oft der richtige Einstieg; Anwalt bei komplexen Fällen.',
    module: ['/verfahrenshilfe']
  }
]
