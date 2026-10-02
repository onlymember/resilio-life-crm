// ═══════════════════════════════════════════════════════════
// Textos de partners.resilio.company (propuesta privada para marcas).
//
// TODO lo que la marca lee está acá, en es / en / pt. Para cambiar un
// texto, cambiarlo en los tres idiomas.
//
// Las respuestas se guardan con CLAVES fijas (sell, trial, both, 5-10…),
// no con el texto: así Network las muestra igual sin importar en qué
// idioma respondió la marca.
// ═══════════════════════════════════════════════════════════

// Dominio público. Se puede pisar con VITE_PARTNERS_URL (deploy de preview).
export const PARTNERS_URL = (import.meta.env.VITE_PARTNERS_URL || 'https://partners.resilio.company').replace(/\/$/, '')

// Contacto que aparece en la página. Si WHATSAPP queda vacío, el botón
// de WhatsApp no se muestra. Formato internacional sin + ni espacios.
export const CONTACT = {
  email: 'resiliolife@gmail.com',
  whatsapp: '',
  instagram: 'resilio.life',
}

export const LANGS = ['es', 'en', 'pt']

// Claves que acepta la base (059). El orden es el de las tarjetas.
export const PLAN_KEYS = ['esencial', 'crecimiento', 'ecosistema']
export const ADVISE_KEY = 'asesoria'

export const OPTION_KEYS = {
  goal: ['sell', 'awareness', 'launch', 'community'],
  start: ['trial', 'this_month', 'next_month', 'later'],
  networks: ['instagram', 'tiktok', 'both'],
  creators_per_week: ['3-5', '5-10', '10-20'],
}

