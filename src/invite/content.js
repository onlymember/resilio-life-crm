// Textos de la invitación a la red (partners.resilio.company/i/<token>).
// Cada clave se puede pisar desde Network (Plantillas › Invitación a la
// red), por idioma, sin tocar código: app_settings 'influencer_invite_texts'
// = { es: { clave: texto }, en: {…}, pt: {…}, contact: { whatsapp } }.
// {city}, {name}, {end}: se completan en la página.

export const LANGS = ['es', 'en', 'pt']

export const CATEGORY_KEYS = ['gastronomia', 'moda', 'belleza', 'lifestyle', 'fitness', 'viajes',
  'musica', 'arte', 'deportes', 'tecnologia', 'maternidad', 'mascotas']

// Claves que Dirección puede editar, en el orden en que aparecen.
export const EDITABLE = [
  ['hero', ['kicker', 'hello', 'lead', 'leadNoCity']],
  ['gain', ['gainLbl', 'gainTitleA', 'gainTitleB', 'card1t', 'card1s', 'card2t', 'card2s', 'card3t', 'card3s', 'card4t', 'card4s', 'card5t', 'card5s']],
  ['how', ['howLbl', 'howTitleA', 'howTitleB', 'step1t', 'step1s', 'step2t', 'step2s', 'step3t', 'step3s', 'step4t', 'step4s', 'chooseT', 'chooseS']],
  ['ask', ['askLbl', 'askTitleA', 'askTitleB', 'ask1', 'ask2', 'ask3', 'ask4']],
  ['join', ['joinLbl', 'joinTitleA', 'joinTitleB', 'consent', 'privacy', 'joinBtn', 'fab']],
  ['end', ['doneKick', 'doneTitle', 'doneText', 'declineTitle', 'declineText', 'underTitle', 'underText']],
  ['whatsapp', ['waA', 'waB', 'doubtsMsg']],
]

