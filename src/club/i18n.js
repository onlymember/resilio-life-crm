// Textos del Club en español e inglés. El idioma sale del navegador
// (en* → inglés, el resto → español) y la influencer lo puede cambiar;
// la elección se recuerda en este dispositivo.
import { useSyncExternalStore } from 'react'

const es = {
  brand: 'Resilio Club',
  tagline: 'La red curada de influencers de Resilio',
  sub: 'Red de influencers',
  common: {
    loading: 'Cargando…', save: 'Guardar', saving: 'Guardando…', saved: 'Guardado',
    back: 'Volver', logout: 'Cerrar sesión', copy: 'Copiar link', copied: 'Copiado',
    whatsapp: 'Enviar por WhatsApp', optional: 'opcional', retry: 'Reintentar',
    language: 'English',
  },
  nav: { feed: 'Ofertas', interests: 'Mis intereses', invite: 'Invitar', profile: 'Perfil' },
  fields: {
    name: 'Nombre y apellido', instagram: 'Usuario de Instagram', email: 'Email',
    whatsapp: 'WhatsApp (con código de país)', city: 'Ciudad', cities: 'Ciudades que te interesan',
    categories: 'Tus temas', message: '¿Por qué te interesa sumarte?', password: 'Contraseña',
    passwordNew: 'Nueva contraseña', passwordHint: 'Mínimo 8 caracteres.',
  },
  categories: {
    moda: 'Moda', belleza: 'Belleza', gastronomia: 'Gastronomía', viajes: 'Viajes',
    fitness: 'Fitness', lifestyle: 'Lifestyle', musica: 'Música', arte: 'Arte',
    tecnologia: 'Tecnología', deportes: 'Deportes', maternidad: 'Maternidad', mascotas: 'Mascotas',
  },
  join: {
    invitedBy: 'Te invitó {name}',
    title: 'Sumate a la red',
    intro: 'Resilio Club es una red curada: cada perfil lo revisa nuestro equipo.',
    consent: 'Acepto que Resilio guarde estos datos para evaluar mi perfil y, si corresponde, contactarme.',
    privacyLink: 'Ver la política de privacidad',
    submit: 'Enviar solicitud',
    sentTitle: 'Recibimos tu solicitud',
    sentBody: 'Gracias por tu interés en Resilio Club.',
    closedTitle: 'Acceso solo por invitación',
    closedBody: 'Para sumarte a Resilio Club necesitás un link de invitación vigente de alguien de la red.',
  },
  activate: {
    title: 'Activá tu acceso',
    intro: 'Creá tu cuenta para entrar a Resilio Club.',
    haveAccount: 'Ya tengo cuenta',
    newAccount: 'Crear cuenta',
    create: 'Crear cuenta',
    enter: 'Entrar y activar',
    checkEmailTitle: 'Revisá tu email',
    checkEmailBody: 'Te mandamos un link a {email}. Abrilo desde este dispositivo para terminar de activar tu acceso.',
    activating: 'Activando tu acceso…',
  },
  login: {
    title: 'Entrar', submit: 'Entrar', forgot: 'Olvidé mi contraseña',
    noAccount: '¿Todavía no sos parte? El acceso es solo por invitación.',
  },
  forgot: {
    title: 'Recuperar contraseña', submit: 'Enviar link',
    sent: 'Si ese email tiene cuenta, te llega un link para crear una contraseña nueva.',
  },
  reset: { title: 'Nueva contraseña', submit: 'Guardar contraseña', done: 'Listo, ya podés usar tu nueva contraseña.' },
  feed: {
    searchCity: 'Buscar ciudad…', allCountries: 'Todos los países',
    title: 'Ofertas', all: 'Todas', mine: 'Mis ciudades', new: 'Nueva',
    interested: 'Me interesa', notInterested: 'No me interesa',
    emptyTitle: 'Estás al día',
    emptyBody: 'No hay ofertas nuevas por acá. Probá con otra ciudad o volvé más tarde.',
    chooseCities: 'Elegí tus ciudades en el perfil para ver primero lo que te queda cerca.',
  },
  interests: {
    title: 'Mis intereses',
    intro: 'Las ofertas que marcaste. El equipo gestiona cada una.',
    registered: 'Interés registrado', ended: 'Finalizada',
    empty: 'Todavía no marcaste ninguna oferta.',
  },
  invite: {
    title: 'Invitar a alguien',
    intro: 'Tu invitación llega con tu nombre. El equipo revisa cada perfil.',
    left: 'Te quedan {n} invitaciones este mes.',
    hint: '¿A quién? (para acordarte)',
    generate: 'Generar invitación',
    message: 'Te invito a Resilio Club, la red de influencers de Resilio. Completá tu perfil acá:',
    history: 'Tus invitaciones',
    state: { pending: 'Sin usar', used: 'Usada', expired: 'Vencida', revoked: 'Anulada' },
    none: 'Todavía no invitaste a nadie.',
  },
  profile: { title: 'Tu perfil', intro: 'Estos datos los ve el equipo de Resilio.',
    searchCity: 'Buscar ciudad…', addTopic: 'Agregar un tema', add: 'Agregar',
    changePassword: 'Cambiar contraseña', changeEmail: 'Cambiar mail', newEmail: 'Nuevo mail',
    requestEmail: 'Pedir cambio', emailPending: 'Pediste cambiar tu mail a {email}. Lo tiene que autorizar Resilio.',
    emailSent: 'Listo, Resilio va a revisar tu pedido.', passwordSaved: 'Contraseña actualizada.',
    emailLocked: 'Para cambiarlo usá "Cambiar mail" más abajo.' },
  blocked: {
    title: 'Tu acceso no está activo',
    body: 'Si creés que es un error, escribile a quien te invitó.',
  },
  confirm: {
    title: 'Confirmá tu visita', hi: 'Hola {name}!', intro: 'Te esperan en {brand} para la colaboración:',
    at: 'a las {time}', yes: 'Confirmo, voy', other: 'Proponer otra fecha', no: 'No puedo ir',
    newDate: 'Fecha', newTime: 'Hora (opcional)', note: 'Mensaje (opcional)', send: 'Enviar',
    doneConfirmed: '¡Listo! Te esperamos. Si algo cambia, escribile a tu contacto de Resilio.',
    doneProposed: 'Listo, le avisamos a Resilio la fecha que propusiste. Te confirman por WhatsApp.',
    doneDeclined: 'Listo, le avisamos a Resilio. ¡Gracias por avisar!',
    answered: 'Esta colaboración ya fue respondida. Si necesitás cambiar algo, escribile a tu contacto de Resilio.',
    expired: 'Este link venció. Pedile uno nuevo a tu contacto de Resilio.',
    invalid: 'Este link no es válido.',
  },
  errors: {
    generic: 'Algo salió mal. Probá de nuevo.',
    link_invalid: 'Este link ya no es válido. Pedile uno nuevo a quien te invitó.',
    name_required: 'Falta el nombre.',
    instagram_invalid: 'Revisá el usuario de Instagram.',
    email_invalid: 'Revisá el email.',
    whatsapp_invalid: 'El WhatsApp va con código de país, por ejemplo +5491122334455.',
    consent_required: 'Hace falta aceptar el uso de tus datos.',
    access_inactive: 'Tu acceso no está activo.',
    interest_quota: 'Ya marcaste el máximo de ofertas de esta semana. Elegí las que más te interesan.',
    invite_quota: 'Ya usaste tus invitaciones de este mes.',
    invite_forbidden: 'No podés crear invitaciones.',
    offer_unavailable: 'Esta oferta ya no está disponible.',
    vote_locked: 'Ya registramos tu respuesta para esta oferta.',
    contact_taken: 'Ese dato ya está registrado. Si es tuyo, escribinos.',
    team_account: 'Este email es de una cuenta del equipo de Resilio. Usá otro email.',
    already_active: 'Tu cuenta ya está activa.',
    already_activated: 'Este acceso ya fue activado.',
    login_required: 'Iniciá sesión primero.',
    invalid_credentials: 'Email o contraseña incorrectos.',
    user_already_exists: 'Ese email ya tiene cuenta. Entrá con "Ya tengo cuenta".',
    weak_password: 'La contraseña es muy corta o muy simple.',
    email_not_confirmed: 'Todavía no confirmaste tu email. Revisá tu casilla.',
    over_email_send_rate_limit: 'Demasiados intentos. Esperá unos minutos.',
    password_short: 'La contraseña tiene que tener al menos 8 caracteres.',
    email_same: 'Es el mismo mail que ya tenés.',
    bad_date: 'Elegí una fecha desde hoy.', already: 'Esta colaboración ya fue respondida.', expired: 'Este link venció.',
    email_requires_approval: 'El cambio de mail lo autoriza Resilio.',
  },
}