const es = {
  htmlLang: 'es',
  docTitle: 'Propuesta · Resilio Life',
  hello: 'Hola,',
  h1: 'Construimos y potenciamos marcas,', h2: 'experiencias e ideas que la gente elige y vive,', h3: 'creando comunidades que las sostienen.',
  intro: 'Somos un ecosistema creativo: agencia, producción de eventos, experiencias, red de creadores y comunidad, todo en un mismo lugar. Conectamos a tu marca con audiencias reales, dentro y fuera de las redes.',
  marquee: ['Contenido', 'Creadores', 'Eventos', 'Activaciones', 'Comunidad', 'Estrategia', 'Branding'],
  svcLbl: 'Qué podemos hacer por tu marca', svcTitle: 'Todo lo que tu marca necesita para que la elijan.',
  services: [
    ['Contenido y creadores', 'Creadores de nuestra red producen contenido real para tu marca: visitas, grabación, edición y publicación pensadas para cada red.'],
    ['Eventos y activaciones', 'Lanzamientos, experiencias y activaciones donde tu marca se vive, no solo se ve.'],
    ['Comunidad y beneficios', 'Llevamos tu marca a una comunidad activa, con beneficios que generan visitas y vuelven a traer clientes.'],
    ['Estrategia y branding', 'Definimos qué decir, a quién y dónde, para que cada acción sume a la misma idea de marca.'],
  ],
  howLbl: 'Cómo trabajamos', howTitle: 'Nosotros coordinamos todo.',
  how: [
    ['Entendemos tu marca', 'Objetivos, público y lo que hoy funciona y no.'],
    ['Diseñamos el plan', 'Elegimos creadores, formatos y calendario.'],
    ['Producimos y activamos', 'Grabamos, editamos, publicamos y lanzamos.'],
    ['Medimos y ajustamos', 'Te mostramos resultados y mejoramos cada ciclo.'],
  ],
  planLbl: 'Formas de trabajar juntos', planTitle: 'Elegí cómo querés empezar.',
  planNote: 'Cada plan se ajusta a tus objetivos antes de empezar. Los valores son a medida y te los enviamos en privado.',
  recommended: 'Recomendado', idealFor: 'Ideal para', pick: 'Elegir este plan', picked: 'Plan elegido',
  plans: [
    { name: 'Esencial', tier: 'Básico', desc: 'Contenido constante y profesional desde el primer mes.',
      ideal: 'Marcas que quieren contenido real todas las semanas sin armar un equipo propio.', plus: '',
      groups: [
        ['Creadores', ['Selección de creadores de nuestra red según tu público', 'Visitas programadas a tu local o con tu producto']],
        ['Producción', ['Idea y guion de cada pieza', 'Grabación y edición profesional']],
        ['Entrega', ['Reels y TikToks listos para publicar en tus redes', 'Calendario de visitas y entregas']],
      ] },
    { name: 'Crecimiento', tier: 'Estándar', desc: 'Llegar a nuevas audiencias y convertirlas en clientes.',
      ideal: 'Marcas que ya tienen contenido y quieren más alcance y más ventas.', plus: 'Todo lo de Esencial, más:',
      groups: [
        ['Difusión', ['Publicación en las redes de cada creador, frente a su comunidad', 'Influencer Activation: campañas con varios creadores a la vez']],
        ['Pauta', ['Paid Media: pautamos el contenido que mejor funciona para multiplicar el alcance']],
        ['Seguimiento', ['Resultados de cada campaña y ajustes para la siguiente']],
      ] },
    { name: 'Ecosistema', tier: 'Premium', desc: 'Tu marca se vive en redes y en persona.',
      ideal: 'Marcas que quieren una presencia completa: contenido, experiencias y comunidad.', plus: 'Todo lo de Crecimiento, más:',
      groups: [
        ['Producción premium', ['Fotógrafo y filmmaker profesional', 'Usage Rights: derechos para usar el contenido en tu pauta y tus canales']],
        ['Experiencias', ['Eventos, lanzamientos y activaciones', 'Tu marca en la comunidad Resilio, con beneficios para sus miembros']],
        ['Acompañamiento', ['Estrategia y branding durante todo el plan']],
      ] },
  ],
  adviseTitle: 'Asesórenme', adviseText: 'No sé cuál elegir. Con tus respuestas te recomendamos el plan indicado.',
  qLbl: 'Cinco preguntas rápidas', qTitle: 'Contanos un poco más.', qSub: 'Menos de un minuto. Con esto armamos tu propuesta final.',
  q: {
    goal: '¿Cuál es tu objetivo principal?',
    start: '¿Cuándo te gustaría empezar?',
    networks: '¿En qué redes querés estar?',
    creators_per_week: '¿Con cuántos creadores te gustaría colaborar por semana?',
    notes: '¿Algo que debamos saber?',
  },
  opt: {
    goal: ['Vender más', 'Que nos conozcan', 'Lanzar algo nuevo', 'Crear comunidad'],
    start: ['Una semana de prueba', 'Este mes', 'El mes que viene', 'Más adelante'],
    networks: ['Instagram', 'TikTok', 'Ambas'],
    creators_per_week: ['3 a 5', '5 a 10', '10 a 20'],
  },
  notesPh: 'Fechas clave, productos, referencias…',
  pickFirst: 'Elegí un plan para continuar.', chosen: 'Elegiste:', cta: 'Quiero avanzar', ctaAdvise: 'Quiero que me asesoren', sending: 'Enviando…',
  sendError: 'No se pudo enviar. Revisá tu conexión y probá de nuevo.',
  doneTitle: '¡Listo! Ya estamos en marcha.', doneLine: 'Recibimos tu elección: {p}.', doneNext: 'Te enviamos la propuesta final con valores por privado muy pronto.', edit: 'Cambiar respuestas',
  firstLbl: 'Primeros pasos', firstTitle: 'De acá a tu primer contenido.',
  first: ['Elegís el plan y respondés las preguntas.', 'Te enviamos la propuesta final con valores.', 'Confirmás y agendamos el inicio.', 'Armamos el calendario y elegimos a los creadores.', 'Arrancamos a producir.'],
  faqLbl: 'Preguntas frecuentes', faqTitle: 'Lo que suelen preguntarnos.',
  faqs: [
    ['¿Por qué no hay precios?', 'Porque cada plan se arma a medida de tu marca y tus objetivos. Con tus respuestas te enviamos la propuesta final con valores, por privado.'],
    ['¿Puedo empezar con una prueba?', 'Sí. Elegí "Una semana de prueba" en las preguntas y lo armamos juntos.'],
    ['¿Puedo cambiar de plan después?', 'Sí. El plan se ajusta según los resultados; lo hablamos antes de cada nuevo ciclo.'],
    ['¿Trabajan con marcas de otros países?', 'Sí. Contanos dónde está tu público y coordinamos creadores y producción para ese mercado.'],
  ],
  igLbl: 'Algunas de las cosas que hacemos', igTitle: 'Están en nuestro Instagram.',
  endLbl: 'Último paso', endTitle: '¿Empezamos,',
  endPick: 'Elegí el plan que más te sirva y respondé cinco preguntas. Te enviamos la propuesta final en privado.',
  endAnswer: 'Ya elegiste {p}. Solo faltan las preguntas para enviarte la propuesta final.',
  endDone: 'Ya recibimos tu elección. Te escribimos muy pronto.',
  endCtaPick: 'Elegir mi plan', endCtaAnswer: 'Responder y avanzar', endCtaDone: 'Ver mi elección',
  whatsapp: 'Hablar por WhatsApp',
  footer: 'Creative Company & Entertainment',
  expiredTitle: 'Este link ya no está disponible.', expiredText: 'Puede que haya vencido. Escribinos y te mandamos uno nuevo.',
  homeTitle: 'Propuestas privadas para marcas.', homeText: 'Si recibiste un link de Resilio Life, abrilo desde el mensaje. Si no, escribinos.',
  contact: 'Escribinos', langLabel: 'Idioma',
}

