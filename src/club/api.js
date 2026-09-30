// Todo lo que la app de influencers le pide a la base.
// La influencer NUNCA lee tablas del CRM: solo llama a las funciones de
// la migración 047, que devuelven campos públicos. Las únicas lecturas
// directas son catálogos (ciudades, tipos) y aun así con fallback.
import { supabase } from './supabase.js'

// Error con la clave estable que manda la base en HINT (link_invalid,
// interest_quota, …). La pantalla traduce por la clave, no por el texto.
export class ClubError extends Error {
  constructor(error) {
    super(error?.message || 'error')
    this.key  = error?.hint || null
    this.code = error?.code || null
  }
}
const call = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new ClubError(error)
  return data
}

// ── Invitación y formulario (sin sesión) ────────────────────
export const checkInvitation = (token) => call('check_invitation', { p_token: token })
export const submitLead      = (token, data) => call('submit_lead', { p_token: token, p_data: data })

// ── Cuenta ──────────────────────────────────────────────────
export const acceptInvitation = (token) => call('accept_invitation', { p_token: token })

export const signUp = async ({ email, password, name, inviteToken }) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      // kind:'influencer' hace que el alta NO cree un perfil del CRM
      // (handle_new_user, migración 047).
      data: { kind: 'influencer', nombre: name?.trim() || '' },
      emailRedirectTo: `${window.location.origin}/activar?inv=${encodeURIComponent(inviteToken)}`,
    },
  })
  if (error) throw new ClubError(error)
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
  if (error) throw new ClubError(error)
  return data
}

export const signOut = () => supabase.auth.signOut()

export const requestReset = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/nueva-clave`,
  })
  if (error) throw new ClubError(error)
}

export const setNewPassword = async (password) => {
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw new ClubError(error)
}

// ── App ─────────────────────────────────────────────────────
export const myProfile     = () => call('my_profile')
export const updateProfile = (p) => call('update_my_profile', {
  p_name: p.name ?? null, p_instagram: p.instagram ?? null, p_email: p.email ?? null,
  p_whatsapp: p.whatsapp ?? null, p_city_ids: p.cityIds ?? null, p_categories: p.categories ?? null,
})
export const feedCities    = () => call('feed_cities')
export const myFeed        = ({ cityId = null, all = false } = {}) => call('my_feed', { p_city_id: cityId, p_all: all, p_limit: 50 })
export const markFeedSeen  = () => call('mark_feed_seen')
export const voteOffer     = (offerId, vote) => call('vote_offer', { p_offer_id: offerId, p_vote: vote })
export const myInterests   = () => call('my_interests')
export const myInvitations = () => call('my_invitations')
export const requestEmailChange = (email) => call('request_email_change', { p_new_email: email })
export const myEmailRequest     = () => call('my_email_request')
export const createInvite  = (hint) => call('create_invitation', { p_kind: 'join', p_target_influencer: null, p_hint: hint || null })

// Catálogo de ciudades. Si la base no deja leerlo (por ejemplo sin
// sesión), la pantalla cae a un campo de texto.
export const listCities = async () => {
  const { data, error } = await supabase.from('cities').select('id, name, country_id, countries(name)').order('name')
  if (error) return []
  return (data || []).map(c => ({ id: c.id, name: c.name, countryId: c.country_id, countryName: c.countries?.name || '' }))
}

export const offerImageUrl = (path) =>
  path ? supabase.storage.from('offers').getPublicUrl(path).data.publicUrl : null

export const joinLink = (token) => `${window.location.origin}/sumate?inv=${token}`

// ── Confirmación de visita (sin sesión, migración 050) ──────
export const getCollabConfirmation     = (token) => call('get_collab_confirmation', { p_token: token })
export const respondCollabConfirmation = (token, response, { date = null, time = null, note = null } = {}) =>
  call('respond_collab_confirmation', { p_token: token, p_response: response, p_date: date, p_time: time, p_note: note })
