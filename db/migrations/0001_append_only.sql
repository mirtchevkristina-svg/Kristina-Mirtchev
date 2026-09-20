-- Append-only-Schutz fuer die unveraenderlichen Tabellen.
--
-- Die Anwendung bietet fuer diese Tabellen ohnehin nur ein Anhaengen an.
-- Dieser Trigger schuetzt zusaetzlich gegen jeden direkten Zugriff - ein
-- Datenbankwerkzeug, ein Skript, ein versehentliches UPDATE in einer
-- Migration. Ohne ihn waere die Unveraenderlichkeit eine Vereinbarung,
-- keine Eigenschaft.
--
-- CLAUDE.md 1.9: Audit-Zeilen werden nie aktualisiert oder geloescht.

CREATE OR REPLACE FUNCTION fp_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'Tabelle %.% ist append-only: % ist nicht zulaessig',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_events_append_only ON audit_events;
CREATE TRIGGER audit_events_append_only
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION fp_reject_mutation();

DROP TRIGGER IF EXISTS claim_events_append_only ON claim_events;
CREATE TRIGGER claim_events_append_only
  BEFORE UPDATE OR DELETE ON claim_events
  FOR EACH ROW EXECUTE FUNCTION fp_reject_mutation();

DROP TRIGGER IF EXISTS claim_status_history_append_only ON claim_status_history;
CREATE TRIGGER claim_status_history_append_only
  BEFORE UPDATE OR DELETE ON claim_status_history
  FOR EACH ROW EXECUTE FUNCTION fp_reject_mutation();

-- Aktenzeichen aus einer Sequenz, nicht aus einer Arraylaenge.
-- Nach einem Neustart wird nie eine Nummer erneut vergeben.
CREATE SEQUENCE IF NOT EXISTS claim_reference_seq START 1000;

-- Betragsspalten muessen ganzzahlig sein (CLAUDE.md 1.6).
-- Die Pruefung ist bewusst breit: sie faellt auch bei einer kuenftigen
-- Tabelle auf, die versehentlich numeric oder double precision verwendet.
DO $$
DECLARE
  offending record;
BEGIN
  FOR offending IN
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name LIKE '%_cents' OR column_name LIKE '%amount%')
      AND data_type NOT IN ('bigint', 'integer', 'smallint')
  LOOP
    RAISE EXCEPTION
      'Betragsspalte %.% hat den Typ % - Geldbetraege muessen ganzzahlige Cent sein',
      offending.table_name, offending.column_name, offending.data_type;
  END LOOP;
END;
$$;