export const COPY = {
  es: {
    kicker: 'Invitación personal',
    hello: 'Hola,',
    lead: 'Te invitamos a formar parte de la red de creadores de Resilio en {city}.',
    leadNoCity: 'Te invitamos a formar parte de la red de creadores de Resilio.',
    ticker: ['Gastronomía', 'Moda', 'Belleza', 'Eventos', 'Bienestar', 'Lifestyle', 'Experiencias'],

    gainLbl: 'Qué ganás',
    gainTitleA: 'Conectamos creadores',
    gainTitleB: 'con marcas de tu ciudad.',
    card1t: 'Colaboraciones', card1s: 'Con marcas elegidas para tu perfil y tu estilo.',
    card2t: 'Experiencias',   card2s: 'Lugares, productos y servicios para vivir y contar.',
    card3t: 'Eventos',        card3s: 'Aperturas, lanzamientos y encuentros de la red.',
    card4t: 'Comunidad',      card4s: 'Creadores de tu ciudad, en un mismo lugar.',
    card5t: 'Acceso anticipado', card5s: 'A la app de Resilio Club, muy pronto.',

    howLbl: 'Cómo funciona',
    howTitleA: 'Simple, en',
    howTitleB: 'cuatro pasos.',
    step1t: 'Te sumás',                    step1s: 'En menos de un minuto, desde acá.',
    step2t: 'Te proponemos marcas',        step2s: 'Las que van con tu perfil.',
    step3t: 'Vas, creás y publicás',       step3s: 'Contenido tuyo, a tu manera.',
    step4t: 'Llegan nuevas colaboraciones', step4s: 'Cuanto más participás, más te proponemos.',
    chooseT: 'Siempre elegís vos.',
    chooseS: 'Nada es obligatorio.',

    askLbl: 'Qué te pedimos',
    askTitleA: 'Poco, y',
    askTitleB: 'claro.',
    ask1: 'Contenido honesto',
    ask2: 'Etiquetar a la marca y a Resilio',
    ask3: 'Cumplir la fecha acordada',
    ask4: 'Avisar si no podés ir',

    joinLbl: 'Último paso',
    joinTitleA: '¿Te sumás',
    joinTitleB: 'a la red?',
    isYou: 'Sos vos',
    notYou: '¿No sos vos?',
    igLabel: 'Tu Instagram',
    city: 'Ciudad',
    cityPh: 'Tu ciudad',
    cats: '¿Qué te interesa?',
    wa: 'WhatsApp',
    waEnd: 'Termina en {end}',
    waChange: 'Cambiar',
    waPh: '+54 9 341 …',
    birth: 'Nacimiento',
    consent: 'Acepto que Resilio use estos datos para proponerme colaboraciones.',
    privacy: 'Tus datos solo los ve el equipo de Resilio.',
    privacyLink: 'Política de privacidad',
    joinBtn: 'Me sumo',
    sending: 'Enviando…',
    notNow: 'Ahora no',
    fab: 'Quiero sumarme',
    doubts: 'Tengo dudas',
    doubtsMsg: 'Hola, vi la invitación de Resilio y tengo una duda.',
    langLabel: 'Idioma',

    doneKick: 'Ya sos parte',
    doneTitle: 'Te damos la bienvenida,',
    doneText: 'Te vamos a escribir por WhatsApp cuando tengamos una propuesta para vos.',
    declineTitle: 'Gracias,',
    declineText: 'Si cambiás de idea o tenés alguna duda, escribinos.',
    changeMind: 'Cambié de idea',
    write: 'Escribir',
    underTitle: 'Gracias por tu interés.',
    underText: 'Por ahora la red es solo para mayores de 18 años.',
    expiredTitle: 'Este link venció.',
    expiredText: 'Pedí uno nuevo a quien te lo mandó.',
    notFoundTitle: 'No encontramos esta invitación.',
    notFoundText: 'Revisá que el link esté completo.',
    loading: 'Cargando…',

    errors: {
      no_consent: 'Falta aceptar el uso de datos.',
      bad_birthdate: 'Revisá la fecha de nacimiento.',
      no_categories: 'Elegí al menos un rubro.',
      expired: 'Este link venció.',
      generic: 'No se pudo enviar. Probá de nuevo en un momento.',
    },
    categories: {
      gastronomia: 'Gastronomía', moda: 'Moda', belleza: 'Belleza', lifestyle: 'Lifestyle', fitness: 'Fitness',
      viajes: 'Viajes', musica: 'Música', arte: 'Arte', deportes: 'Deportes', tecnologia: 'Tecnología',
      maternidad: 'Maternidad', mascotas: 'Mascotas',
    },

    // Mensajes de WhatsApp (los manda el equipo desde Network). A y B se alternan solos.
    waA: 'Hola {nombre}! Te escribimos de Resilio. Nos encanta tu contenido y queremos invitarte a nuestra red de creadores en {ciudad}. Acá está tu invitación: {link}',
    waB: 'Hola {nombre}! Estamos armando la red de creadores de Resilio en {ciudad} y nos encantaría que seas parte. Mirá tu invitación acá: {link}',
  },

  en: {
    kicker: 'Personal invitation',
    hello: 'Hi,',
    lead: 'We’d like you to join the Resilio creator network in {city}.',
    leadNoCity: 'We’d like you to join the Resilio creator network.',
    ticker: ['Food', 'Fashion', 'Beauty', 'Events', 'Wellness', 'Lifestyle', 'Experiences'],

    gainLbl: 'What you get',
    gainTitleA: 'We connect creators',
    gainTitleB: 'with brands in your city.',
    card1t: 'Collaborations', card1s: 'With brands picked for your profile and style.',
    card2t: 'Experiences',    card2s: 'Places, products and services to live and share.',
    card3t: 'Events',         card3s: 'Openings, launches and network meetups.',
    card4t: 'Community',      card4s: 'Creators from your city, in one place.',
    card5t: 'Early access',   card5s: 'To the Resilio Club app, coming soon.',

    howLbl: 'How it works',
    howTitleA: 'Simple, in',
    howTitleB: 'four steps.',
    step1t: 'You join',                   step1s: 'In under a minute, right here.',
    step2t: 'We suggest brands',          step2s: 'The ones that fit your profile.',
    step3t: 'You go, create and post',    step3s: 'Your content, your way.',
    step4t: 'New collaborations arrive',  step4s: 'The more you take part, the more we suggest.',
    chooseT: 'You always choose.',
    chooseS: 'Nothing is mandatory.',

    askLbl: 'What we ask',
    askTitleA: 'Little, and',
    askTitleB: 'clear.',
    ask1: 'Honest content',
    ask2: 'Tag the brand and Resilio',
    ask3: 'Keep the agreed date',
    ask4: 'Let us know if you can’t make it',

    joinLbl: 'Last step',
    joinTitleA: 'Will you join',
    joinTitleB: 'the network?',
    isYou: 'That’s you',
    notYou: 'Not you?',
    igLabel: 'Your Instagram',
    city: 'City',
    cityPh: 'Your city',
    cats: 'What are you into?',
    wa: 'WhatsApp',
    waEnd: 'Ends in {end}',
    waChange: 'Change',
    waPh: '+1 …',
    birth: 'Date of birth',
    consent: 'I agree that Resilio may use this data to offer me collaborations.',
    privacy: 'Only the Resilio team sees your data.',
    privacyLink: 'Privacy policy',
    joinBtn: 'I’m in',
    sending: 'Sending…',
    notNow: 'Not now',
    fab: 'I want to join',
    doubts: 'Questions?',
    doubtsMsg: 'Hi, I saw the Resilio invitation and I have a question.',
    langLabel: 'Language',

    doneKick: 'You’re in',
    doneTitle: 'Welcome to the network,',
    doneText: 'We’ll message you on WhatsApp when we have a proposal for you.',
    declineTitle: 'Thank you,',
    declineText: 'If you change your mind or have any questions, write to us.',
    changeMind: 'I changed my mind',
    write: 'Write to us',
    underTitle: 'Thanks for your interest.',
    underText: 'For now the network is only for people 18 and over.',
    expiredTitle: 'This link has expired.',
    expiredText: 'Ask whoever sent it for a new one.',
    notFoundTitle: 'We couldn’t find this invitation.',
    notFoundText: 'Check that the link is complete.',
    loading: 'Loading…',

    errors: {
      no_consent: 'Please accept the data use.',
      bad_birthdate: 'Check your date of birth.',
      no_categories: 'Pick at least one topic.',
      expired: 'This link has expired.',
      generic: 'Couldn’t send. Please try again in a moment.',
    },
    categories: {
      gastronomia: 'Food', moda: 'Fashion', belleza: 'Beauty', lifestyle: 'Lifestyle', fitness: 'Fitness',
      viajes: 'Travel', musica: 'Music', arte: 'Art', deportes: 'Sports', tecnologia: 'Tech',
      maternidad: 'Parenting', mascotas: 'Pets',
    },
    waA: 'Hi {nombre}! This is Resilio. We love your content and would like to invite you to our creator network in {ciudad}. Here’s your invitation: {link}',
    waB: 'Hi {nombre}! We’re building the Resilio creator network in {ciudad} and would love for you to be part of it. See your invitation here: {link}',
  },

  pt: {
    kicker: 'Convite pessoal',
    hello: 'Oi,',
    lead: 'Queremos te convidar para a rede de criadores da Resilio em {city}.',
    leadNoCity: 'Queremos te convidar para a rede de criadores da Resilio.',
    ticker: ['Gastronomia', 'Moda', 'Beleza', 'Eventos', 'Bem-estar', 'Lifestyle', 'Experiências'],

    gainLbl: 'O que você ganha',
    gainTitleA: 'Conectamos criadores',
    gainTitleB: 'com marcas da sua cidade.',
    card1t: 'Colaborações', card1s: 'Com marcas escolhidas para o seu perfil e estilo.',
    card2t: 'Experiências', card2s: 'Lugares, produtos e serviços para viver e contar.',
    card3t: 'Eventos',      card3s: 'Inaugurações, lançamentos e encontros da rede.',
    card4t: 'Comunidade',   card4s: 'Criadores da sua cidade, em um só lugar.',
    card5t: 'Acesso antecipado', card5s: 'Ao app Resilio Club, em breve.',

    howLbl: 'Como funciona',
    howTitleA: 'Simples, em',
    howTitleB: 'quatro passos.',
    step1t: 'Você entra',                 step1s: 'Em menos de um minuto, por aqui.',
    step2t: 'Sugerimos marcas',           step2s: 'As que combinam com o seu perfil.',
    step3t: 'Você vai, cria e publica',   step3s: 'Conteúdo seu, do seu jeito.',
    step4t: 'Chegam novas colaborações',  step4s: 'Quanto mais você participa, mais sugerimos.',
    chooseT: 'Você sempre escolhe.',
    chooseS: 'Nada é obrigatório.',

    askLbl: 'O que pedimos',
    askTitleA: 'Pouco, e',
    askTitleB: 'claro.',
    ask1: 'Conteúdo honesto',
    ask2: 'Marcar a marca e a Resilio',
    ask3: 'Cumprir a data combinada',
    ask4: 'Avisar se não puder ir',

    joinLbl: 'Último passo',
    joinTitleA: 'Vamos juntos',
    joinTitleB: 'nessa rede?',
    isYou: 'É você',
    notYou: 'Não é você?',
    igLabel: 'Seu Instagram',
    city: 'Cidade',
    cityPh: 'Sua cidade',
    cats: 'O que te interessa?',
    wa: 'WhatsApp',
    waEnd: 'Termina em {end}',
    waChange: 'Alterar',
    waPh: '+55 …',
    birth: 'Nascimento',
    consent: 'Aceito que a Resilio use estes dados para me propor colaborações.',
    privacy: 'Só a equipe da Resilio vê seus dados.',
    privacyLink: 'Política de privacidade',
    joinBtn: 'Quero entrar',
    sending: 'Enviando…',
    notNow: 'Agora não',
    fab: 'Quero participar',
    doubts: 'Dúvidas?',
    doubtsMsg: 'Oi, vi o convite da Resilio e tenho uma dúvida.',
    langLabel: 'Idioma',

    doneKick: 'Você já faz parte',
    doneTitle: 'Boas-vindas à rede,',
    doneText: 'Vamos te escrever no WhatsApp quando tivermos uma proposta para você.',
    declineTitle: 'Obrigado,',
    declineText: 'Se mudar de ideia ou tiver alguma dúvida, fale com a gente.',
    changeMind: 'Mudei de ideia',
    write: 'Escrever',
    underTitle: 'Obrigado pelo interesse.',
    underText: 'Por enquanto a rede é só para maiores de 18 anos.',
    expiredTitle: 'Este link expirou.',
    expiredText: 'Peça um novo para quem te enviou.',
    notFoundTitle: 'Não encontramos este convite.',
    notFoundText: 'Confira se o link está completo.',
    loading: 'Carregando…',

    errors: {
      no_consent: 'Falta aceitar o uso de dados.',
      bad_birthdate: 'Confira a data de nascimento.',
      no_categories: 'Escolha pelo menos um tema.',
      expired: 'Este link expirou.',
      generic: 'Não foi possível enviar. Tente de novo em um momento.',
    },
    categories: {
      gastronomia: 'Gastronomia', moda: 'Moda', belleza: 'Beleza', lifestyle: 'Lifestyle', fitness: 'Fitness',
      viajes: 'Viagens', musica: 'Música', arte: 'Arte', deportes: 'Esportes', tecnologia: 'Tecnologia',
      maternidad: 'Maternidade', mascotas: 'Pets',
    },
    waA: 'Oi {nombre}! Aqui é a Resilio. Adoramos seu conteúdo e queremos te convidar para a nossa rede de criadores em {ciudad}. Seu convite: {link}',
    waB: 'Oi {nombre}! Estamos montando a rede de criadores da Resilio em {ciudad} e adoraríamos ter você. Veja seu convite: {link}',
  },
}