const en = {
  htmlLang: 'en',
  docTitle: 'Proposal · Resilio Life',
  hello: 'Hi,',
  h1: 'We build and grow brands,', h2: 'experiences and ideas people choose and live,', h3: 'creating the communities that keep them alive.',
  intro: 'We are a creative ecosystem: agency, event production, experiences, a creator network and a community, all in one place. We connect your brand with real audiences, on and off social media.',
  marquee: ['Content', 'Creators', 'Events', 'Activations', 'Community', 'Strategy', 'Branding'],
  svcLbl: 'What we can do for your brand', svcTitle: 'Everything your brand needs to be chosen.',
  services: [
    ['Content & creators', 'Creators from our network produce real content for your brand: visits, filming, editing and posting built for each platform.'],
    ['Events & activations', 'Launches, experiences and activations where your brand is lived, not just seen.'],
    ['Community & perks', 'We bring your brand to an active community, with perks that drive visits and repeat customers.'],
    ['Strategy & branding', 'We define what to say, to whom and where, so every action builds the same brand idea.'],
  ],
  howLbl: 'How we work', howTitle: 'We handle everything.',
  how: [
    ['We learn your brand', 'Goals, audience, what works today and what does not.'],
    ['We design the plan', 'Creators, formats and calendar.'],
    ['We produce and launch', 'Filming, editing, posting and activations.'],
    ['We measure and improve', 'Clear results and a better plan every cycle.'],
  ],
  planLbl: 'Ways to work together', planTitle: 'Choose how you want to start.',
  planNote: 'Every plan is tailored to your goals before we start. Pricing is custom and sent to you privately.',
  recommended: 'Recommended', idealFor: 'Best for', pick: 'Choose this plan', picked: 'Plan selected',
  plans: [
    { name: 'Essential', tier: 'Basic', desc: 'Steady, professional content from the first month.',
      ideal: 'Brands that want real content every week without building an in-house team.', plus: '',
      groups: [
        ['Creators', ['Creators from our network matched to your audience', 'Scheduled visits to your venue or with your product']],
        ['Production', ['Concept and script for every piece', 'Professional filming and editing']],
        ['Delivery', ['Reels and TikToks ready to post on your channels', 'Visit and delivery calendar']],
      ] },
    { name: 'Growth', tier: 'Standard', desc: 'Reach new audiences and turn them into customers.',
      ideal: 'Brands that already have content and want more reach and more sales.', plus: 'Everything in Essential, plus:',
      groups: [
        ['Distribution', ['Posting on each creator’s channels, in front of their community', 'Influencer Activation: campaigns with several creators at once']],
        ['Paid', ['Paid Media: we boost the best-performing content to multiply reach']],
        ['Follow-up', ['Results for every campaign and improvements for the next one']],
      ] },
    { name: 'Ecosystem', tier: 'Premium', desc: 'Your brand, lived online and in person.',
      ideal: 'Brands that want a full presence: content, experiences and community.', plus: 'Everything in Growth, plus:',
      groups: [
        ['Premium production', ['Professional photographer and filmmaker', 'Usage Rights: use the content in your ads and channels']],
        ['Experiences', ['Events, launches and activations', 'Your brand inside the Resilio community, with perks for its members']],
        ['Guidance', ['Strategy and branding throughout the plan']],
      ] },
  ],
  adviseTitle: 'Advise me', adviseText: 'Not sure which one? Your answers help us recommend the right plan.',
  qLbl: 'Five quick questions', qTitle: 'Tell us a bit more.', qSub: 'Under a minute. We use this to build your final proposal.',
  q: {
    goal: 'What is your main goal?',
    start: 'When would you like to start?',
    networks: 'Which platforms?',
    creators_per_week: 'How many creators would you like to work with per week?',
    notes: 'Anything we should know?',
  },
  opt: {
    goal: ['Sell more', 'Get known', 'Launch something new', 'Build community'],
    start: ['A one-week trial', 'This month', 'Next month', 'Later on'],
    networks: ['Instagram', 'TikTok', 'Both'],
    creators_per_week: ['3 to 5', '5 to 10', '10 to 20'],
  },
  notesPh: 'Key dates, products, references…',
  pickFirst: 'Choose a plan to continue.', chosen: 'You chose:', cta: 'Move forward', ctaAdvise: 'I want advice', sending: 'Sending…',
  sendError: 'Could not send. Check your connection and try again.',
  doneTitle: 'Done! We are on it.', doneLine: 'We got your choice: {p}.', doneNext: 'We will send your final proposal with pricing privately very soon.', edit: 'Change answers',
  firstLbl: 'First steps', firstTitle: 'From here to your first content.',
  first: ['You choose a plan and answer the questions.', 'We send the final proposal with pricing.', 'You confirm and we schedule the start.', 'We build the calendar and pick the creators.', 'We start producing.'],
  faqLbl: 'FAQ', faqTitle: 'What brands usually ask.',
  faqs: [
    ['Why are there no prices?', 'Because every plan is built around your brand and goals. With your answers we send you the final proposal with pricing, privately.'],
    ['Can I start with a trial?', 'Yes. Pick "A one-week trial" in the questions and we will set it up together.'],
    ['Can I change plans later?', 'Yes. The plan adapts to results; we review it before every new cycle.'],
    ['Do you work with brands in other countries?', 'Yes. Tell us where your audience is and we coordinate creators and production for that market.'],
  ],
  igLbl: 'Some of what we do', igTitle: 'Lives on our Instagram.',
  endLbl: 'Last step', endTitle: 'Shall we start,',
  endPick: 'Choose the plan that fits you best and answer five questions. We will send your final proposal privately.',
  endAnswer: 'You chose {p}. Just the questions left and we will send your final proposal.',
  endDone: 'We got your choice. We will be in touch very soon.',
  endCtaPick: 'Choose my plan', endCtaAnswer: 'Answer and move forward', endCtaDone: 'See my choice',
  whatsapp: 'Chat on WhatsApp',
  footer: 'Creative Company & Entertainment',
  expiredTitle: 'This link is no longer available.', expiredText: 'It may have expired. Write to us and we will send you a new one.',
  homeTitle: 'Private proposals for brands.', homeText: 'If you received a link from Resilio Life, open it from that message. Otherwise, write to us.',
  contact: 'Write to us', langLabel: 'Language',
}

