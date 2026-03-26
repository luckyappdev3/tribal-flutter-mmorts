// ─────────────────────────────────────────────────────────────
// bot.logger.ts — Journal des actions du bot (fichier + console)
//
// Chaque tick produit une ligne :
//   [HH:MM:SS.mmm] Bot:<id> lvl=5 phase=mid
//     → BUILD timber_camp lv2→3  score=0.548
//     | bois=5000 pierre=4200 fer=3800
//     | top3: BUILD:timber_camp:0.548 | RECRUIT:axeman×5:0.177 | IDLE:0.010
// ─────────────────────────────────────────────────────────────

import * as fs   from 'fs';
import * as path from 'path';
import { ScoredAction, GameSnapshot } from './bot.types';
import { Phase } from './bot.types';

export interface BotLogEntry {
  ts:         string;   // ISO timestamp
  villageId:  string;
  level:      number;
  phase:      Phase;
  action:     string;   // description courte
  score:      number;
  wood:       number;
  stone:      number;
  iron:       number;
  top3:       string;
  elapsed:    string;   // temps de jeu (ex: "22.4min")
}

// ─────────────────────────────────────────────────────────────

export class BotLogger {
  private readonly filePath: string;
  private readonly tag: string;
  // 23.2 — Buffer des 50 dernières entrées en mémoire (accessible via l'endpoint admin)
  private readonly recentLogs: string[] = [];
  private static readonly MAX_MEMORY_LINES = 50;

  constructor(villageId: string, logDir = 'logs') {
    // Crée le dossier logs/ s'il n'existe pas
    const absDir = path.resolve(process.cwd(), logDir);
    if (!fs.existsSync(absDir)) fs.mkdirSync(absDir, { recursive: true });

    this.filePath = path.join(absDir, `bot-${villageId.slice(-8)}.log`);
    this.tag      = `Bot:${villageId.slice(-6)}`;

    // En-tête à l'ouverture
    const header =
      `\n${'─'.repeat(70)}\n` +
      `  Bot démarré — village=${villageId}\n` +
      `  ${new Date().toLocaleString('fr-FR')}\n` +
      `${'─'.repeat(70)}\n`;

    fs.appendFileSync(this.filePath, header, 'utf8');
  }

  // ── Format d'un tick ──────────────────────────────────────

  logTick(
    level:   number,
    phase:   Phase,
    snap:    GameSnapshot,
    best:    ScoredAction,
    top3:    ScoredAction[],
  ): void {
    const now     = new Date();
    const ts      = this.formatTime(now);
    const elapsed = `${snap.timeElapsedMinutes.toFixed(1)}min`;
    const actionStr = this.describeAction(best);
    const top3Str   = top3
      .map(a => `${a.debugLabel}(${a.score.toFixed(3)})`)
      .join(' | ');

    const line =
      `[${ts}] ${this.tag} lvl=${level} phase=${phase} t=${elapsed}\n` +
      `  → ${actionStr}  score=${best.score.toFixed(4)}\n` +
      `  | bois=${Math.round(snap.wood)} pierre=${Math.round(snap.stone)} fer=${Math.round(snap.iron)}\n` +
      `  | top3: ${top3Str}\n`;

    // Fichier (persistant)
    fs.appendFileSync(this.filePath, line, 'utf8');
    this.pushToMemory(line.trimEnd());

    // Console (debug)
    console.debug(
      `[${ts}] [${this.tag}] lvl=${level} phase=${phase} t=${elapsed}` +
      ` → ${actionStr} (${best.score.toFixed(3)})`,
    );
  }

  // ── Événements spéciaux ───────────────────────────────────

  logEvent(event: string): void {
    const ts   = this.formatTime(new Date());
    const line = `[${ts}] [${this.tag}] *** ${event} ***\n`;
    fs.appendFileSync(this.filePath, line, 'utf8');
    this.pushToMemory(line.trimEnd());
    console.log(line.trim());
  }

  logError(message: string): void {
    const ts   = this.formatTime(new Date());
    const line = `[${ts}] [${this.tag}] ERREUR: ${message}\n`;
    fs.appendFileSync(this.filePath, line, 'utf8');
    this.pushToMemory(line.trimEnd());
    console.error(line.trim());
  }

  // ── Accesseurs ────────────────────────────────────────────

  get path(): string { return this.filePath; }

  // 23.2 — Retourne les 50 dernières entrées pour l'endpoint admin
  getRecentLogs(): string[] { return [...this.recentLogs]; }

  // ── Helpers ───────────────────────────────────────────────

  private pushToMemory(line: string): void {
    this.recentLogs.push(line);
    if (this.recentLogs.length > BotLogger.MAX_MEMORY_LINES) this.recentLogs.shift();
  }

  private formatTime(d: Date): string {
    const hh  = String(d.getHours()).padStart(2, '0');
    const mm  = String(d.getMinutes()).padStart(2, '0');
    const ss  = String(d.getSeconds()).padStart(2, '0');
    const ms  = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
  }

  private describeAction(a: ScoredAction): string {
    switch (a.type) {
      case 'build':
        return `BUILD    ${a.targetId}`;
      case 'recruit':
        return `RECRUIT  ${a.targetId} ×${a.count ?? '?'}`;
      case 'attack':
        return `ATTACK   ${a.targetId}  (${this.unitsStr(a.units)})`;
      case 'scout':
        return `SCOUT    ${a.targetId} ×${a.count ?? '?'}`;
      case 'recall':
        return `RECALL   ${a.targetId.slice(-8)}`;
      case 'idle':
        return `IDLE`;
      default:
        return a.debugLabel ?? a.type;
    }
  }

  private unitsStr(units?: Record<string, number>): string {
    if (!units) return '';
    return Object.entries(units)
      .map(([u, n]) => `${u}×${n}`)
      .join(', ');
  }
}