// Textos de un idioma con lo que haya editado Dirección encima.
export function textsFor(lang, overrides) {
  const base = COPY[lang] || COPY.es
  const o = (overrides && typeof overrides === 'object' && overrides[lang]) || {}
  const out = { ...base }
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === 'string' && v.trim() && typeof base[k] === 'string') out[k] = v
  }
  return out
}

export const fill = (s, vars = {}) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))

// Mensaje de WhatsApp para mandar la invitación (Network).
// Sin ciudad, saca " en {ciudad}" para que no quede "en ." colgando.
export function inviteMessage({ lang = 'es', variant = 'a', name = '', city = '', link = '', overrides } = {}) {
  const T = textsFor(lang, overrides)
  let s = variant === 'b' ? T.waB : T.waA
  if (!city) s = s.replace(/\s+(en|in|em)\s+\{ciudad\}/g, '')
  const first = String(name || '').trim().split(/\s+/)[0] || ''
  return fill(s, { nombre: first, ciudad: city, link }).replace(/\s+!/g, '!').replace(/^(Hola|Hi|Oi) !/, '$1!')
}

export const guessLang = () => {
  try {
    const n = (navigator.language || 'es').slice(0, 2).toLowerCase()
    return LANGS.includes(n) ? n : null
  } catch { return null }
}