const pt = {
  htmlLang: 'pt',
  docTitle: 'Proposta · Resilio Life',
  hello: 'Olá,',
  h1: 'Construímos e potencializamos marcas,', h2: 'experiências e ideias que as pessoas escolhem e vivem,', h3: 'criando comunidades que as sustentam.',
  intro: 'Somos um ecossistema criativo: agência, produção de eventos, experiências, rede de criadores e comunidade, tudo em um só lugar. Conectamos sua marca a públicos reais, dentro e fora das redes.',
  marquee: ['Conteúdo', 'Criadores', 'Eventos', 'Ativações', 'Comunidade', 'Estratégia', 'Branding'],
  svcLbl: 'O que podemos fazer pela sua marca', svcTitle: 'Tudo o que sua marca precisa para ser escolhida.',
  services: [
    ['Conteúdo e criadores', 'Criadores da nossa rede produzem conteúdo real para sua marca: visitas, gravação, edição e publicação pensadas para cada rede.'],
    ['Eventos e ativações', 'Lançamentos, experiências e ativações onde sua marca é vivida, não só vista.'],
    ['Comunidade e benefícios', 'Levamos sua marca a uma comunidade ativa, com benefícios que geram visitas e recompra.'],
    ['Estratégia e branding', 'Definimos o que dizer, para quem e onde, para que cada ação some à mesma ideia de marca.'],
  ],
  howLbl: 'Como trabalhamos', howTitle: 'Nós coordenamos tudo.',
  how: [
    ['Entendemos sua marca', 'Objetivos, público e o que funciona hoje.'],
    ['Desenhamos o plano', 'Criadores, formatos e calendário.'],
    ['Produzimos e ativamos', 'Gravação, edição, publicação e lançamentos.'],
    ['Medimos e ajustamos', 'Resultados claros e um plano melhor a cada ciclo.'],
  ],
  planLbl: 'Formas de trabalhar juntos', planTitle: 'Escolha como quer começar.',
  planNote: 'Cada plano é ajustado aos seus objetivos antes de começar. Os valores são sob medida e enviados em privado.',
  recommended: 'Recomendado', idealFor: 'Ideal para', pick: 'Escolher este plano', picked: 'Plano escolhido',
  plans: [
    { name: 'Essencial', tier: 'Básico', desc: 'Conteúdo constante e profissional desde o primeiro mês.',
      ideal: 'Marcas que querem conteúdo real toda semana sem montar uma equipe própria.', plus: '',
      groups: [
        ['Criadores', ['Seleção de criadores da nossa rede de acordo com seu público', 'Visitas programadas ao seu local ou com seu produto']],
        ['Produção', ['Ideia e roteiro de cada peça', 'Gravação e edição profissional']],
        ['Entrega', ['Reels e TikToks prontos para publicar nas suas redes', 'Calendário de visitas e entregas']],
      ] },
    { name: 'Crescimento', tier: 'Padrão', desc: 'Alcançar novos públicos e transformá-los em clientes.',
      ideal: 'Marcas que já têm conteúdo e querem mais alcance e mais vendas.', plus: 'Tudo do Essencial, mais:',
      groups: [
        ['Divulgação', ['Publicação nas redes de cada criador, para a comunidade dele', 'Influencer Activation: campanhas com vários criadores ao mesmo tempo']],
        ['Mídia paga', ['Paid Media: impulsionamos o conteúdo que melhor funciona']],
        ['Acompanhamento', ['Resultados de cada campanha e ajustes para a próxima']],
      ] },
    { name: 'Ecossistema', tier: 'Premium', desc: 'Sua marca vivida nas redes e ao vivo.',
      ideal: 'Marcas que querem presença completa: conteúdo, experiências e comunidade.', plus: 'Tudo do Crescimento, mais:',
      groups: [
        ['Produção premium', ['Fotógrafo e filmmaker profissional', 'Usage Rights: direitos para usar o conteúdo nos seus anúncios e canais']],
        ['Experiências', ['Eventos, lançamentos e ativações', 'Sua marca na comunidade Resilio, com benefícios para os membros']],
        ['Acompanhamento', ['Estratégia e branding durante todo o plano']],
      ] },
  ],
  adviseTitle: 'Quero orientação', adviseText: 'Não sabe qual escolher? Com suas respostas recomendamos o plano ideal.',
  qLbl: 'Cinco perguntas rápidas', qTitle: 'Conte um pouco mais.', qSub: 'Menos de um minuto. Com isso montamos sua proposta final.',
  q: {
    goal: 'Qual é o seu objetivo principal?',
    start: 'Quando gostaria de começar?',
    networks: 'Em quais redes?',
    creators_per_week: 'Com quantos criadores gostaria de colaborar por semana?',
    notes: 'Algo que devemos saber?',
  },
  opt: {
    goal: ['Vender mais', 'Ser conhecida', 'Lançar algo novo', 'Criar comunidade'],
    start: ['Uma semana de teste', 'Este mês', 'Mês que vem', 'Mais adiante'],
    networks: ['Instagram', 'TikTok', 'Ambas'],
    creators_per_week: ['3 a 5', '5 a 10', '10 a 20'],
  },
  notesPh: 'Datas importantes, produtos, referências…',
  pickFirst: 'Escolha um plano para continuar.', chosen: 'Você escolheu:', cta: 'Quero avançar', ctaAdvise: 'Quero orientação', sending: 'Enviando…',
  sendError: 'Não foi possível enviar. Verifique sua conexão e tente de novo.',
  doneTitle: 'Pronto! Já estamos em movimento.', doneLine: 'Recebemos sua escolha: {p}.', doneNext: 'Enviaremos a proposta final com valores em privado muito em breve.', edit: 'Alterar respostas',
  firstLbl: 'Primeiros passos', firstTitle: 'Daqui até o seu primeiro conteúdo.',
  first: ['Você escolhe o plano e responde às perguntas.', 'Enviamos a proposta final com valores.', 'Você confirma e agendamos o início.', 'Montamos o calendário e escolhemos os criadores.', 'Começamos a produzir.'],
  faqLbl: 'Perguntas frequentes', faqTitle: 'O que as marcas costumam perguntar.',
  faqs: [
    ['Por que não há preços?', 'Porque cada plano é montado sob medida para sua marca e seus objetivos. Com suas respostas enviamos a proposta final com valores, em privado.'],
    ['Posso começar com um teste?', 'Sim. Escolha "Uma semana de teste" nas perguntas e montamos juntos.'],
    ['Posso mudar de plano depois?', 'Sim. O plano se ajusta aos resultados; revisamos antes de cada novo ciclo.'],
    ['Trabalham com marcas de outros países?', 'Sim. Conte onde está seu público e coordenamos criadores e produção para esse mercado.'],
  ],
  igLbl: 'Algumas das coisas que fazemos', igTitle: 'Estão no nosso Instagram.',
  endLbl: 'Último passo', endTitle: 'Vamos começar,',
  endPick: 'Escolha o plano que mais combina com você e responda cinco perguntas. Enviamos a proposta final em privado.',
  endAnswer: 'Você escolheu {p}. Só faltam as perguntas para enviarmos a proposta final.',
  endDone: 'Recebemos sua escolha. Falamos com você muito em breve.',
  endCtaPick: 'Escolher meu plano', endCtaAnswer: 'Responder e avançar', endCtaDone: 'Ver minha escolha',
  whatsapp: 'Falar no WhatsApp',
  footer: 'Creative Company & Entertainment',
  expiredTitle: 'Este link não está mais disponível.', expiredText: 'Pode ter expirado. Escreva para nós e enviamos um novo.',
  homeTitle: 'Propostas privadas para marcas.', homeText: 'Se você recebeu um link da Resilio Life, abra pela mensagem. Se não, escreva para nós.',
  contact: 'Fale conosco', langLabel: 'Idioma',
}

