import { MAX_TOWER_LEVEL, TOWERS, WORLD, refundGold, towerStats, upgradeCost, type TowerKind } from './game/config';
import { MISSIONS, towerUnlockMission, waveAdvice, waveSummary } from './game/missions';
import type { CampaignProgress } from './game/progress';
import type { Simulation } from './game/simulation';
import { castleIllustration, mapIllustration } from './illustrations';

export const ICONS = {
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10m3-8c-4-3-7 2-3 3s1 6-3 3"/>',
  castle: '<path d="M3 21V7h3V3h3v4h6V3h3v4h3v14H3zm6 0v-6a3 3 0 0 1 6 0v6M7 10v2m10-2v2"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 5 11 7-11 7z"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8c4 2 4 6 0 8M18 5c7 4 7 10 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3v.1"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
  plus: '<path d="M5 12h14m-7-7v14"/>', minus: '<path d="M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
};
export function icon(name: keyof typeof ICONS): string { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`; }
function stars(count: number, className: string): string { return `<span class="${className}" aria-label="${count} de 3 estrellas">${[1, 2, 3].map(n => `<span class="${n <= count ? 'earned' : 'empty'}">${icon('star')}</span>`).join('')}</span>`; }
function format(n: number): string { return n.toLocaleString('es-MX'); }
export interface Actions { select: (kind: TowerKind) => void; pause: () => void; speed: () => void; sound: () => boolean; nextWave: () => void; upgrade: () => void; sell: () => void; cancel: () => void; mission: (index: number) => void; campaign: () => void; resume: () => void; nextMission: () => void; help: () => void; closeHelp: () => void; restart: () => void; resetCamera: () => void; zoom: (delta: number) => void; }
export class UI {
  readonly board: HTMLElement; selectedId: number | null = null; selectedKind: TowerKind | null = null;
  private toastTimer = 0; private lastPanel = ''; private lastWave = -1;
  private lastPaused: boolean | null = null; private lastSpeed = 0; private lastWaveAction = '';
  private icons: Partial<Record<TowerKind, string>> = {}; private returnFocus: HTMLElement | null = null;
  constructor(root: HTMLElement, actions: Actions, progress: CampaignProgress) {
    root.innerHTML = `
      <main class="game-shell">
        <header class="topbar">
          <a class="brand" href="#" aria-label="The Last Bastion"><span class="crest">${icon('shield')}</span><span><span class="brand-kicker">THE LAST</span><strong>BASTION<span class="brand-dot">.</span></strong></span></a>
          <div class="wave-panel"><div class="wave-heading"><span id="mission-title" class="tiny-label">CAMPAÑA DEL REINO</span><span id="challenge" class="challenge" hidden>GUARDIÁN</span></div><div class="wave-line"><strong id="wave">Oleada 1 / 5</strong><span id="phase-label" class="phase-label">PREPARACIÓN</span></div><span id="wave-status">Preparando defensas</span><div class="wave-track"><i id="wave-progress"></i></div></div>
          <div class="resources"><div class="gold resource">${icon('coin')}<span><small>ORO DISPONIBLE</small><strong id="gold">${WORLD.initialGold}</strong></span></div><div id="castle-resource" class="castle resource">${icon('castle')}<span><small>SALUD DEL CASTILLO</small><strong><span id="hp">${WORLD.castleHp}</span><span class="muted"> / ${WORLD.castleHp}</span></strong><span class="health-track"><i id="hp-progress"></i></span></span></div></div>
          <div class="toolbar"><button id="speed" class="icon-button speed-button" aria-label="Cambiar velocidad a 2x" title="Velocidad de juego">1×</button><button id="pause" class="icon-button" aria-label="Pausar" title="Pausa táctica (Espacio)">${icon('pause')}</button><button id="sound" class="icon-button" aria-label="Activar sonido" title="Sonido (M)">${icon('mute')}</button><button id="help" class="icon-button" aria-label="Cómo jugar" title="Cómo jugar">${icon('help')}</button></div>
        </header>
        <div id="board" class="board"></div>
        <div class="map-caption"><span class="status-dot"></span><span id="map-name">LA FRONTERA</span><span class="caption-separator">/</span><span>Defiende el castillo</span></div>
        <div class="map-tools"><button id="zoom-out" class="text-button" aria-label="Alejar vista" title="Alejar">${icon('minus')}</button><button id="zoom-in" class="text-button" aria-label="Acercar vista" title="Acercar">${icon('plus')}</button><button id="camera-reset" class="text-button">Restablecer vista</button></div>
        <aside id="tower-panel" class="tower-panel" aria-label="Detalles de la torre" hidden></aside>
        <div id="placement-hint" class="placement-hint" hidden></div>
        <div id="pause-tag" class="pause-tag" hidden>${icon('pause')}<span><b>PAUSA TÁCTICA</b><small>Construye y mejora sin prisa · Espacio para seguir</small></span></div>
        <div id="toast" class="toast" role="status" hidden></div>
        <footer class="bottom-bar">
          <div class="build-heading"><span class="tiny-label">TUS DEFENSAS</span><span id="build-tip">Elige una torre y colócala junto al camino</span><button id="cancel" class="text-button" hidden>Cancelar ${icon('close')}</button></div>
          <div class="defense-row"><div class="tower-cards">${(Object.keys(TOWERS) as TowerKind[]).map((kind, i) => `<button class="tower-card ${kind}" data-tower="${kind}" aria-label="Construir torre ${TOWERS[kind].name}, ${TOWERS[kind].cost} oro"><span class="shortcut">${i + 1}</span><span class="card-lock" aria-hidden="true">${icon('lock')}</span><img id="icon-${kind}" alt=""/><span class="card-copy"><strong>${TOWERS[kind].name}</strong><span>${TOWERS[kind].description.split(' · ')[0]}</span></span><span class="card-cost">${icon('coin')}${TOWERS[kind].cost}</span></button>`).join('')}</div>
          <div class="wave-action"><span id="wave-action-title" class="tiny-label">PRÓXIMA OLEADA</span><span id="next-label">Prepara tus defensas</span><button id="next-wave" class="primary">Iniciar oleada ${icon('arrow')}</button><small id="next-countdown">Preparación: 20 s</small><span class="preparation-track"><i id="preparation-progress"></i></span></div></div>
        </footer>
        <div class="campaign-access"><button id="campaign" class="text-button" aria-label="Abrir campaña">${icon('shield')} Campaña <span id="record">0 / ${MISSIONS.length * 3} ★</span></button></div>
        <section id="overlay" class="overlay" aria-modal="true" role="dialog" aria-labelledby="dialog-title"><div id="dialog" class="dialog" tabindex="-1"></div></section>
      </main>`;
    this.board = this.el('board');
    this.el('campaign').onclick = actions.campaign;
    root.querySelector<HTMLAnchorElement>('.brand')!.onclick = e => { e.preventDefault(); actions.campaign(); };
    this.el('pause').onclick = actions.pause; this.el('speed').onclick = actions.speed;
    this.el('sound').onclick = () => { const muted = actions.sound(); this.el('sound').innerHTML = icon(muted ? 'mute' : 'sound'); this.el('sound').setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar'); this.el('sound').setAttribute('aria-pressed', String(!muted)); };
    this.el('next-wave').onclick = actions.nextWave; this.el('help').onclick = actions.help; this.el('cancel').onclick = actions.cancel; this.el('camera-reset').onclick = actions.resetCamera;
    this.el('zoom-in').onclick = () => actions.zoom(-180); this.el('zoom-out').onclick = () => actions.zoom(180);
    root.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(button => { button.onclick = () => actions.select(button.dataset.tower as TowerKind); });
    this.el('tower-panel').onclick = event => { const target = (event.target as HTMLElement).closest('button'); if (target?.id === 'upgrade') actions.upgrade(); if (target?.id === 'sell') actions.sell(); if (target?.id === 'deselect') actions.cancel(); };
    this.el('dialog').onclick = event => {
      const target = (event.target as HTMLElement).closest('button');
      if (target?.dataset.mission !== undefined) actions.mission(Number(target.dataset.mission));
      if (target?.id === 'campaign-menu') actions.campaign(); if (target?.id === 'campaign-help') actions.help();
      if (target?.id === 'resume-mission') actions.resume();
      if (target?.id === 'next-mission') actions.nextMission(); if (target?.id === 'restart') actions.restart(); if (target?.id === 'close-help' || target?.id === 'help-dismiss') actions.closeHelp();
    };
    root.addEventListener('keydown', event => {
      if (this.el('overlay').hidden || event.key !== 'Tab') return;
      const buttons = Array.from(this.el('dialog').querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
    this.campaign(progress);
  }
  el(id: string): HTMLElement { return document.getElementById(id)!; }
  private towerImage(kind: TowerKind, className = ''): string { return `<img class="tower-illustration ${className}" data-icon="${kind}" ${this.icons[kind] ? `src="${this.icons[kind]}"` : ''} alt=""/>`; }
  setIcons(icons: Record<TowerKind, string>): void {
    this.icons = icons;
    for (const kind of Object.keys(icons) as TowerKind[]) (this.el(`icon-${kind}`) as HTMLImageElement).src = icons[kind];
    document.querySelectorAll<HTMLImageElement>('[data-icon]').forEach(img => { img.src = icons[img.dataset.icon as TowerKind]; });
  }
  private showDialog(kind: string, content: string): void {
    if (this.el('overlay').hidden && document.activeElement instanceof HTMLElement) this.returnFocus = document.activeElement;
    this.el('dialog').className = `dialog ${kind}-dialog`;
    this.el('dialog').innerHTML = content; this.el('dialog').scrollTop = 0;
    this.el('overlay').hidden = false;
    this.el('dialog').querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    for (const child of Array.from(this.el('overlay').parentElement!.children)) if (child instanceof HTMLElement && child.id !== 'overlay') { child.inert = true; child.setAttribute('aria-hidden', 'true'); }
  }
  campaign(progress: CampaignProgress, active?: Simulation): void {
    const pending = MISSIONS.findIndex((_, i) => progress.isUnlocked(i) && !progress.records[MISSIONS[i].id]);
    const completed = progress.completed === MISSIONS.length;
    const index = pending >= 0 ? pending : MISSIONS.reduce((best, m, i) => (progress.records[m.id]?.stars ?? 0) < (progress.records[MISSIONS[best].id]?.stars ?? 0) ? i : best, 0);
    const featured = MISSIONS[index];
    this.showDialog('campaign', `<div class="campaign-hero"><div class="campaign-wordmark">${icon('shield')} THE LAST BASTION</div><span class="tiny-label">${completed ? 'CAMPAÑA COMPLETADA' : `${MISSIONS.length} CASTILLOS. UN REINO.`}</span><h1 id="dialog-title">${completed ? 'Reino <br>recuperado.' : 'Recupera <br>el reino.'}</h1><p>${completed ? 'Todos los castillos están a salvo. <br>Vuelve a superarte y perfecciona tus defensas.' : 'Levanta tus defensas. Protege cada castillo. <br>Escribe tu próxima victoria.'}</p>${castleIllustration()}<div class="hero-goal">${icon('castle')}<span><small>${completed ? 'VUELVE A SUPERARTE' : 'TU PRÓXIMO DESTINO'}</small><strong>${active && !active.finished ? active.mission.name : featured.name}</strong></span></div><button id="${active && !active.finished ? 'resume-mission' : 'campaign-start'}" ${active && !active.finished ? '' : `data-mission="${index}"`} class="primary">${active && !active.finished ? 'Continuar misión actual' : completed ? progress.totalStars < MISSIONS.length * 3 ? 'Conseguir más estrellas' : 'Repetir campaña' : progress.completed ? 'Continuar campaña' : 'Iniciar campaña'} ${icon('arrow')}</button><button id="campaign-help" class="secondary">${icon('help')} Cómo jugar</button></div><div class="campaign-chapters"><div class="campaign-header"><span class="tiny-label">ELIGE TU MISIÓN</span><span class="save-status"><i></i> Progreso local</span></div><div class="campaign-summary"><span>${progress.completed} / ${MISSIONS.length} misiones completadas</span><b>${progress.totalStars} / ${MISSIONS.length * 3} ★</b></div><div class="campaign-track"><i style="width:${progress.completed / MISSIONS.length * 100}%"></i></div><div class="mission-list">${MISSIONS.map((m, i) => {
      const unlocked = progress.isUnlocked(i), best = progress.records[m.id], count = best?.stars ?? 0;
      const newDefense = m.towers.find(kind => !MISSIONS[i - 1]?.towers.includes(kind))!;
      return `<button class="mission-card ${m.map.theme} ${!unlocked ? 'is-locked' : count ? 'is-complete' : 'is-next'}" data-mission="${i}" ${unlocked ? '' : 'disabled'} aria-label="${unlocked ? 'Jugar' : 'Bloqueada'}: ${m.name}"><span class="mission-preview">${mapIllustration(m.map, m.id)}<span class="mission-number">0${i + 1}</span></span><span class="mission-copy"><small>${m.region}</small><strong>${m.name}</strong><span>${m.waves.length} oleadas · ${i ? 'Nueva defensa: ' : ''}${TOWERS[newDefense].name}</span><span class="mission-footer">${stars(count, 'mission-stars')}<span>${unlocked ? count ? 'Repetir misión' : 'Jugar misión' : `${icon('lock')} Completa la anterior`}</span></span></span><span class="mission-action">${unlocked ? icon('arrow') : icon('lock')}</span></button>`;
    }).join('')}</div><div class="star-rules"><span>${icon('star')} Gana para avanzar</span><span>★★ 60% de salud · ★★★ 90%</span></div><small class="save-note">Tus mejores estrellas y puntuaciones se guardan en este navegador.</small></div>`);
  }
  briefing(sim: Simulation): void { this.lastWave = -1; this.el('mission-title').textContent = sim.mission.name.toUpperCase(); this.el('map-name').textContent = sim.mission.region; this.toast(`${sim.mission.name} · ${sim.mission.objective}`); }
  flashCastle(): void { this.el('castle-resource').classList.remove('damaged'); void this.el('castle-resource').offsetWidth; this.el('castle-resource').classList.add('damaged'); }
  help(fromCampaign = false): void {
    const steps = [
      ['castle', 'Elige y construye', 'Selecciona una defensa y colócala en el césped, junto al camino. Verde: puedes construir. Rojo: ubicación bloqueada.'],
      ['target', 'Aprovecha las curvas', 'El círculo muestra el alcance real. Cubre tramos largos y protege el castillo de los corredores.'],
      ['plus', 'Invierte con estrategia', 'Cada torre sube del nivel 1 al 3. Compara su próxima mejora o compra cobertura nueva. Vender devuelve el 70%.'],
      ['shield', 'Defiende y avanza', 'Lee la próxima oleada y prepara tus defensas. Gana para abrir otra misión; conserva la salud para ganar más estrellas.'],
    ] as const;
    this.showDialog('help', `<div class="dialog-topline"><span class="tiny-label">GUÍA DEL COMANDANTE</span><button id="help-dismiss" class="text-button" aria-label="Cerrar ayuda">${icon('close')}</button></div><div class="help-heading"><span class="dialog-emblem">${icon('shield')}</span><h2 id="dialog-title">Cada posición importa.</h2><p>La horda entra por el portal y sigue el camino hasta tu castillo.<br>Tu misión: impedir que derribe las murallas.</p></div><div class="help-grid">${steps.map(([symbol, title, text], i) => `<article class="help-card"><span class="help-icon">${icon(symbol)}</span><span class="help-step">0${i + 1}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div><div class="help-controls"><span><kbd>1–4</kbd> Elegir torre</span><span><kbd>Espacio</kbd> Pausa táctica</span><span><kbd>Esc</kbd> Cancelar</span><span><kbd>M</kbd> Sonido</span><span><kbd>Rueda</kbd> Acercar / alejar</span><span><kbd>Arrastrar</kbd> Mover vista</span></div><button id="close-help" class="primary">${fromCampaign ? 'Volver a la campaña' : 'Volver al valle'} ${icon('arrow')}</button>`);
  }
  hideOverlay(): void {
    this.el('overlay').hidden = true;
    for (const child of Array.from(this.el('overlay').parentElement!.children)) if (child instanceof HTMLElement) { child.inert = false; child.removeAttribute('aria-hidden'); }
    if (this.returnFocus?.isConnected && this.returnFocus !== document.body) this.returnFocus.focus({ preventScroll: true });
    else this.board.querySelector<HTMLCanvasElement>('canvas')?.focus({ preventScroll: true });
    this.returnFocus = null;
  }
  gameOver(sim: Simulation): void {
    const advice = !sim.towers.length ? 'Construye varias defensas junto a las curvas antes de iniciar la horda.' : sim.towers.every(t => t.level === 1) ? 'El oro ganado también sirve para mejorar: potencia las torres que cubren más camino.' : 'Distribuye tus defensas entre varias curvas y revisa qué enemigos anuncia la próxima oleada.';
    this.showDialog('defeat', `<span class="outcome-emblem defeat-emblem">${icon('castle')}</span><span class="tiny-label">BATALLA PERDIDA</span><h2 id="dialog-title">El castillo ha caído.</h2><p>${sim.mission.name}<br>Una nueva estrategia puede cambiar el resultado.</p><div class="results"><span><small>OLEADA ALCANZADA</small><b>${sim.wave}<em> / ${sim.mission.waves.length}</em></b></span><span><small>ENEMIGOS DERROTADOS</small><b>${format(sim.kills)}</b></span><span><small>PUNTUACIÓN</small><b>${format(sim.score)}</b></span><span><small>ESTRELLAS</small><b>0 <em> / 3</em></b></span></div><div class="retry-advice">${icon('target')}<span><b>PRUEBA EN EL PRÓXIMO INTENTO</b>${advice}</span></div><button id="restart" class="primary">Reintentar misión ${icon('arrow')}</button><button id="campaign-menu" class="secondary">Volver a la campaña</button>`);
  }
  victory(sim: Simulation, progress: CampaignProgress, index: number, saved = true): void {
    const next = MISSIONS[index + 1], reward = next?.towers.find(t => !sim.mission.towers.includes(t));
    this.showDialog('victory', `<span class="outcome-emblem">${icon('shield')}</span><span class="tiny-label">${next ? 'MISIÓN COMPLETADA' : 'EL REINO ESTÁ A SALVO'}</span><h2 id="dialog-title">¡Castillo defendido!</h2><p>${sim.mission.name}<br>Las murallas siguen en pie gracias a tus defensas.</p>${stars(sim.stars, 'victory-stars')}<div class="results"><span><small>SALUD DEL CASTILLO</small><b>${Math.round(sim.castleHp / WORLD.castleHp * 100)}<em>%</em></b></span><span><small>ENEMIGOS DERROTADOS</small><b>${format(sim.kills)}</b></span><span><small>PUNTUACIÓN</small><b>${format(sim.score)}</b></span><span><small>MEJOR PUNTUACIÓN</small><b>${format(progress.records[sim.mission.id]?.score ?? sim.score)}</b></span></div><div class="victory-reward">${next ? `<span class="reward-image">${reward ? this.towerImage(reward) : icon('castle')}</span><span><small>PRÓXIMO DESTINO DESBLOQUEADO</small><strong>${next.name}</strong>${reward ? `Nueva defensa: <b>${TOWERS[reward].name}</b>` : ''}</span>` : `<span class="reward-image">${icon('castle')}</span><span><strong>Campaña completada</strong>Consigue las ${MISSIONS.length * 3} estrellas repitiendo tus misiones favoritas.</span>`}</div>${sim.stars < 3 ? `<p class="star-tip">Conserva al menos el ${sim.stars === 1 ? '60% para dos estrellas' : '90% para tres estrellas'}.</p>` : '<p class="star-tip">Tres estrellas. Una defensa impecable.</p>'}<button id="${next ? 'next-mission' : 'campaign-menu'}" class="primary">${next ? 'Siguiente misión' : 'Volver a la campaña'} ${icon('arrow')}</button><div class="outcome-actions"><button id="restart" class="secondary">Repetir para mejorar mi marca</button>${next ? '<button id="campaign-menu" class="secondary">Ver campaña</button>' : ''}</div>${saved ? '' : '<small class="save-note">El guardado no está disponible; tu progreso se conserva durante esta sesión.</small>'}`);
  }
  toast(text: string): void { window.clearTimeout(this.toastTimer); this.el('toast').textContent = text; this.el('toast').hidden = false; this.board.parentElement!.classList.add('has-toast'); this.toastTimer = window.setTimeout(() => { this.el('toast').hidden = true; this.board.parentElement!.classList.remove('has-toast'); }, 3200); }
  update(sim: Simulation, paused: boolean, speed: number, placement: string | null, progress: CampaignProgress): void {
    const prep = sim.phase === 'preparation', next = sim.mission.waves[sim.wave];
    this.el('gold').textContent = String(sim.gold); this.el('hp').textContent = String(sim.castleHp); this.el('hp-progress').style.width = `${sim.castleHp / WORLD.castleHp * 100}%`;
    this.el('castle-resource').classList.toggle('critical', sim.castleHp <= WORLD.castleHp * .3);
    this.el('wave').textContent = `Oleada ${Math.max(1, sim.wave + (prep ? 1 : 0))} / ${sim.mission.waves.length}`;
    this.el('wave-status').textContent = sim.phase === 'wave' ? `${sim.enemies.length} en el valle · ${sim.spawnQueue.length} por llegar` : sim.phase === 'gameover' ? 'El castillo ha caído' : sim.phase === 'victory' ? '¡Misión completada!' : waveSummary(next);
    this.el('phase-label').textContent = sim.finished ? 'FINALIZADA' : paused ? 'EN PAUSA' : prep ? 'PREPARACIÓN' : 'EN COMBATE';
    this.el('wave-progress').style.width = `${(prep || sim.finished ? sim.wave : sim.wave - 1 + (sim.spawned - sim.enemies.length) / Math.max(1, sim.waveTotal)) / sim.mission.waves.length * 100}%`;
    this.el('challenge').hidden = !(prep ? next : sim.mission.waves[sim.wave - 1])?.guardian; this.el('challenge').textContent = prep ? 'GUARDIÁN' : 'HORDA DE ÉLITE';
    if (this.lastWave !== sim.wave) { this.lastWave = sim.wave; if (sim.mission.waves[sim.wave - 1]?.guardian) this.toast('¡Horda de élite! Un guardián se aproxima.'); }
    this.el('pause-tag').hidden = !paused;
    if (this.lastPaused !== paused) { this.lastPaused = paused; this.el('pause').innerHTML = icon(paused ? 'play' : 'pause'); this.el('pause').setAttribute('aria-label', paused ? 'Reanudar' : 'Pausar'); this.el('pause').setAttribute('aria-pressed', String(paused)); }
    if (this.lastSpeed !== speed) { this.lastSpeed = speed; this.el('speed').textContent = `${speed}×`; this.el('speed').setAttribute('aria-label', `Cambiar velocidad a ${speed === 1 ? 2 : 1}x`); }
    const waveButton = this.el('next-wave') as HTMLButtonElement; waveButton.disabled = !prep;
    const waveAction = `${sim.phase}:${sim.wave}`;
    if (this.lastWaveAction !== waveAction) { this.lastWaveAction = waveAction; waveButton.innerHTML = prep ? `Iniciar oleada ${sim.wave + 1} ${icon('arrow')}` : `${icon('shield')} ${sim.finished ? sim.phase === 'victory' ? 'Misión superada' : 'Bastión caído' : 'Defendiendo'}`; }
    this.el('wave-action-title').textContent = prep ? 'PRÓXIMA OLEADA' : sim.finished ? 'BATALLA TERMINADA' : 'EN COMBATE';
    this.el('next-label').textContent = prep ? waveAdvice(next, sim.mission.towers) : sim.finished ? 'La batalla ha terminado' : 'Tus defensas están en acción';
    this.el('next-countdown').textContent = prep ? `${paused ? 'En pausa' : 'Preparación'}: ${Math.ceil(sim.preparation)} s` : `Oleada ${sim.wave} · ${sim.kills} derrotados`;
    this.el('preparation-progress').style.width = prep ? `${sim.preparation / WORLD.preparation * 100}%` : '0%';
    this.el('record').textContent = `${progress.totalStars} / ${MISSIONS.length * 3} ★`;
    document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b => {
      const kind = b.dataset.tower as TowerKind, locked = !sim.mission.towers.includes(kind), shortfall = sim.gold < TOWERS[kind].cost;
      b.disabled = locked || shortfall || sim.finished; b.classList.toggle('locked', locked); b.classList.toggle('unaffordable', !locked && shortfall);
      b.title = locked ? `Se desbloquea en la misión ${towerUnlockMission(kind)}` : TOWERS[kind].description;
      const subtitle = b.querySelector('.card-copy > span'); if (subtitle) subtitle.textContent = locked ? `Misión ${towerUnlockMission(kind)} · Bloqueada` : shortfall ? `Te faltan ${TOWERS[kind].cost - sim.gold} de oro` : TOWERS[kind].description.split(' · ')[0];
      b.classList.toggle('selected', kind === this.selectedKind); b.setAttribute('aria-pressed', String(kind === this.selectedKind));
    });
    this.el('cancel').hidden = !this.selectedKind && this.selectedId === null;
    this.el('placement-hint').hidden = !this.selectedKind; this.el('placement-hint').textContent = placement ?? 'Ubicación válida · Clic para construir'; this.el('placement-hint').classList.toggle('invalid', !!placement);
    this.el('build-tip').textContent = this.selectedKind ? `${TOWERS[this.selectedKind].name} · Clic para construir · Esc para cancelar` : 'Elige una torre y colócala junto al camino';
    const t = sim.towers.find(t => t.id === this.selectedId), panel = this.el('tower-panel'); panel.hidden = !t; this.board.parentElement!.classList.toggle('inspecting', !!t);
    if (t) {
      const stats = towerStats(t.kind, t.level), cost = upgradeCost(t.kind, t.level), maxed = t.level >= MAX_TOWER_LEVEL;
      const key = `${t.id}:${t.level}:${sim.gold}:${sim.phase}`;
      if (key !== this.lastPanel) {
        this.lastPanel = key; const nextStats = towerStats(t.kind, t.level + 1);
        const comparison = (current: string, improved: string) => `<b>${current}${maxed ? '' : `<span class="stat-arrow">→</span><em>${improved}</em>`}</b>`;
        panel.innerHTML = `<div class="panel-heading"><span class="tiny-label">DEFENSA SELECCIONADA</span><button id="deselect" class="text-button" aria-label="Cerrar panel">${icon('close')}</button></div><div class="tower-profile">${this.towerImage(t.kind)}<h2>${stats.name}<small>NIVEL ${t.level} / ${MAX_TOWER_LEVEL}</small><span class="level-pips" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${n <= t.level ? 'earned' : ''}"></i>`).join('')}</span></h2></div><div class="panel-body"><p>${stats.description}</p><div class="upgrade-caption">${maxed ? 'ATRIBUTOS ACTUALES' : `ACTUAL → NIVEL ${t.level + 1}`}</div><div class="tower-stats"><span>Daño por disparo${comparison(String(stats.damage), String(nextStats.damage))}</span><span>Alcance (m)${comparison(stats.range.toFixed(1), nextStats.range.toFixed(1))}</span><span>Ataques por segundo${comparison((1 / stats.interval).toFixed(2), (1 / nextStats.interval).toFixed(2))}</span>${stats.splash ? `<span>Explosión (m)${comparison(stats.splash.toFixed(1), nextStats.splash.toFixed(1))}</span>` : ''}</div></div><div class="panel-actions"><button id="upgrade" class="primary" ${maxed || sim.gold < cost || sim.finished ? 'disabled' : ''}>${maxed ? 'Nivel máximo alcanzado' : `Mejorar a nivel ${t.level + 1} ${icon('coin')} ${cost}`}</button>${!maxed && sim.gold < cost && !sim.finished ? `<small class="upgrade-shortfall">Te faltan ${cost - sim.gold} de oro</small>` : ''}<button id="sell" class="sell-button" ${sim.finished ? 'disabled' : ''}>Vender por ${refundGold(t.invested)} oro</button><small class="investment">Invertido: ${t.invested} oro · Recuperas el 70%</small></div>`;
      }
    } else this.lastPanel = '';
  }
}
