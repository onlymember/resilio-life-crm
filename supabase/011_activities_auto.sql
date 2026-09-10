-- ═══════════════════════════════════════════════════════════
-- 011 · Actividades automáticas + audit de campos sensibles
-- El timeline (spec §26) se llena solo. Si depende de que alguien
-- registre a mano, queda vacío y las métricas mienten.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_activity_auto()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_type  TEXT;
  v_title TEXT;
  v_ent   TEXT := TG_ARGV[0];
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_type  := 'created';
    v_title := format('%s creado', initcap(v_ent));
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_type  := 'status_change';
    v_title := format('Estado: %s → %s', OLD.status, NEW.status);
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activities (actor_id, entity_type, entity_id, type, title, metadata)
  VALUES (
    COALESCE(auth.uid(), NEW.created_by),
    v_ent, NEW.id, v_type, v_title,
    CASE WHEN TG_OP = 'UPDATE'
         THEN jsonb_build_object('from', OLD.status, 'to', NEW.status)
         ELSE '{}'::jsonb END
  );
  RETURN NEW;
END $fn$;

CREATE TRIGGER trg_act_influencer AFTER INSERT OR UPDATE ON influencers
FOR EACH ROW EXECUTE FUNCTION log_activity_auto('influencer');
CREATE TRIGGER trg_act_brand AFTER INSERT OR UPDATE ON brands
FOR EACH ROW EXECUTE FUNCTION log_activity_auto('brand');
CREATE TRIGGER trg_act_opportunity AFTER INSERT OR UPDATE ON opportunities
FOR EACH ROW EXECUTE FUNCTION log_activity_auto('opportunity');
CREATE TRIGGER trg_act_campaign AFTER INSERT OR UPDATE ON campaigns
FOR EACH ROW EXECUTE FUNCTION log_activity_auto('campaign');
CREATE TRIGGER trg_act_collaboration AFTER INSERT OR UPDATE ON collaborations
FOR EACH ROW EXECUTE FUNCTION log_activity_auto('collaboration');

-- Audit de cambios financieros y borrados
CREATE OR REPLACE FUNCTION audit_sensitive()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF TG_OP = 'DELETE'
     OR NEW.budget IS DISTINCT FROM OLD.budget
     OR NEW.amount IS DISTINCT FROM OLD.amount THEN
    INSERT INTO audit_log (actor_id, actor_email, action, entity_type,
                           entity_id, old_value, new_value)
    VALUES (auth.uid(),
            (SELECT email FROM profiles WHERE id = auth.uid()),
            lower(TG_OP), TG_TABLE_NAME,
            COALESCE(NEW.id, OLD.id)::text,
            to_jsonb(OLD),
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $fn$;

CREATE TRIGGER trg_audit_campaigns AFTER UPDATE OR DELETE ON campaigns
FOR EACH ROW EXECUTE FUNCTION audit_sensitive();
CREATE TRIGGER trg_audit_collabs AFTER UPDATE OR DELETE ON collaborations
FOR EACH ROW EXECUTE FUNCTION audit_sensitive();
