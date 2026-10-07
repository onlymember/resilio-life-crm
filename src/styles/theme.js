// ═══════════════════════════════════════════════════════════
// Sistema visual de Resilio (tokens, base, animaciones, utilidades).
// Una sola fuente para el CRM/Network y para Resilio Club: los dos
// montan exactamente este CSS, así se ven iguales y un cambio acá
// vale para ambos.
// ═══════════════════════════════════════════════════════════
export const THEME_CSS = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary-violet: #8B5CF6;
      --primary-violet-dark: #7C3AED;
      --primary-violet-light: #A78BFA;
      --secondary-purple: #C084FC;
      --accent-magenta: #E879F9;
      --accent-pink: #F472B6;
      --accent-cyan: #22D3EE;
      --accent-gold: #FCD34D;
      --bg-primary: #0A0618;
      --bg-secondary: #120D24;
      --bg-tertiary: #1E1535;
      --text-primary: #F9FAFB;
      --text-secondary: #C9C4DA;
      --text-tertiary: #948FA8;
      --text-muted: #948FA8;
      --border-violet: rgba(139, 92, 246, 0.25);
      --glass-bg: rgba(18, 10, 40, 0.75);
      --card-solid-bg: rgba(30, 21, 53, 0.72);
      --glow-violet: 0 0 24px rgba(139, 92, 246, 0.55);
      --glow-violet-sm: 0 0 12px rgba(139, 92, 246, 0.35);
      --glow-magenta: 0 0 20px rgba(232, 121, 249, 0.4);
      --glow-cyan: 0 0 20px rgba(34, 211, 238, 0.4);
      --transition: 0.3s ease;
      --radius: 12px;
      --radius-lg: 16px;
      --radius-xl: 20px;
      --nebula-1: radial-gradient(ellipse 60% 50% at 15% 25%, rgba(139,92,246,0.07) 0%, transparent 60%);
      --nebula-2: radial-gradient(ellipse 50% 60% at 85% 75%, rgba(232,121,249,0.05) 0%, transparent 60%);
      --nebula-3: radial-gradient(ellipse 40% 40% at 50% 50%, rgba(34,211,238,0.03) 0%, transparent 50%);
      --ease-standard:  cubic-bezier(0.4, 0, 0.2, 1);
      --ease-emphasized: cubic-bezier(0.16, 1, 0.3, 1);
      --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
      --dur-fast:  150ms;
      --dur-base:  250ms;
      --dur-slow:  400ms;
    }
    [data-theme="light"] {
      --bg-primary: #F3F0FF; --bg-secondary: #EDE9FE; --bg-tertiary: #DDD6FE;
      --text-primary: #1E1B4B; --text-secondary: #4A4458; --text-tertiary: #635C78; --text-muted: #635C78;
      --glass-bg: rgba(237, 233, 254, 0.8); --border-violet: rgba(139, 92, 246, 0.4); --card-solid-bg: rgba(237, 233, 254, 0.9);
      --nebula-1: none; --nebula-2: none; --nebula-3: none;
    }
    html, body, #root { height: 100%; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg-primary); color: var(--text-primary); overflow-x: hidden; line-height: 1.5; -webkit-text-size-adjust: 100%; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg-secondary); }
    ::-webkit-scrollbar-thumb { background: var(--primary-violet-dark); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--primary-violet); }
    input, textarea, select { font-family: inherit; outline: none; border: none; background: transparent; color: var(--text-primary); font-size: 16px; }

    /* ── Controles nativos sobre fondo oscuro ──────────────────────
       El desplegable de un <select> lo dibuja el sistema operativo,
       no la página: hereda el color de texto (casi blanco) pero NO
       el fondo, que queda blanco. Resultado: blanco sobre blanco.
       Antes esto solo estaba cubierto por .select-field option, y
       Network no usa esa clase — usa estilos inline. La regla va por
       elemento, no por clase, para que valga también en lo que se
       escriba de acá en adelante. */
    select option, select optgroup { background-color: var(--bg-tertiary); color: var(--text-primary); }

    /* Que el navegador dibuje TODO lo nativo en oscuro: desplegables,
       calendario, autocompletado, sugerencias y barras. Sin esto, en
       algunos navegadores esas ventanas salen blancas con el texto
       claro de la app encima (blanco sobre blanco). */
    :root { color-scheme: dark; }
    [data-theme="light"] { color-scheme: light; }

    /* Ningún campo más ancho que su caja. En iPhone, fecha y hora
       tienen un ancho mínimo propio y se salían del margen. */
    input:not([type="checkbox"]):not([type="radio"]), select, textarea { max-width: 100%; min-width: 0; }
    input[type="date"], input[type="datetime-local"], input[type="time"], input[type="month"] {
      -webkit-appearance: none; appearance: none; display: block; min-height: 40px;
    }
    input::-webkit-date-and-time-value { text-align: left; }

    /* El ícono del calendario lo dibuja el navegador: con color-scheme
       (más abajo) ya sale claro en oscuro y oscuro en claro. */
    input[type="date"]::-webkit-calendar-picker-indicator,
    input[type="datetime-local"]::-webkit-calendar-picker-indicator,
    input[type="time"]::-webkit-calendar-picker-indicator,
    input[type="month"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.8; }

    /* Placeholder: sin esto queda el gris por defecto del navegador,
       pensado para fondo claro. */
    input::placeholder, textarea::placeholder { color: var(--text-muted); opacity: 1; }

    /* El autocompletado de Chrome pisa el fondo con blanco. */
    input:-webkit-autofill, input:-webkit-autofill:hover,
    input:-webkit-autofill:focus, textarea:-webkit-autofill, select:-webkit-autofill {
      -webkit-text-fill-color: var(--text-primary);
      -webkit-box-shadow: 0 0 0 1000px var(--bg-tertiary) inset;
      caret-color: var(--text-primary);
    }

    button { cursor: pointer; font-family: inherit; border: none; background: none; touch-action: manipulation; transition: background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard), opacity var(--dur-fast) var(--ease-standard); }
    button:active:not([disabled]) { transform: scale(0.97); transition: transform var(--dur-fast); }
    a { text-decoration: none; color: inherit; }
    @keyframes fadeIn     { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideIn    { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes pulse-glow { 0%, 100% { box-shadow: var(--glow-violet-sm); } 50% { box-shadow: var(--glow-violet); } }
    @keyframes spin       { to { transform: rotate(360deg); } }
    @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
    @keyframes aurora     { 0%,100%{opacity:.5;transform:translateX(0) scaleY(1)} 50%{opacity:1;transform:translateX(2%) scaleY(1.05)} }
    @keyframes starTwinkle{ 0%,100%{opacity:.3} 50%{opacity:1} }
    @keyframes notifSlide { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
    @keyframes hubNodeIn { 0%{opacity:0;transform:scale(0.15);} 70%{opacity:1;transform:scale(1.08);} 100%{opacity:1;transform:scale(1);} }
    @keyframes cardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes badgePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.45); } }
    @keyframes slideInDrawer { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    /* Network: cada pantalla entra con un fundido corto y sus bloques suben
       en cascada (máx. 0,3 s). "backwards" = al terminar no queda ningún
       transform puesto (no afecta a paneles fijos ni al deslizar). */
    @keyframes nwPageIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes nwRise   { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    .nw-page { animation: nwPageIn .22s ease-out backwards; }
    .nw-page > * > *:not([style*="fixed"]) { animation: nwRise .38s cubic-bezier(.2,.8,.2,1) backwards; }
    .nw-page > * > :nth-child(2) { animation-delay: 40ms; }
    .nw-page > * > :nth-child(3) { animation-delay: 80ms; }
    .nw-page > * > :nth-child(4) { animation-delay: 120ms; }
    .nw-page > * > :nth-child(5) { animation-delay: 160ms; }
    .nw-page > * > :nth-child(6) { animation-delay: 200ms; }
    .nw-page > * > :nth-child(7) { animation-delay: 240ms; }
    .nw-page > * > :nth-child(n+8) { animation-delay: 280ms; }
    /* Pantallas con scroll propio y barras fijas (Manual): solo el fundido. */
    .nw-page > .nw-norise > * { animation: none !important; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
      .nw-page, .nw-page > * > *:not([style*="fixed"]) { animation: none !important; }
      @keyframes cardIn      { from { opacity: 0; } to { opacity: 1; } }
      @keyframes backdropIn  { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideInDrawer { from { opacity: 0; } to { opacity: 1; } }
      @keyframes badgePulse  { 0%, 100% { transform: none; } 50% { transform: none; } }
      @keyframes slideUp     { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulse-glow  { 0%, 100% { box-shadow: none; } }
    }
    .animate-fade { animation: fadeIn 0.3s ease; }
    .glass { background: var(--glass-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border-violet); }
    .glow { box-shadow: var(--glow-violet); }
    .gradient-text { background: linear-gradient(135deg, var(--primary-violet-light), var(--accent-magenta)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 9px 18px; border-radius: var(--radius); font-size: 14px; font-weight: 500; transition: all var(--transition); cursor: pointer; white-space: nowrap; }
    .btn-primary { background: linear-gradient(135deg, var(--primary-violet), var(--primary-violet-dark)); color: white; box-shadow: var(--glow-violet-sm); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--glow-violet); }
    .btn-ghost { background: rgba(139, 92, 246, 0.1); color: var(--primary-violet-light); border: 1px solid var(--border-violet); }
    .btn-ghost:hover { background: rgba(139, 92, 246, 0.2); box-shadow: var(--glow-violet-sm); }
    .btn-danger { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .btn-danger:hover { background: rgba(239, 68, 68, 0.25); }
    .card { background: var(--glass-bg); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid var(--border-violet); border-radius: var(--radius-lg); transition: all var(--transition); }
    .card:hover { transform: translateY(-4px); box-shadow: var(--glow-violet); border-color: var(--primary-violet); }
    .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-active { background: rgba(34, 197, 94, 0.15); color: #4ADE80; border: 1px solid rgba(34,197,94,0.3); }
    .badge-inactive { background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3); }
    .badge-premium { background: rgba(251, 191, 36, 0.15); color: #FCD34D; border: 1px solid rgba(251,191,36,0.3); }
    .badge-standard { background: rgba(139, 92, 246, 0.15); color: var(--primary-violet-light); border: 1px solid var(--border-violet); }
    .badge-basic { background: rgba(156, 163, 175, 0.15); color: #9CA3AF; border: 1px solid rgba(156,163,175,0.3); }
    .input-field { width: 100%; padding: 10px 14px; background: rgba(139, 92, 246, 0.08); border: 1px solid var(--border-violet); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; transition: all var(--transition); }
    .input-field::placeholder { color: rgba(209, 213, 219, 0.4); }
    .input-field:focus { border-color: var(--primary-violet); background: rgba(139, 92, 246, 0.12); box-shadow: var(--glow-violet-sm); }
    .select-field { width: 100%; padding: 10px 14px; background: rgba(139, 92, 246, 0.08); border: 1px solid var(--border-violet); border-radius: var(--radius); color: var(--text-primary); font-size: 14px; transition: all var(--transition); appearance: none; cursor: pointer; }
    .select-field option { background: var(--bg-tertiary); color: var(--text-primary); }
    .select-field:focus { border-color: var(--primary-violet); box-shadow: var(--glow-violet-sm); }
    .stat-card { background: var(--glass-bg); border: 1px solid var(--border-violet); border-radius: var(--radius-lg); padding: 20px; display: flex; align-items: center; gap: 16px; transition: all var(--transition); }
    .stat-card:hover { transform: translateY(-3px); box-shadow: var(--glow-violet-sm); }
    .divider { height: 1px; background: var(--border-violet); margin: 16px 0; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 64px 32px; text-align: center; }
    @media (max-width: 640px) { .hide-mobile { display: none !important; } }
    @media (min-width: 641px) { .show-mobile-only { display: none !important; } }
    .nw-home-grid { display: grid; grid-template-columns: 1fr; gap: 0; }
    @media (min-width: 768px) { .nw-home-grid { grid-template-columns: 1fr 1fr; align-items: start; } }
    .nw-stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .nw-bottom-nav { background: var(--glass-bg); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid var(--border-violet); border-top: 1px solid rgba(255,255,255,0.08); border-radius: 24px; box-shadow: var(--glow-violet-sm), 0 12px 32px rgba(0,0,0,0.45), 0 -4px 16px rgba(139,92,246,0.08); }
    @supports not (backdrop-filter: blur(1px)) { .nw-bottom-nav { background: var(--bg-secondary); } }
    .nw-save-bar { position: fixed; bottom: 0; left: 0; right: 0; z-index: 150; background: var(--bg-secondary); border-top: 1px solid var(--border-violet); padding: 12px 20px; padding-bottom: max(12px, env(safe-area-inset-bottom, 0px)); }
    @media (max-width: 767px) { .nw-save-bar { bottom: calc(88px + env(safe-area-inset-bottom, 0px)); } }
    .nw-manual-nav { background: var(--glass-bg); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-violet); box-shadow: 0 4px 16px rgba(0,0,0,0.2); }
    @supports not (backdrop-filter: blur(1px)) { .nw-manual-nav { background: var(--bg-secondary); } }
    @supports not (backdrop-filter: blur(1px)) { .glass, .card { background: var(--bg-secondary); } }
    body { touch-action: pan-x pan-y; }
    @media print { .no-print { display: none !important; } }
  `
