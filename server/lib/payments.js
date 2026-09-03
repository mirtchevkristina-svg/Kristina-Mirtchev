'use strict';
// Zahlungsanbindung - bewusst als Platzhalter.
//
// Vor dem Anbinden zu klären (Kapitel 6, 9 und 11):
//   - Apple Pay und Google Pay als PRIMAERE Methoden, Karte nachrangig.
//     Manuelle Karteneingabe am Handy kostet Conversion (ANNAHME, in der Beta messen).
//   - Tatsächliche Konditionen gegen die Kostenannahme von EUR 1,50 je Kauf prüfen.
//   - Umsatzsteuerstatus VOR dem ersten Verkauf klären (Kleinunternehmergrenze).
//   - Keine automatische Verlängerung im Zyklus 1.
//
// Der Provider muss zwei Dinge liefern: eine Weiterleitungs-URL für den Kauf und
// einen signierten Rückkanal (Webhook), der die Bestellung als bezahlt meldet.
// Erst der Webhook darf freischalten - nie die Rückkehr des Browsers.

module.exports = {
  mock: {
    async checkout(order) { return { redirectUrl: null, sofortBezahlt: true, ref: 'mock:' + order.id }; },
    verifyWebhook() { throw new Error('mock hat keinen Webhook'); }
  }
  // stripe: { async checkout(order) {...}, verifyWebhook(req) {...} }
};
