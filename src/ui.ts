import { TOWERS, towerStats, upgradeCost, type TowerKind } from './game/config';
import type { Simulation } from './game/simulation';
export const ICONS = {
  shield: '<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6z"/><path d="m8 12 3 3 5-6"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7v10m3-8c-4-3-7 2-3 3s1 6-3 3"/>',
  crystal: '<path d="m12 2 6 8-2 9-4 3-4-3-2-9zM12 2v20M6 10l6 4 6-4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="m8 5 11 7-11 7z"/>',
  sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8c4 2 4 6 0 8M18 5c7 4 7 10 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5zM16 9l6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 5m0 3v.1"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>', close: '<path d="m6 6 12 12M18 6 6 18"/>',
};
export function icon(name: keyof typeof ICONS): string { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`; }
export interface Actions { select: (kind: TowerKind) => void; pause: () => void; speed: () => void; sound: () => boolean; nextWave: () => void; upgrade: () => void; sell: () => void; cancel: () => void; begin: () => void; help: () => void; closeHelp: () => void; restart: () => void; resetCamera: () => void; }
export class UI {
  readonly board: HTMLElement; selectedId: number | null = null; selectedKind: TowerKind | null = null;
  private toastTimer = 0; private lastPanel = ''; private lastWave = -1;
  constructor(root: HTMLElement, actions: Actions) {
    root.innerHTML = `
      <main class="game-shell">
        <header class="topbar">
          <a class="brand" href="#" aria-label="The Last Bastion"> <span class="crest">${icon('shield')}</span><span><span class="brand-kicker">THE LAST</span><strong>BASTION<span class="brand-dot">.</span></strong></span></a>
          <div class="wave-panel"><div class="wave-heading"><span class="tiny-label">SUPERVIVENCIA INFINITA</span><span id="challenge" class="challenge" hidden>HORDA DE ÉLITE</span></div><div class="wave-line"><strong id="wave">Oleada 1</strong><span id="wave-status">Preparando defensas</span></div><div class="wave-track"><i id="wave-progress"></i></div></div>
          <div class="resources"><div class="gold resource">${icon('coin')}<span><small>ORO</small><strong id="gold">300</strong></span></div><div class="crystal resource">${icon('crystal')}<span><small>EL ÚLTIMO CRISTAL</small><strong><span id="hp">1000</span><span class="muted"> / 1000</span></strong><span class="health-track"><i id="hp-progress"></i></span></span></div></div>
          <div class="toolbar"><button id="speed" class="icon-button speed-button" aria-label="Cambiar velocidad a 2x" title="Velocidad">1×</button><button id="pause" class="icon-button" aria-label="Pausar" title="Pausa (Espacio)">${icon('pause')}</button><button id="sound" class="icon-button" aria-label="Activar sonido" title="Sonido (M)">${icon('mute')}</button><button id="help" class="icon-button" aria-label="Cómo jugar" title="Cómo jugar">${icon('help')}</button></div>
        </header>
        <div id="board" class="board"></div>
        <div class="map-caption"><span class="status-dot"></span> VALLE DE LOS PINOS <span class="caption-separator">/</span><span>El último refugio del reino</span></div>
        <div class="map-tools"><button id="camera-reset" class="text-button">Restablecer vista</button><span>Rueda para acercar · Arrastra para explorar</span></div>
        <aside id="tower-panel" class="tower-panel" hidden></aside>
        <div id="placement-hint" class="placement-hint" hidden></div>
        <div id="pause-tag" class="pause-tag" hidden>PARTIDA EN PAUSA <span>Puedes planificar tus defensas</span></div>
        <div id="toast" class="toast" role="status" hidden></div>
        <footer class="bottom-bar">
          <div class="build-heading"><span class="tiny-label">CONSTRUYE TU DEFENSA</span><span id="build-tip">Elige una torre y colócala sobre el césped</span><button id="cancel" class="text-button" hidden>Cancelar ${icon('close')}</button></div>
          <div class="defense-row"><div class="tower-cards">${(Object.keys(TOWERS) as TowerKind[]).map((kind, i) => `<button class="tower-card ${kind}" data-tower="${kind}" aria-label="Construir torre ${TOWERS[kind].name}, ${TOWERS[kind].cost} oro"><span class="shortcut">${i + 1}</span><img id="icon-${kind}" alt=""/><span class="card-copy"><strong>${TOWERS[kind].name}</strong><span>${TOWERS[kind].description.split(' · ')[0]}</span></span><span class="card-cost">${icon('coin')}${TOWERS[kind].cost}</span></button>`).join('')}</div>
          <div class="wave-action"><span id="next-label">La horda se aproxima</span><button id="next-wave" class="primary">Iniciar oleada ${icon('arrow')}</button><small id="next-countdown">Preparación: 20 s</small></div></div>
          <div class="footer-meta"><span>UNA FORTALEZA. UN CRISTAL. TU ESTRATEGIA.</span><span>1–4 elegir · Esc cancelar · Espacio pausa <span class="footer-diamond">◆</span> <span id="record">Récord: 0</span></span></div>
        </footer>
        <section id="overlay" class="overlay" aria-modal="true" role="dialog" aria-labelledby="dialog-title"><div id="dialog" class="dialog"></div></section>
      </main>`;
    this.board = this.el('board');
    this.el('pause').onclick = actions.pause; this.el('speed').onclick = actions.speed;
    this.el('sound').onclick = () => { const muted = actions.sound(); this.el('sound').innerHTML = icon(muted ? 'mute' : 'sound'); this.el('sound').setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar'); };
    this.el('next-wave').onclick = actions.nextWave; this.el('help').onclick = actions.help; this.el('cancel').onclick = actions.cancel; this.el('camera-reset').onclick = actions.resetCamera;
    root.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(button => { button.onclick = () => actions.select(button.dataset.tower as TowerKind); });
    this.el('tower-panel').onclick = event => { const target = (event.target as HTMLElement).closest('button'); if (target?.id === 'upgrade') actions.upgrade(); if (target?.id === 'sell') actions.sell(); if (target?.id === 'deselect') actions.cancel(); };
    this.el('dialog').onclick = event => {
      const target = (event.target as HTMLElement).closest('button');
      if (target?.id === 'begin') actions.begin(); if (target?.id === 'restart') actions.restart(); if (target?.id === 'close-help') actions.closeHelp();
    };
    this.intro();
  }
  el(id: string): HTMLElement { return document.getElementById(id)!; }
  setIcons(icons: Record<TowerKind, string>): void { for (const kind of Object.keys(icons) as TowerKind[]) (this.el(`icon-${kind}`) as HTMLImageElement).src = icons[kind]; }
  intro(): void {
    this.el('overlay').hidden = false;
    this.el('dialog').innerHTML = `<span class="dialog-emblem">${icon('shield')}</span><span class="tiny-label">EL REINO AÚN TIENE ESPERANZA</span><h1 id="dialog-title">La última luz.<br><em>Tu última defensa.</em></h1><p>La maldición se acerca. Protege el cristal del reino y convierte este valle en una fortaleza inexpugnable.</p><div class="intro-steps"><span><b>01</b> Construye libremente</span><span><b>02</b> Mejora tus torres</span><span><b>03</b> Resiste las hordas</span></div><button id="begin" class="primary">Defender el bastión ${icon('arrow')}</button><small>300 de oro inicial · 4 defensas · Oleadas infinitas</small>`;
  }
  help(): void {
    this.el('overlay').hidden = false;
    this.el('dialog').innerHTML = `<span class="tiny-label">GUÍA DEL COMANDANTE</span><h2 id="dialog-title">Cada posición importa.</h2><p>Los enemigos salen del portal inferior derecho y siguen el único camino hasta tu castillo. Si destruyen el cristal, la partida termina.</p><ul class="help-list"><li><b>Construye sobre el césped.</b> Elige una torre; verde significa válido, rojo significa bloqueado. Evita el camino, árboles y otras torres.</li><li><b>Cubre las curvas.</b> El círculo muestra el alcance real. Combina arqueros rápidos, ballestas contra armadura, cañones de área y magia.</li><li><b>Invierte en tus defensas.</b> Haz clic en una torre para mejorarla hasta nivel 3 o venderla por el 70% de lo invertido.</li><li><b>Prepárate para la horda.</b> Hay 20 segundos entre oleadas. Cada quinta oleada llega un guardián. Sobrevive tanto como puedas.</li></ul><p class="key-guide">1–4: elegir torre · Esc / clic derecho: cancelar<br>Espacio: pausa · M: sonido · Rueda: zoom · Arrastrar: desplazar</p><button id="close-help" class="primary">Volver al valle ${icon('arrow')}</button>`;
  }
  hideOverlay(): void { this.el('overlay').hidden = true; }
  gameOver(sim: Simulation, record: number, newRecord: boolean): void {
    this.el('overlay').hidden = false;
    this.el('dialog').innerHTML = `<span class="tiny-label">${newRecord ? 'UN NUEVO RÉCORD PARA EL REINO' : 'EL CRISTAL HA CAÍDO'}</span><h2 id="dialog-title">Game Over</h2><p>La luz se ha apagado. Pero tu próxima defensa puede cambiar el destino del reino.</p><div class="results"><span><small>OLEADA</small><b>${sim.wave}</b></span><span><small>DERROTADOS</small><b>${sim.kills}</b></span><span><small>PUNTUACIÓN</small><b>${sim.score}</b></span><span><small>MEJOR RÉCORD</small><b>${record}</b></span></div><button id="restart" class="primary">Volver a defender ${icon('arrow')}</button>`;
  }
  toast(text: string): void { window.clearTimeout(this.toastTimer); this.el('toast').textContent = text; this.el('toast').hidden = false; this.toastTimer = window.setTimeout(() => { this.el('toast').hidden = true; }, 2600); }
  update(sim: Simulation, paused: boolean, speed: number, placement: string | null, record: number): void {
    this.el('gold').textContent = String(sim.gold); this.el('hp').textContent = String(sim.crystalHp); this.el('hp-progress').style.width = `${sim.crystalHp / 10}%`;
    this.el('wave').textContent = `Oleada ${Math.max(1, sim.wave)}`;
    this.el('wave-status').textContent = sim.phase === 'wave' ? `${sim.enemies.length} en el valle · ${sim.spawnQueue.length} por llegar` : sim.phase === 'gameover' ? 'El cristal ha caído' : sim.wave ? 'Oleada superada' : 'Preparando defensas';
    this.el('wave-progress').style.width = sim.phase === 'wave' ? `${(sim.spawned - sim.enemies.length) / Math.max(1, sim.waveTotal) * 100}%` : sim.wave ? '100%' : '0%';
    this.el('challenge').hidden = !sim.wave || sim.wave % 5 !== 0;
    if (this.lastWave !== sim.wave) { this.lastWave = sim.wave; if (sim.wave > 0 && sim.wave % 5 === 0) this.toast('¡Horda de élite! Un guardián se aproxima.'); }
    this.el('pause-tag').hidden = !paused; this.el('pause').innerHTML = icon(paused ? 'play' : 'pause'); this.el('pause').setAttribute('aria-label', paused ? 'Reanudar' : 'Pausar');
    this.el('speed').textContent = `${speed}×`; this.el('speed').setAttribute('aria-label', `Cambiar velocidad a ${speed === 1 ? 2 : 1}x`);
    const prep = sim.phase === 'preparation'; const waveButton = this.el('next-wave') as HTMLButtonElement; waveButton.disabled = !prep;
    waveButton.innerHTML = prep ? `Iniciar oleada ${sim.wave + 1} ${icon('arrow')}` : `${icon('shield')} ${sim.phase === 'gameover' ? 'Bastión caído' : 'Defiende el cristal'}`;
    this.el('next-label').textContent = prep ? sim.wave ? 'Un respiro antes de la batalla' : 'La horda se aproxima' : 'Mantén tus defensas';
    this.el('next-countdown').textContent = prep ? `Preparación: ${Math.ceil(sim.preparation)} s` : `Oleada ${sim.wave} · ${sim.kills} enemigos derrotados`;
    this.el('record').textContent = `Récord: ${record.toLocaleString('es')}`;
    document.querySelectorAll<HTMLButtonElement>('[data-tower]').forEach(b => { const kind = b.dataset.tower as TowerKind; b.disabled = sim.gold < TOWERS[kind].cost || sim.phase === 'gameover'; b.classList.toggle('selected', kind === this.selectedKind); });
    this.el('cancel').hidden = !this.selectedKind && this.selectedId === null;
    this.el('placement-hint').hidden = !this.selectedKind;
    this.el('placement-hint').textContent = placement ?? 'Ubicación válida · Clic para construir'; this.el('placement-hint').classList.toggle('invalid', !!placement);
    this.el('build-tip').textContent = this.selectedKind ? `${TOWERS[this.selectedKind].name} · Clic para construir · Esc para cancelar` : 'Elige una torre y colócala sobre el césped';
    const t = sim.towers.find(t => t.id === this.selectedId); const panel = this.el('tower-panel'); panel.hidden = !t;
    if (t) {
      const stats = towerStats(t.kind, t.level), cost = upgradeCost(t.kind, t.level);
      const key = `${t.id}:${t.level}:${sim.gold < cost}:${sim.phase}`;
      if (key !== this.lastPanel) {
        this.lastPanel = key;
        panel.innerHTML = `<div class="panel-heading"><span class="tiny-label">DEFENSA SELECCIONADA</span><button id="deselect" class="text-button" aria-label="Cerrar panel">${icon('close')}</button></div><h2>${stats.name} <small>NIVEL ${t.level} / 3</small></h2><p>${stats.description}</p><div class="tower-stats"><span>Daño<b>${stats.damage}</b></span><span>Alcance<b>${stats.range.toFixed(1)} m</b></span><span>Ataques<b>${(1 / stats.interval).toFixed(2)}/s</b></span>${stats.splash ? `<span>Explosión<b>${stats.splash.toFixed(1)} m</b></span>` : ''}</div><button id="upgrade" class="primary" ${t.level === 3 || sim.gold < cost || sim.phase === 'gameover' ? 'disabled' : ''}>${t.level === 3 ? 'Nivel máximo' : `Mejorar ${icon('coin')} ${cost}`}</button><button id="sell" class="sell-button" ${sim.phase === 'gameover' ? 'disabled' : ''}>Vender por ${Math.floor(t.invested * .7)} oro</button>`;
      }
    } else this.lastPanel = '';
  }
}
