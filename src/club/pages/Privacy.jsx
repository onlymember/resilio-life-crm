// /privacidad — Política de privacidad del Club (pública, es/en).
// Los datos del responsable están en LEGAL: si cambian, se cambian acá.
import React from 'react'
import { Link } from 'react-router-dom'
import { useLang, getLang } from '../i18n.js'
import { LangToggle } from '../components/chrome.jsx'

export const PRIVACY_VERSION = '2026-09-30'
const LEGAL = {
  name: 'Resilio',
  city: 'Rosario, Santa Fe, Argentina',
  email: 'resiliolife@gmail.com',
}

const ES = {
  title: 'Política de privacidad',
  updated: 'Última actualización: 30 de septiembre de 2026',
  back: 'Volver',
  sections: [
    ['Quién es responsable de tus datos',
      `${LEGAL.name}, con domicilio en ${LEGAL.city}, es responsable de los datos personales que se recogen en Resilio Club (club.resilio.company). Para cualquier consulta sobre tus datos escribinos a ${LEGAL.email}.`],
    ['Qué datos recogemos',
      'Los que nos das al sumarte o al completar tu perfil: nombre y apellido, usuario de Instagram, email, WhatsApp, ciudad o ciudades de interés, temas y el mensaje que quieras dejarnos. También lo que hacés dentro del Club: las ofertas que marcás con "Me interesa", las invitaciones que enviás y las respuestas a las confirmaciones de colaboraciones. Tu contraseña se guarda cifrada y no la podemos ver.'],
    ['Para qué los usamos',
      'Para evaluar tu perfil y decidir tu ingreso a la red; para mostrarte ofertas de las ciudades que elegiste; para contactarte por WhatsApp, email o Instagram por colaboraciones con marcas; para organizar y dar seguimiento a esas colaboraciones; y para mantener la seguridad de tu cuenta. No usamos tus datos para publicidad de terceros.'],
    ['Base legal',
      'Tratamos tus datos con tu consentimiento libre, expreso e informado, que das al marcar la casilla de aceptación, conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina. Podés retirarlo cuando quieras escribiéndonos.'],
    ['Con quién los compartimos',
      'Con el equipo de Resilio que gestiona la red. Con una marca solo cuando hay una colaboración concreta, y solo los datos necesarios para coordinarla. Con proveedores que nos prestan servicios de infraestructura (base de datos y hosting), que pueden estar ubicados fuera de Argentina y tratan los datos solo por cuenta nuestra. No vendemos ni alquilamos tus datos.'],
    ['Cuánto tiempo los guardamos',
      'Mientras formes parte de la red o mantengamos un vínculo con vos, y después el tiempo necesario para cumplir obligaciones legales. Si pedís la baja, eliminamos o anonimizamos tus datos, salvo los que debamos conservar por ley.'],
    ['Tus derechos',
      `Podés acceder a tus datos, pedir que los rectifiquemos, actualicemos o eliminemos, y retirar tu consentimiento, escribiendo a ${LEGAL.email}. El acceso es gratuito en intervalos no inferiores a seis meses, salvo interés legítimo (art. 14, inc. 3, Ley 25.326). Nombre, Instagram y WhatsApp los podés cambiar vos desde tu perfil; el cambio de email lo aprueba el equipo.`],
    ['Autoridad de control',
      'La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.'],
    ['Si vivís fuera de Argentina',
      'Si estás en la Unión Europea o en otro país con su propia ley de datos, tenés además los derechos que esa ley te reconoce (por ejemplo, oposición, limitación y portabilidad) y podés reclamar ante tu autoridad local. Para ejercerlos, escribinos al mismo email.'],
    ['Seguridad',
      'Usamos conexiones cifradas, contraseñas cifradas y controles de acceso para que cada persona del equipo vea solo lo que necesita. Ningún sistema es infalible: si detectamos un problema que afecte tus datos, te vamos a avisar.'],
    ['Edad',
      'El Club está pensado para personas mayores de 18 años. Si sos menor, no te registres.'],
    ['Cookies y almacenamiento',
      'Solo guardamos en tu navegador lo necesario para mantener tu sesión iniciada y recordar tu idioma. No usamos cookies de publicidad ni de seguimiento de terceros.'],
    ['Cambios',
      'Si cambiamos esta política, vamos a publicar la nueva versión en esta página con su fecha, y si el cambio es importante te lo vamos a avisar.'],
  ],
}

