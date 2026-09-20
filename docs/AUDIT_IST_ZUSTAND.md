# Bestandsaufnahme Ist-Zustand

**Stand:** 20.09.2026
**Untersuchter Gegenstand:** Replit-App „JuvenileRewardingFreesoftware" (Titel im Projekt: *Forderungsportal*), zuletzt geändert am 20.09.2026, 07:57 UTC.
**Methode:** Lesen der Quelldateien über die Replit-Schnittstelle. Kein Ausführen, kein Debuggen, keine Datenbankabfrage.

## Kennzeichnung der Aussagen

- **[V]** verifiziert — im Quelltext gesehen, Fundstelle genannt
- **[A]** vermutet — plausible Schlussfolgerung, nicht im Code belegt
- **nicht gefunden** — bei der Durchsicht nicht angetroffen. Das ist keine Aussage darüber, dass es nicht existiert: es kann in einer nicht gelesenen Datei, in einer anderen App oder außerhalb des Repos liegen.

## Vorbemerkung zum Prüfumfang

Der Audit-Auftrag setzte voraus, dass `CLAUDE.md` und `docs/BRIEFING.md` im Repository liegen. **Beides war im GitHub-Repository nicht vorhanden** [V]; das Repository enthielt bei Sitzungsbeginn ausschließlich einen Businessplan zu einem anderen Vorhaben (Service-Marktplatz für Kurzzeitvermieter). `CLAUDE.md` wurde im Lauf dieser Sitzung aus Ihrer Nachricht angelegt.

