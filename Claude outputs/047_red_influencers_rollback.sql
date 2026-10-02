-- ═══════════════════════════════════════════════════════════
-- 047 · ROLLBACK · deshace la red de influencers
--
-- Deja la base como estaba antes de la 047. BORRA los datos de la red
-- (cuentas, invitaciones, leads, ofertas, tipos de oferta y votos). No toca ninguna ficha
-- del CRM: las fichas creadas al aprobar leads quedan como fichas normales.
--
-- Las cuentas de influencer en auth.users NO se borran acá. Sin
-- influencer_accounts no ven nada; si se quieren eliminar, desde
-- Authentication → Users en el dashboard.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Storage: se quitan las policies. El bucket 'offers' se borra solo si
-- está vacío (si tiene fotos, vaciarlo antes desde Storage en el dashboard).
DROP POLICY IF EXISTS offers_img_insert ON storage.objects;
DROP POLICY IF EXISTS offers_img_update ON storage.objects;
DROP POLICY IF EXISTS offers_img_delete ON storage.objects;
DELETE FROM storage.buckets b
 WHERE b.id = 'offers'
   AND NOT EXISTS (SELECT 1 FROM storage.objects o WHERE o.bucket_id = 'offers');

DROP FUNCTION IF EXISTS
  red_conversion(timestamptz,timestamptz),
  my_interests(), vote_offer(uuid,text), my_feed(uuid,boolean,integer), feed_cities(),
  mark_feed_seen(),
  update_my_profile(text,text,text,text,uuid[],text[]), my_profile(),
  accept_invitation(text), reject_lead(uuid,text), approve_lead(uuid,uuid),
  submit_lead(text,jsonb), check_invitation(text), my_invitations(),
  create_invitation(text,uuid,text),
  notify_direction(text,text,text,text,uuid), notify_team(uuid,text,text,text,text,uuid),
  new_invitation_token(), find_influencer_by_keys(text,text,uuid),
  norm_email(text), norm_instagram(text),
  app_require_influencer(), app_my_influencer_id(), red_limits();

DROP TABLE IF EXISTS offer_interests, offers, influencer_leads, invitations,
                     influencer_profile_changes, influencer_preferences,
                     influencer_accounts, offer_types CASCADE;

DROP FUNCTION IF EXISTS offers_mark_activated(), app_can_manage_offers(), app_is_team_member();

-- handle_new_user() exactamente como estaba (volcado del 2026-09-28).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO profiles (id, email, nombre, username, estado)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    split_part(NEW.email, '@', 1),
    'pendiente'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $function$;

COMMIT;