const EN = {
  title: 'Privacy policy',
  updated: 'Last updated: September 30, 2026',
  back: 'Back',
  sections: [
    ['Who is responsible for your data',
      `${LEGAL.name}, based in ${LEGAL.city}, is responsible for the personal data collected in Resilio Club (club.resilio.company). For any question about your data, write to ${LEGAL.email}.`],
    ['What data we collect',
      'What you give us when you join or complete your profile: full name, Instagram username, email, WhatsApp, city or cities of interest, topics and any message you leave. Also what you do in the Club: offers you mark as "Interested", invitations you send and your answers to collaboration confirmations. Your password is stored encrypted and we cannot see it.'],
    ['What we use it for',
      'To review your profile and decide on your admission to the network; to show you offers in the cities you chose; to contact you by WhatsApp, email or Instagram about brand collaborations; to organize and follow up those collaborations; and to keep your account secure. We do not use your data for third-party advertising.'],
    ['Legal basis',
      'We process your data with your free, express and informed consent, given when you tick the acceptance box, under Argentine Personal Data Protection Law No. 25,326. You can withdraw it at any time by writing to us.'],
    ['Who we share it with',
      'With the Resilio team that manages the network. With a brand only when there is a specific collaboration, and only the data needed to coordinate it. With infrastructure providers (database and hosting) that may be located outside Argentina and process data only on our behalf. We never sell or rent your data.'],
    ['How long we keep it',
      'While you are part of the network or we have a relationship with you, and afterwards for as long as needed to meet legal obligations. If you ask to leave, we delete or anonymize your data, except what we must keep by law.'],
    ['Your rights',
      `You can access your data, ask us to correct, update or delete it, and withdraw your consent by writing to ${LEGAL.email}. Access is free at intervals of no less than six months, unless there is a legitimate interest (sec. 14, Law 25,326). You can change your name, Instagram and WhatsApp yourself from your profile; email changes are approved by the team.`],
    ['Supervisory authority',
      "Argentina's Agency for Access to Public Information (AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA), as the supervisory body of Law No. 25,326, handles complaints from anyone whose data protection rights have been affected."],
    ['If you live outside Argentina',
      'If you are in the European Union or another country with its own data protection law, you also have the rights that law grants you (for example objection, restriction and portability) and you can complain to your local authority. To exercise them, write to the same email.'],
    ['Security',
      'We use encrypted connections, encrypted passwords and access controls so each team member only sees what they need. No system is perfect: if we detect a problem affecting your data, we will let you know.'],
    ['Age',
      'The Club is intended for people over 18. If you are under 18, please do not sign up.'],
    ['Cookies and storage',
      'We only store in your browser what is needed to keep you logged in and remember your language. We do not use advertising or third-party tracking cookies.'],
    ['Changes',
      'If we change this policy, we will publish the new version on this page with its date, and let you know if the change is significant.'],
  ],
}

export default function Privacy() {
  useLang()
  const d = getLang() === 'en' ? EN : ES
  return (
    <div className="club-wrap club-page" style={{ paddingTop: 24, paddingBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Link className="club-link" to="/" onClick={e => { if (window.history.length > 1) { e.preventDefault(); window.history.back() } }}>← {d.back}</Link>
        <LangToggle short/>
      </div>
      <h1>{d.title}</h1>
      <p className="muted" style={{ marginBottom: 20 }}>{d.updated}</p>
      {d.sections.map(([h, body]) => (
        <section key={h} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>{h}</h2>
          <p style={{ lineHeight: 1.6, color: 'var(--text-secondary)' }}>{body}</p>
        </section>
      ))}
    </div>
  )
}