**`docs/BRIEFING.md` liegt mir weiterhin nicht vor.** Der Abgleich in Abschnitt 2 erfolgt deshalb gegen die Invarianten und Architekturvorgaben aus `CLAUDE.md` sowie gegen die Phasen A–J des Kickoff-Prompts, **nicht** gegen das fachliche Briefing. Kapitelbezüge des Briefings (z. B. „Kap. 9 Status") kann ich nicht prüfen.

Nicht gelesen und daher nicht bewertet: `artifacts/forderungsportal-klarheit` (Designsystem), `artifacts/mockup-sandbox`, `lib/api-client-react`, `lib/api-zod` (generiert), das React-Frontend unterhalb `artifacts/forderungsportal/src/components` und `.../pages`, `LEGAL_ARCHITECTURE.md`, `research/`, `scripts/`.

---

## 1. Architekturkarte

### 1.1 Workspace [V]

pnpm-Workspace, Node 24, TypeScript 5.9.

| Paket | Inhalt |
|---|---|
| `lib/api-spec` | `openapi.yaml` als Vertragsquelle, Orval-Konfiguration |
| `lib/api-zod` | aus der Spec generierte Zod-Schemata |
| `lib/api-client-react` | aus der Spec generierte React-Query-Hooks |
| `lib/db` | Drizzle-Schema und DB-Client |
| `artifacts/api-server` | Express-5-API |
| `artifacts/forderungsportal` | React-Frontend (Vite) |
| `artifacts/forderungsportal-klarheit` | Designsystem |
| `artifacts/mockup-sandbox` | Entwurfsfläche |

Die in `CLAUDE.md` vorgesehene Reihenfolge Spec → Codegen → Server → Client ist strukturell vorhanden [V].

### 1.2 Server [V]

`artifacts/api-server/src/app.ts`:

1. `pino-http` — Request-Logger
2. Clerk-Proxy unter `CLERK_PROXY_PATH`
3. `cors()` — **ohne Optionen**
4. `express.json()` und `express.urlencoded()`
5. `clerkMiddleware(...)`
6. `/api` → Router

`routes/index.ts` hängt ein:

| Router | Authentifizierung |
|---|---|
| `health` | keine |
| `collections` | **im Router selbst**, nur für `/dashboard`, `/claims`, `/reports` |
| `account`, `documents`, `claim-evaluations`, `team` | `requireAuth` + `loadCurrentProfile` beim Einhängen |

Auffällig: die Verzeichnisse `src/middleware/` und `src/middlewares/` existieren nebeneinander [V].

### 1.3 Tatsächlich vorhandene Endpunkte [V]

Aus `lib/api-spec/openapi.yaml`:

- **Gesundheitsprüfung:** `GET /healthz`
- **Gläubiger (authentifiziert):** `GET /dashboard`, `GET|POST /claims`, `GET /claims/{id}`, `GET /reports`, `GET|PUT /profile`, `GET /team/members`, `POST /team/members`, `DELETE /team/members/{id}`
- **Dokumente:** `POST /documents/uploads`, `POST /documents/{id}/verify`, `GET /documents/{id}`, `DELETE /documents/{id}`
- **KI-Vorprüfung:** `POST /claim-evaluations`, `GET /claim-evaluations/{id}`
- **Zahlung:** `GET /billing/offers`, `POST /billing/checkout`, `GET /billing/checkout/{orderId}/confirm`
- **Schuldnerportal (`security: []`, also ohne Anmeldung):** `GET /portal/{token}`, `POST /portal/{token}/verification-code`, `POST /portal/{token}/verify`, `POST /portal/{token}/action`

**Nicht gefunden:** ein Stripe-Webhook-Endpunkt, Endpunkte für Zahlungen, Zahlungsmeldungen, Ratenpläne, Einwendungen, Erfolgshonorar, Audit, Kanzleiübergabe oder Back-Office.

### 1.4 Datenmodell [V]

`lib/db/src/schema/` enthält genau sechs Tabellen:

`profiles`, `team_members`, `orders`, `claim_documents`, `document_audit_events`, `claim_evaluations`

**Nicht gefunden:** `claims`, `claim_parties`, `claim_amount_components`, `claim_events`, `claim_status_history`, `claim_assignments`, `payments`, `payment_reports`, `payment_allocations`, `installment_plans`, `success_fee_agreements`, `success_fee_calculations`, `stripe_events`, `audit_events`, `outbox`, `debtor_access_tokens`, `legal_escalation_requests`, Konfigurationstabellen.

### 1.5 Wo die Forderungsakte tatsächlich liegt [V]

In `artifacts/api-server/src/routes/collections.ts` als **Modulvariable im Arbeitsspeicher**:

```
const claims: Claim[] = [ … fünf fest eingetragene Demo-Fälle … ];
const activatedOrderIds = new Set<string>();
const portalVerificationTokens = new Map<…>();
```

Das ist der wichtigste strukturelle Befund dieses Audits: **Die Forderungsakte — der eigentliche Produktkern — ist nicht persistiert.** Alle Fälle, alle Aktivierungssperren und alle Portal-Sitzungen gehen bei jedem Neustart und bei jeder Skalierung über mehr als einen Prozess verloren.

---

## 2. Abgleich Vorgaben ↔ Code

Gegen die Invarianten aus `CLAUDE.md` (Abschnitt 1) und die Phasen A–J des Kickoff-Prompts.

### 2.1 Invarianten

| # | Invariante | Status | Fundstelle | Anmerkung |
|---|---|---|---|---|
| 1 | Kein Kundengeld | **umgesetzt** | `collections.ts` Portal-Antwort; `replit.md` Architekturentscheidungen | Zahlung geht an die IBAN des Gläubigers; Portal bucht nichts. Im Text ausdrücklich so benannt. |
| 2 | Keine automatische Eskalation | **teilweise** | `openapi.yaml` `LegalEscalation`; `collections.ts` `GET /claims/{id}` | Eskalation ist reine Anzeige mit fest eingetragenen Werten. Es gibt keinen Ausführungspfad — also auch keinen automatischen. Ein Freigabe-, Vollmachts- oder Übergabeprozess ist **nicht gefunden**. |
| 3 | KI nur Entscheidungshilfe | **verletzt** | `account.ts` `POST /billing/checkout` | `evaluation.recommendation !== "accept"` blockiert die Beauftragung mit 409. Ein Weg, das durch einen Menschen zu übersteuern, ist **nicht gefunden**. Damit entscheidet das Modell faktisch über die Annahme. |
| 4 | Einwendung = Stopp | **Demo** | `collections.ts` `POST /portal/:token/action` | Setzt eine Statuszeichenkette auf `"Bestritten"`. Ein Jobsystem, das pausiert werden könnte, ist **nicht gefunden**. |
| 5 | B2C strenger | **teilweise** | `account.ts`; `collections.ts` `activatePaidClaim` | `consumerCaseNoticeAccepted` wird beim Checkout erzwungen [V]; ein Verbraucherfall erhält den Status `"Rechtliche Prüfung"` [V]. Eine Prüfwarteschlange oder Freigabe vor Erstkontakt ist **nicht gefunden**. |
| 6 | Geld = Integer-Cent | **verletzt** | `openapi.yaml` `Claim.amount: {type: number}`, ebenso `originalAmount`, `fees`, `priorPayments`, `credits`, `previousCosts`, `AmountLine.amount`, `Payment.amount`, `courtFee`, `pleadingFee` | Durchgängig `number`, also Gleitkomma. Einzige Ausnahme: `BillingOffer.amount: integer` (Stripe-Betrag in Cent) [V]. |
| 7 | Rechtliche Parameter nicht hartkodiert | **verletzt** | `collections.ts` `GET /portal/:token` und `GET /claims/{id}` | Siehe Abschnitt 4. Unter anderem ein Zinssatz von `10.73` und ein Geltungsdatum `"2026-07-01"` fest im Routencode. |
| 8 | Serverseitige Identität | **umgesetzt** | `middleware/auth.ts`; alle Routen über `getAuthenticated(req).profile.id` | **Ein vom Client übernommenes `profileId` wurde nicht gefunden.** Die im Auftrag vermutete Schwachstelle besteht an den geprüften Stellen nicht. |
| 9 | Append-only Audit | **teilweise** | `document_audit_events` | Existiert **nur für Dokumente** [V]. Ein fachliches Audit über Status, Beträge, Zahlungen, Einwendungen, Freigaben ist **nicht gefunden**. Ein Änderungs- oder Löschschutz per DB-Trigger ist **nicht gefunden**. |
| 10 | Idempotenz | **teilweise** | `account.ts` Bestätigungsroute; `collections.ts` `activatePaidClaim` | Siehe Befund S-03. Die Sperre liegt im Arbeitsspeicher, nicht in der Datenbank. |
| 11 | Datensparsamkeit gegenüber KI | **überwiegend umgesetzt** | `lib/claimEvaluation.ts` `buildMinimizedEvaluationPayload` | Deutlich besser als gefordert: Identitätsfelder werden nicht pseudonymisiert, sondern durch reine Vorhanden-Merker **ersetzt**. Dokumentinhalte gehen nicht an das Modell [V]. Einschränkung siehe S-08. |
| 12 | Keine Kanzlei-Suggestion | **umgesetzt** | `collections.ts`: `lawFirmName: "Kooperationskanzlei (nach gesonderter Prüfung)"` | Formulierung ist zurückhaltend; ein Kanzleiname wird im geprüften Code nicht genannt. |

### 2.2 Phasen A–J

| Phase | Paket | Status | Fundstelle / Anmerkung |
|---|---|---|---|
| A1 | Identität, Mandantentrennung | **überwiegend umgesetzt** | `auth.ts`; jede Fall-, Dokument- und Bewertungsabfrage filtert auf `profileId`. Automatisierte Cross-Tenant-Tests **nicht gefunden**. Kein Repository-Layer, die Filterung liegt in jeder Route einzeln. |
| A2 | Money-Library | **fehlt** | **Nicht gefunden.** Beträge sind `number`. |
| A3 | `audit_events` | **teilweise** | Nur `document_audit_events`. |
| A4 | State Machine, `claim_status_history` | **fehlt** | Status sind freie deutsche Zeichenketten (`"In Bearbeitung"`, `"Bestritten"`, `"Ratenplan"`), direkt zugewiesen. Kein Übergangsmodell, keine Historie. |
| A5 | Versionierte Rechtskonfiguration | **fehlt** | **Nicht gefunden.** Werte stehen im Routencode. Kein `DEMO_ONLY`-Konzept, kein Startup-Check. |
| B1 | Stripe-Webhook | **fehlt** | **Nicht gefunden.** Kein Webhook, keine Signaturprüfung, keine `stripe_events`. `express.json()` liegt global vor allen Routen — ein Raw-Body-Webhook müsste davor eingehängt werden. |
| B2 | Idempotente Aktivierung | **teilweise** | Nur über die Browser-Rückkehr, nicht transaktional. Siehe S-01 und S-03. |
| B3 | Preisregel pro Fall | **fehlt** | Ein einziges Angebot `single_case` mit festem Stripe-Preis [V]. Keine betragsabhängige Regel. Rechtliche Folge siehe S-02. |
| B4 | Einwilligungsprotokoll | **teilweise** | `termsAccepted`, `immediatePerformanceRequested`, `consumerCaseNoticeAccepted`, `creditorDeclarationAccepted`, `collectionAuthorityAccepted`, `assignmentExcluded` werden erhoben und geprüft [V] — aber **nicht gespeichert**. Zeitstempel, IP-Hash, AGB-Textversion **nicht gefunden**. |
| C1–C4 | Persistente Forderungsakte | **fehlt** | Siehe 1.4 und 1.5. Dashboard und Berichte liefern bewusst Nullwerte. |
| D1 | Schuldnerportal produktiv | **Demo** | Siehe S-04 bis S-07. |
| D2 | Portal-Aktionen | **Demo** | Die vier Aktionen existieren als Endpunkt und antworten mit Text; nur `dispute` hat eine Wirkung, und die ist fehlerhaft (S-06). |
| D3 | Einwendung pausiert Jobs | **fehlt** | Kein Jobsystem gefunden. |
| D4 | EPC-QR-Code | **teilweise** | `paymentDestination` mit Empfänger, IBAN und Referenz ist vorhanden [V]; die QR-Erzeugung liegt vermutlich im Frontend [A] — nicht geprüft. |
| E1–E4 | Zahlungsabgleich, Raten | **fehlt** | `Payment` existiert als Schema, `payments` wird immer leer geliefert [V]. Keine Tabellen, kein Bestätigungsworkflow, keine Anrechnung. |
| F1–F3 | Erfolgshonorar | **fehlt** | **Nicht gefunden.** |
| G1–G3 | Outbox, Benachrichtigungen, Vorlagen | **fehlt** | **Nicht gefunden.** |
| H1 | Pseudonymisierung | **umgesetzt** (als Minimierung) | `buildMinimizedEvaluationPayload`. |
| H2 | Zod-validierte Ausgabe, Fallback | **teilweise** | Handgeschriebene Prüfung statt Zod; bei Parsefehler 502 statt `manual_review`. Fällt sicher aus, entspricht aber nicht der Vorgabe. |
| H3 | Prompt-Versionierung, Evaluationsset | **fehlt** | Prompt steht inline in der Route; nur die Modell-ID wird gespeichert. `tests/ai-eval` **nicht gefunden**. |
| I1–I3 | Kanzleiübergabe | **fehlt** | Nur Anzeige. |
| J1 | Logging, Monitoring | **teilweise** | Query-String wird aus dem Log entfernt [V] — gute Maßnahme. Fehler-Monitoring und Health-Checks über `/healthz` hinaus **nicht gefunden**. |
| J2–J4 | Backups, Löschkonzept, E2E-Tests | **fehlt** | Eine Aufbewahrungsfrist von sieben Jahren wird auf Dokumenten gesetzt [V], aber hart kodiert. Testdateien **nicht gefunden**. |

---

## 3. Sicherheitsbefunde

Schweregrad bezogen auf einen **Produktivbetrieb mit echten Schuldnerdaten**. Für eine Vorführumgebung sind mehrere Befunde unkritisch — das ist bei jedem Punkt vermerkt.

### S-01 — Aktivierung hängt allein an der Browser-Rückkehr · **kritisch** [V]

`artifacts/api-server/src/routes/account.ts`, `GET /billing/checkout/:orderId/confirm`

Der Auftrag wird ausschließlich dann auf `paid` gesetzt und der Fall ausschließlich dann angelegt, wenn der Browser des Gläubigers nach der Zahlung zur Bestätigungsroute zurückkehrt. Ein Stripe-Webhook ist **nicht gefunden**.

**Folge:** Schließt die Kundin nach der Zahlung das Fenster, bricht die Verbindung ab oder scheitert die Weiterleitung, ist das Geld eingezogen und der Auftrag bleibt dauerhaft `checkout_pending`. Es gibt keinen zweiten Weg, das zu heilen.

**Zusätzlich:** `express.json()` ist global vor allen Routen registriert. Ein später ergänzter Webhook mit Signaturprüfung braucht den unveränderten Rohtext des Requests und muss deshalb **vor** dieser Zeile eingehängt werden. Wird er einfach in den bestehenden Router gehängt, schlägt die Signaturprüfung fehl.

### S-02 — Feste Gebühr verletzt den gesetzlichen Deckel bei kleinen Forderungen · **hoch** [V+A]

`account.ts` `GET /billing/offers` und `POST /billing/checkout` verwenden ein einziges Angebot `single_case` mit einem festen Stripe-Preis [V]. Eine Abhängigkeit vom Forderungsbetrag ist **nicht gefunden**.

§ 2 der Höchstsatzverordnung deckelt die im Voraus zu zahlende Auftragsgebühr mit 6 % der Forderung. Bei einer Forderung von 200 € wären höchstens 12 € zulässig [siehe docs/LEGAL_OPEN_QUESTIONS.md L-03]. Ein fester Betrag von 30 € ist erst ab 500 € Forderung gedeckt.

**Folge [A]:** Sobald ein Fall unter dieser Schwelle beauftragt werden kann, wird eine unzulässige Gebühr verrechnet. Ob das eintritt, hängt vom konkret hinterlegten Stripe-Preis ab, den ich nicht gelesen habe.

**Bereits im GitHub-Repo umgesetzt:** `computeOrderFee()` liefert `min(Stufenbetrag, 6 % der Forderung)`, der Deckel ist nicht abschaltbar.

### S-03 — Aktivierung ist nicht idempotent · **hoch** [V]

`account.ts`: `if (paid && order.status !== "paid") { … }` — ein Lesen-dann-Schreiben ohne Transaktion und ohne Bedingung im `UPDATE`. Das anschließende `UPDATE` setzt `status` bedingungslos.

`collections.ts`: `activatePaidClaim` schützt über `activatedOrderIds`, ein `Set` **im Arbeitsspeicher**.

**Folge:** Zwei gleichzeitige Aufrufe der Bestätigungsroute — etwa durch doppeltes Laden der Rückkehrseite — lesen beide `status !== "paid"` und laufen beide durch. Nach einem Neustart ist die Sperre leer, der Fall kann erneut angelegt werden. Auch die Dokument-Audit-Einträge `retention_started` werden dann doppelt geschrieben [V].

**Korrektur:** Bedingung in die `WHERE`-Klausel (`status <> 'paid'`) und Auswertung der betroffenen Zeilen, plus eine Unique-Bedingung auf der Fall-Anlage.

### S-04 — Verifizierungscode ist fest kodiert und wird an den Client ausgeliefert · **kritisch** (Demo) [V]

`collections.ts`: `const DEMO_VERIFICATION_CODE = "482731";`

Der Code wird in der Antwort von `POST /portal/:token/verification-code` als Feld `demoCode` zurückgegeben. Das ist **kein Versehen im Routencode, sondern Teil des API-Vertrags**: in `openapi.yaml` ist `demoCode` ein **Pflichtfeld** von `PortalVerificationChallenge`.

**Folge:** Wer den Falllink kennt, erhält den Bestätigungscode in derselben Antwort. Die zweite Stufe der Legitimation ist damit wirkungslos.

**Einordnung:** In einer Vorführumgebung beabsichtigt. Vor Produktivbetrieb muss das Feld aus dem Vertrag entfernt werden, nicht nur aus der Implementierung — sonst erzeugt der Codegen es weiter.

### S-05 — Falllink ist keine Zufallszeichenkette · **kritisch** (Demo) [V]

Die Portalrouten akzeptieren ausschließlich den festen Wert `"demo-token"`. Ein Zufallstoken mit mindestens 128 Bit, nur als Hash gespeichert, mit Ablaufzeit, Versuchszähler und Sperre — wie in `CLAUDE.md` 4.8 gefordert — ist **nicht gefunden**. Eine Begrenzung der Versuchsrate ist **nicht gefunden**.

Der ausgestellte Sitzungsnachweis lautet `demo-verified-${Date.now()}` [V] und ist damit aus der Uhrzeit ableitbar statt zufällig.

### S-06 — Portalaktion verändert einen fest verdrahteten fremden Fall · **hoch** [V]

`collections.ts`, `POST /portal/:token/action`:

```
if (body.data.action === "dispute") {
  const claim = claims.find((item) => item.id === "clm-1048");
  …
}
```

Unabhängig davon, über welchen Falllink die Einwendung kommt, wird immer der Fall `clm-1048` auf `"Bestritten"` gesetzt.

**Folge:** In einem Mehrfall-Betrieb schreibt eine Schuldneraktion auf einen fremden Fall. Dass die Wirkung heute harmlos ist, liegt allein daran, dass es nur Demo-Daten gibt.

### S-07 — Falldaten ohne jede Prüfung abrufbar · **hoch** (Demo) [V]

`GET /portal/{token}` ist in der Spec mit `security: []` geführt und prüft den Token im Routencode **gar nicht** — anders als die drei anderen Portalrouten, die zumindest auf `"demo-token"` prüfen. Die Antwort enthält Gläubigername, Aktenzeichen, Betrag, Fälligkeit und die Empfänger-IBAN.

Die Codebestätigung wird erst bei `POST /portal/:token/action` verlangt [V]. Das heißt: **Lesen der Falldaten erfordert keine zweite Stufe**, nur das Handeln.

### S-08 — Datensparsamkeit gegenüber der KI beruht auf einer Ausschlussliste · **mittel** [V]

`lib/claimEvaluation.ts`: `buildMinimizedEvaluationPayload` entfernt namentlich aufgezählte Felder und übernimmt den Rest per `...assessmentData`.

Die Maßnahme ist inhaltlich sehr gut — entfernt werden Name, E-Mail, Adresse, Geburtsdatum, Telefon, Firmenbuchnummer, UID sowie die Freitextfelder `priorCommunication`, `priorObjectionDetails`, `note` und `legalBasis`; Dokumentinhalte gehen nicht an das Modell [V].

**Das Risiko liegt in der Bauform:** Wird `ClaimInput` künftig um ein Feld mit Personenbezug erweitert, fließt es ohne weitere Änderung an das Modell. Eine Aufnahmeliste („nur diese Felder gehen hinaus") wäre robust, eine Ausschlussliste ist es nicht. Ein Test, der das absichert, ist **nicht gefunden**.

### S-09 — KI-Empfehlung wirkt als harte Sperre · **mittel** (Governance) [V]

`account.ts`: `evaluation.recommendation !== "accept"` → HTTP 409. Ein Übersteuerungspfad durch einen Menschen ist **nicht gefunden**.

Das widerspricht Invariante 3. Die Absicht ist erkennbar vorsichtig — das Modell kann nur blockieren, nie freigeben, und die Ablehnung fällt auf die sichere Seite. Dennoch trifft damit faktisch das Modell die Annahmeentscheidung, ohne dass ein Mensch sie bestätigt oder aufheben kann.

### S-10 — CORS ohne Einschränkung · **mittel** [V]

`app.ts`: `app.use(cors())` ohne Optionen erlaubt jede Herkunft.

Da Clerk-Token im `Authorization`-Header übertragen werden und `credentials` nicht gesetzt ist, ist keine unmittelbare Übernahme einer Sitzung aus dem Browser heraus möglich [A]. Für einen produktiven Betrieb sollte die Herkunft dennoch auf die eigenen Domänen begrenzt werden. Sicherheits-Header (Helmet, CSP) sind **nicht gefunden**.

### S-11 — Validierungsfehler können Eingabewerte ins Log schreiben · **mittel** [V]

`collections.ts`, `POST /claims`: `req.log.warn({ errors: parsed.error.message }, "Invalid claim")`

Zod-Fehlermeldungen enthalten je nach Regel den beanstandeten Wert. Bei `debtorEmail: {format: email}` kann das die eingegebene E-Mail-Adresse sein. Dieselben Meldungen werden zusätzlich im Antwortkörper an den Client zurückgegeben [V].

Positiv daneben: der Request-Logger entfernt den Query-String (`req.url?.split("?")[0]`) [V], und die KI-Route protokolliert nur `error.message`, nicht die Nutzlast [V].

### S-12 — Beträge als Gleitkommazahl · **hoch** [V]

Durchgängig `type: number` im Vertrag (siehe 2.1 Nr. 6). Ein Ratenplan wird als fertiger Text `"4 Raten zu je € 462,50"` geliefert [V], also bereits gerundet, ohne dass die Aufteilung nachvollziehbar wäre.

**Folge:** Sobald real gerechnet wird — Teilzahlungen, Zinsen, Ratenaufteilung, Erfolgshonorar — entstehen Rundungsdifferenzen, die in einer Forderungsaufstellung nicht erklärbar sind. Die Datenbank kennt heute keine Betragsspalte, daher ist noch nichts falsch persistiert [V].

### S-13 — Kein Referenzschutz im Datenmodell · **niedrig** [V]

`orders.profileId` ist `text` ohne Fremdschlüssel auf `profiles`; `status` ist Freitext ohne Prüfbedingung; auf `stripe_checkout_session_id` ist keine Eindeutigkeit gesetzt. Eine Betragsspalte fehlt, das heißt **der tatsächlich verrechnete Betrag wird nirgends festgehalten** — für Buchhaltung und Rechnungslegung ein eigener Mangel.

### S-14 — Zwei Middleware-Verzeichnisse · **niedrig** [V]

`src/middleware/` und `src/middlewares/` existieren parallel. Erhöht das Risiko, dass eine Schutzfunktion versehentlich aus dem falschen Verzeichnis importiert oder doppelt gepflegt wird.

---

## 4. Demo- und Platzhalterwerte

Vollständig, soweit in den gelesenen Dateien angetroffen.

### 4.1 Rechtlich bedeutsame Werte im Routencode [V]

`collections.ts`, `GET /portal/:token`, Objekt `installmentOffer`:

| Wert | Bedeutung |
|---|---|
| `annualInterestRate: 10.73` | Jahreszinssatz, als Gleitkommazahl fest eingetragen |
| `interestRateValidFrom: "2026-07-01"` | Geltungsbeginn ohne Versionierungsmechanismus |
| `legalBasis: "§ 456 UGB: 9,2 Prozentpunkte über …"` | Rechtsgrundlage als Zeichenkette im Code |
| `minimumClaimAmount: 500` | Mindestforderung für ein Ratenangebot |
| `minimumInstallmentAmount: 100` | Mindesthöhe einer Rate |
| `maxInstallments: 6` | Höchstzahl der Raten |
| `processingFee: 0` | Bearbeitungsgebühr |
| `requiresManualApproval: false` | Automatische Freigabe ohne Prüfung |

`collections.ts`, `GET /claims/{id}`, Objekt `legalEscalation`: `courtFee: 137`, `pleadingFee: 290`.

`account.ts`: Aufbewahrungsfrist von sieben Jahren als `setUTCFullYear(+7)` fest im Code.

Diese Werte sind genau das, was `CLAUDE.md` Abschnitt 6 untersagt: Zinssätze, Pauschalen und Fristen als Produktivwerte im Code. Sie tragen keine Kennzeichnung als Demo-Wert und würden in Produktion unbemerkt wirksam.

### 4.2 Sicherheitsrelevante Platzhalter [V]

| Wert | Ort |
|---|---|
| `DEMO_VERIFICATION_CODE = "482731"` | `collections.ts` |
| `demoCode` als Pflichtfeld | `openapi.yaml`, `PortalVerificationChallenge` |
| Token `"demo-token"` | alle Portalrouten |
| `demo-verified-${Date.now()}` | `POST /portal/:token/verify` |
| fest verdrahtete Fall-ID `"clm-1048"` | `POST /portal/:token/action` |

### 4.3 Demo-Inhalte [V]

- Fünf Forderungen mit Schuldnernamen, die jeweils auf `(Demo)` enden; jeder neu angelegte Fall erhält diesen Zusatz automatisch angehängt.
- Feste Schuldner-E-Mail `buchhaltung@demo-unternehmen.at` in jeder Falldetailansicht.
- Platzhalter-IBAN `AT00 0000 0000 0000 0000` im Schuldnerportal.
- Fünf fest eingetragene Zeitleisteneinträge mit Datumsangaben aus September 2026, identisch für **jeden** Fall.
- Zwei fest eingetragene Dokumente und zwei Kommunikationseinträge, ebenfalls für jeden Fall identisch.
- Fest eingetragene Score-Begründungen, unabhängig vom tatsächlichen Fall.
- Aktenzeichen aus einer Zählung über die Länge des Arrays: `FR-2026-${1050 + claims.length}`. Nach einem Neustart beginnt die Zählung erneut — **Aktenzeichen sind damit nicht eindeutig**.

### 4.4 Bewusst auf null gesetzte Werte [V]

`GET /dashboard` überschreibt alle Kennzahlen mit `0` und liefert leere Listen; `GET /reports` liefert durchgehend `0`. Das darunterliegende `dashboard`-Objekt mit gefüllten Demo-Zahlen existiert im Code, wird aber nicht ausgeliefert.

**Einordnung [A]:** erkennbar eine bewusste Entscheidung, keine Fantasiezahlen zu zeigen. Die Folge ist ein leeres Dashboard.

### 4.5 Der A–D-Score [V]

Der Score wird rein regelbasiert aus drei Merkmalen abgeleitet: Verbraucherfall → `C`, bekannte Einwendung → `D`, Dokument vorhanden → `A`, sonst `B`. Die im Frontend angezeigten Score-Begründungen sind fest eingetragener Text und passen nicht notwendig zum berechneten Score.

Laut `replit.md` ist der Score „ausschließlich eine interne, erklärbare Arbeitshilfe" und darf keine automatisierte Entscheidung auslösen. Im gelesenen Code löst er keine aus [V].

---

## 5. Offene Rechtsfragen

Ausgelagert nach **`docs/LEGAL_OPEN_QUESTIONS.md`** (L-01 bis L-16), jeweils mit Kontext, betroffener Funktion, technischen Optionen und Angabe, was bis zur Klärung blockiert ist.

Aus diesem Audit unmittelbar berührt: **L-01** (Gewerbeberechtigung), **L-03** (Gebührenhöhe, siehe S-02), **L-05** und **L-06** (Zinssatz `10.73`), **L-08** (Ratenregeln aus Abschnitt 4.1), **L-12** (Sieben-Jahres-Frist), **L-16** (Zahlungsbestätigung).

---

## 6. Gesamtbild

**Was tragfähig ist.** Der Teil, der die Datenbank berührt, ist sorgfältig gebaut. Identität kommt serverseitig aus Clerk; ein vom Client übernommenes `profileId` habe ich **nicht gefunden**, obwohl der Auftrag das ausdrücklich vermutete. Die Dokumentenkette ist der stärkste Teil des Systems: Eigentümer, Sitzung, Status und Virenprüfung werden bei jedem Zugriff gemeinsam geprüft, die Zuordnung zum Auftrag läuft in einer Transaktion mit Konfliktbehandlung, und es gibt ein eigenes Audit. Die Datensparsamkeit gegenüber dem Sprachmodell geht über die Vorgabe hinaus.

**Was nicht tragfähig ist.** Der Produktkern — die Forderungsakte — ist eine Variable im Arbeitsspeicher. Daraus folgt fast alles Übrige: keine Historie, kein Audit, keine Zahlungen, keine Zustandsmaschine, keine eindeutigen Aktenzeichen. Das Schuldnerportal ist eine Vorführung mit fest kodiertem Code und festem Token. Die Aktivierung nach der Zahlung hängt an einem einzigen, unzuverlässigen Pfad.

**Die Einschätzung in einem Satz [A]:** Dies ist ein sorgfältig gebauter, in Teilen produktionsnaher Prototyp des *Auftragseingangs* — Profil, Dokumente, KI-Vorprüfung, Checkout — vor einem noch nicht gebauten *Bearbeitungssystem*.

**Empfohlene Reihenfolge**, abweichend von der Nummerierung des Kickoff-Prompts, weil sie sich aus den Befunden ergibt:

1. **S-01 und S-03** — Stripe-Webhook mit Rohtext und Signaturprüfung, `stripe_events` mit Eindeutigkeit, Aktivierung in einer Transaktion. Hier geht heute Geld ohne Gegenleistung verloren.
2. **A2 Money-Library** vor jeder weiteren Betragslogik, sonst wird der Fehler in jede neue Tabelle hineinmigriert. *(Im GitHub-Repo bereits gebaut, 40 Tests.)*
3. **C1 Forderungsakte in die Datenbank**, zusammen mit A3 Audit und A4 Zustandsmaschine. *(State Machine, Audit und Privacy im GitHub-Repo bereits gebaut.)*
4. **A5 versionierte Konfiguration** — die Werte aus Abschnitt 4.1 haben im Code nichts verloren. *(Im GitHub-Repo bereits gebaut, inklusive Startup-Check und Gebührendeckel.)*
5. **S-02** — betragsabhängige Preisregel mit Deckel, bevor kleine Forderungen beauftragt werden können.
6. **D1** — echtes Token, echter Code, Versuchsbegrenzung; `demoCode` aus dem API-Vertrag entfernen.
7. **S-06** — die fest verdrahtete Fall-ID beseitigen, sobald das Portal mehr als einen Fall kennt.