export const COPY = { es, en, pt }

// Navegador → idioma (para la página sin link).
export const guessLang = (nav = typeof navigator !== 'undefined' ? navigator.language : 'es') => {
  const l = String(nav || '').slice(0, 2).toLowerCase()
  return LANGS.includes(l) ? l : 'es'
}

// ── Respuestas: estado de pantalla ⇄ lo que guarda la base ────────
// Estado: { goal: 0..3|null, start, networks, creators_per_week, notes }
export function toAnswers(state) {
  const out = {}
  for (const k of Object.keys(OPTION_KEYS)) {
    const i = state?.[k]
    if (Number.isInteger(i) && OPTION_KEYS[k][i]) out[k] = OPTION_KEYS[k][i]
  }
  const notes = String(state?.notes || '').trim()
  if (notes) out.notes = notes.slice(0, 1500)
  return out
}

export function fromAnswers(answers) {
  const st = { notes: answers?.notes || '' }
  for (const k of Object.keys(OPTION_KEYS)) {
    const i = OPTION_KEYS[k].indexOf(answers?.[k])
    st[k] = i >= 0 ? i : null
  }
  return st
}

// Texto legible de una respuesta guardada, en el idioma pedido (Network: es).
export function answerLabel(key, value, lang = 'es') {
  const i = OPTION_KEYS[key]?.indexOf(value) ?? -1
  return i >= 0 ? COPY[lang].opt[key][i] : (value || '')
}

export function planLabel(plan, lang = 'es') {
  if (plan === ADVISE_KEY) return COPY[lang].adviseTitle
  const i = PLAN_KEYS.indexOf(plan)
  return i >= 0 ? COPY[lang].plans[i].name : ''
}