const en = {
  brand: 'Resilio Club',
  tagline: "Resilio's curated influencer network",
  sub: 'Influencer network',
  common: {
    loading: 'Loading…', save: 'Save', saving: 'Saving…', saved: 'Saved',
    back: 'Back', logout: 'Log out', copy: 'Copy link', copied: 'Copied',
    whatsapp: 'Send via WhatsApp', optional: 'optional', retry: 'Try again',
    language: 'Español',
  },
  nav: { feed: 'Offers', interests: 'My interests', invite: 'Invite', profile: 'Profile' },
  fields: {
    name: 'Full name', instagram: 'Instagram username', email: 'Email',
    whatsapp: 'WhatsApp (with country code)', city: 'City', cities: 'Cities you care about',
    categories: 'Your topics', message: 'Why do you want to join?', password: 'Password',
    passwordNew: 'New password', passwordHint: 'At least 8 characters.',
  },
  categories: {
    moda: 'Fashion', belleza: 'Beauty', gastronomia: 'Food', viajes: 'Travel',
    fitness: 'Fitness', lifestyle: 'Lifestyle', musica: 'Music', arte: 'Art',
    tecnologia: 'Tech', deportes: 'Sports', maternidad: 'Parenting', mascotas: 'Pets',
  },
  join: {
    invitedBy: '{name} invited you',
    title: 'Join the network',
    intro: 'Resilio Club is a curated network: our team reviews every profile.',
    consent: 'I agree that Resilio stores this data to review my profile and, if appropriate, contact me.',
    privacyLink: 'Read the privacy policy',
    submit: 'Send request',
    sentTitle: 'We got your request',
    sentBody: 'Thanks for your interest in Resilio Club.',
    closedTitle: 'Invitation only',
    closedBody: 'To join Resilio Club you need a valid invitation link from someone in the network.',
  },
  activate: {
    title: 'Activate your access',
    intro: 'Create your account to enter Resilio Club.',
    haveAccount: 'I already have an account',
    newAccount: 'Create account',
    create: 'Create account',
    enter: 'Log in and activate',
    checkEmailTitle: 'Check your email',
    checkEmailBody: 'We sent a link to {email}. Open it on this device to finish activating your access.',
    activating: 'Activating your access…',
  },
  login: {
    title: 'Log in', submit: 'Log in', forgot: 'Forgot my password',
    noAccount: 'Not a member yet? Access is by invitation only.',
  },
  forgot: {
    title: 'Reset password', submit: 'Send link',
    sent: 'If that email has an account, you will get a link to set a new password.',
  },
  reset: { title: 'New password', submit: 'Save password', done: 'Done, you can now use your new password.' },
  feed: {
    searchCity: 'Search city…', allCountries: 'All countries',
    title: 'Offers', all: 'All', mine: 'My cities', new: 'New',
    interested: "I'm interested", notInterested: 'Not for me',
    emptyTitle: "You're all caught up",
    emptyBody: 'No new offers here. Try another city or come back later.',
    chooseCities: 'Pick your cities in your profile to see nearby offers first.',
  },
  interests: {
    title: 'My interests',
    intro: 'The offers you marked. Our team manages each one.',
    registered: 'Interest registered', ended: 'Ended',
    empty: "You haven't marked any offers yet.",
  },
  invite: {
    title: 'Invite someone',
    intro: 'Your invitation carries your name. Our team reviews every profile.',
    left: '{n} invitations left this month.',
    hint: 'Who is it for? (as a reminder)',
    generate: 'Create invitation',
    message: "You're invited to Resilio Club, Resilio's influencer network. Complete your profile here:",
    history: 'Your invitations',
    state: { pending: 'Unused', used: 'Used', expired: 'Expired', revoked: 'Revoked' },
    none: "You haven't invited anyone yet.",
  },
  profile: { title: 'Your profile', intro: 'The Resilio team can see this information.',
    searchCity: 'Search city…', addTopic: 'Add a topic', add: 'Add',
    changePassword: 'Change password', changeEmail: 'Change email', newEmail: 'New email',
    requestEmail: 'Request change', emailPending: 'You asked to change your email to {email}. Resilio has to approve it.',
    emailSent: 'Done, Resilio will review your request.', passwordSaved: 'Password updated.',
    emailLocked: 'To change it use "Change email" below.' },
  blocked: {
    title: 'Your access is not active',
    body: 'If you think this is a mistake, contact the person who invited you.',
  },
  confirm: {
    title: 'Confirm your visit', hi: 'Hi {name}!', intro: '{brand} is expecting you for the collaboration:',
    at: 'at {time}', yes: "I confirm, I'll be there", other: 'Suggest another date', no: "I can't make it",
    newDate: 'Date', newTime: 'Time (optional)', note: 'Message (optional)', send: 'Send',
    doneConfirmed: "Done! See you there. If anything changes, message your Resilio contact.",
    doneProposed: 'Done, we let Resilio know the date you suggested. They will confirm on WhatsApp.',
    doneDeclined: 'Done, we let Resilio know. Thanks for telling us!',
    answered: 'This collaboration was already answered. If you need to change something, message your Resilio contact.',
    expired: 'This link has expired. Ask your Resilio contact for a new one.',
    invalid: 'This link is not valid.',
  },
  errors: {
    generic: 'Something went wrong. Please try again.',
    link_invalid: 'This link is no longer valid. Ask the person who invited you for a new one.',
    name_required: 'Name is required.',
    instagram_invalid: 'Check the Instagram username.',
    email_invalid: 'Check the email.',
    whatsapp_invalid: 'WhatsApp needs the country code, e.g. +5491122334455.',
    consent_required: 'You need to accept the use of your data.',
    access_inactive: 'Your access is not active.',
    interest_quota: "You've reached this week's limit. Pick the offers you like most.",
    invite_quota: "You've used this month's invitations.",
    invite_forbidden: "You can't create invitations.",
    offer_unavailable: 'This offer is no longer available.',
    vote_locked: 'We already registered your answer for this offer.',
    contact_taken: 'That information is already registered. If it is yours, contact us.',
    team_account: 'This email belongs to a Resilio team account. Use another email.',
    already_active: 'Your account is already active.',
    already_activated: 'This access was already activated.',
    login_required: 'Please log in first.',
    invalid_credentials: 'Wrong email or password.',
    user_already_exists: 'That email already has an account. Use "I already have an account".',
    weak_password: 'The password is too short or too simple.',
    email_not_confirmed: "You haven't confirmed your email yet. Check your inbox.",
    over_email_send_rate_limit: 'Too many attempts. Wait a few minutes.',
    password_short: 'The password must be at least 8 characters.',
    email_same: 'That is already your email.',
    bad_date: 'Pick a date from today on.', already: 'This collaboration was already answered.', expired: 'This link has expired.',
    email_requires_approval: 'Resilio has to approve email changes.',
  },
}

const DICTS = { es, en }
const KEY = 'resilio.club.lang'
const listeners = new Set()

const initial = () => {
  try { const s = localStorage.getItem(KEY); if (s && DICTS[s]) return s } catch { /* sin storage */ }
  return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es'
}
let lang = initial()

export const getLang = () => lang
export const setLang = (l) => {
  lang = DICTS[l] ? l : 'es'
  try { localStorage.setItem(KEY, lang) } catch { /* sin storage */ }
  document.documentElement.lang = lang
  listeners.forEach(fn => fn())
}
export const useLang = () => useSyncExternalStore(
  (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
  () => lang,
)

export const t = (key, vars = {}) => {
  const raw = key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), DICTS[lang])
    ?? key.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), es)
  if (typeof raw !== 'string') return raw ?? key
  return raw.replace(/\{(\w+)\}/g, (_, v) => (vars[v] ?? ''))
}

// Mensaje para un error de la API: por clave (HINT o código de Auth).
export const errText = (e) => {
  const k = e?.key || e?.code
  const m = k && DICTS[lang].errors[k]
  return m || DICTS[lang].errors.generic
}

export const CATEGORY_KEYS = Object.keys(es.categories)
