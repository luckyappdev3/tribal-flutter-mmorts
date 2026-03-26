// ─────────────────────────────────────────────────────────────
// TEST SCENARIOS — A vs H
// ─────────────────────────────────────────────────────────────
import { resolveBattle, resolveScout, computeSiegeDamages, UnitGroup } from './formulas/combat.formulas';

// ── Stats unités ─────────────────────────────────────────────
const UNITS: Record<string, Omit<UnitGroup, 'count' | 'unitType'>> = {
  spearman:       { attack: 10,  defenseGeneral: 15,  defenseCavalry: 45,  defenseArcher: 20,  carryCapacity: 25,  category: 'infantry' },
  swordsman:      { attack: 25,  defenseGeneral: 50,  defenseCavalry: 15,  defenseArcher: 40,  carryCapacity: 15,  category: 'infantry' },
  axeman:         { attack: 40,  defenseGeneral: 10,  defenseCavalry: 5,   defenseArcher: 10,  carryCapacity: 10,  category: 'infantry' },
  archer:         { attack: 15,  defenseGeneral: 50,  defenseCavalry: 40,  defenseArcher: 5,   carryCapacity: 10,  category: 'archer'   },
  scout:          { attack: 0,   defenseGeneral: 2,   defenseCavalry: 1,   defenseArcher: 2,   carryCapacity: 0,   category: 'cavalry'  },
  light_cavalry:  { attack: 130, defenseGeneral: 30,  defenseCavalry: 40,  defenseArcher: 30,  carryCapacity: 80,  category: 'cavalry'  },
  mounted_archer: { attack: 120, defenseGeneral: 40,  defenseCavalry: 30,  defenseArcher: 50,  carryCapacity: 50,  category: 'archer'   },
  heavy_cavalry:  { attack: 150, defenseGeneral: 200, defenseCavalry: 80,  defenseArcher: 180, carryCapacity: 50,  category: 'cavalry'  },
  ram:            { attack: 2,   defenseGeneral: 20,  defenseCavalry: 50,  defenseArcher: 20,  carryCapacity: 0,   category: 'siege'    },
  catapult:       { attack: 100, defenseGeneral: 100, defenseCavalry: 50,  defenseArcher: 100, carryCapacity: 0,   category: 'siege'    },
  paladin:        { attack: 150, defenseGeneral: 250, defenseCavalry: 400, defenseArcher: 150, carryCapacity: 100, category: 'hero'     },
  noble:          { attack: 0,   defenseGeneral: 100, defenseCavalry: 50,  defenseArcher: 100, carryCapacity: 0,   category: 'conquest' },
};

function mkUnits(map: Record<string, number>): UnitGroup[] {
  return Object.entries(map)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ unitType: type, count, ...UNITS[type] }));
}

// ── Helpers affichage ─────────────────────────────────────────
let passed = 0; let failed = 0;
function ok(label: string, cond: boolean) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else       { console.log(`  ❌ ${label}`); failed++; }
}
function section(title: string) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(62));
}
function wallBonus(lvl: number) { return lvl <= 0 ? 1.0 : Math.pow(1.037, Math.min(lvl, 20)); }

// ─────────────────────────────────────────────────────────────
// S1 — Wall brute force - No Rams
// attacker: axe×6000 + light×3000   defender: spear×3000 + sword×3000  mur20
// ─────────────────────────────────────────────────────────────
section('S1 — Wall brute force - No Rams');
{
  const atk = mkUnits({ axeman: 6000, light_cavalry: 3000 });
  const def = mkUnits({ spearman: 3000, swordsman: 3000 });
  const r   = resolveBattle(atk, def, { wallLevel: 20, ramCount: 0 });

  const atkPow = 6000*40 + 3000*130;
  const defInf = 6000*40 / (6000*40 + 3000*130);
  const defCav = 3000*130 / (6000*40 + 3000*130);
  const wBonus = wallBonus(20);
  const defPow = (3000*(15*defInf+45*defCav) + 3000*(50*defInf+15*defCav)) * wBonus;
  console.log(`  Att power: ${atkPow.toFixed(0)} | Def power (mur20): ${defPow.toFixed(0)}`);
  console.log(`  Wall bonus ×${wBonus.toFixed(3)} | Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Pertes att: axe=${r.attackerLosses['axeman']} light=${r.attackerLosses['light_cavalry']}`);
  console.log(`  Pertes def: spear=${r.defenderLosses['spearman']} sword=${r.defenderLosses['swordsman']}`);
  ok('S1 — Attaquant gagne (nuke 6k axe + 3k lcav dépasse mur20)', r.attackerWon);
  ok('S1 — Mur effectif = 20 (0 béliers)', r.effectiveWallLevel === 20);
}

// ─────────────────────────────────────────────────────────────
// S2 — Standard Nuke with Rams
// attacker: axe×6000 + light×3000 + ram×213   defender: spear×3000 + sword×3000  mur20
// ─────────────────────────────────────────────────────────────
section('S2 — Standard Nuke with Rams');
{
  const atk = mkUnits({ axeman: 6000, light_cavalry: 3000, ram: 213 });
  const def = mkUnits({ spearman: 3000, swordsman: 3000 });
  const r   = resolveBattle(atk, def, { wallLevel: 20, ramCount: 213 });

  // 213 béliers → floor(213/20)=10 niveaux réduits → max(10, 20-10)=10 → mur effectif=10
  const expectedWall = Math.max(Math.floor(20/2), Math.max(0, 20 - Math.floor(213/20)));
  console.log(`  Mur effectif: ${r.effectiveWallLevel} (attendu ${expectedWall}) | Bonus ×${wallBonus(r.effectiveWallLevel).toFixed(3)}`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Pertes att: axe=${r.attackerLosses['axeman']} light=${r.attackerLosses['light_cavalry']} ram=${r.attackerLosses['ram']}`);
  const ramsSurvived = 213 - (r.attackerLosses['ram'] ?? 213);
  const wallDmg = Math.floor(ramsSurvived * 2 / 50);
  console.log(`  Béliers survivants: ${ramsSurvived} → -${wallDmg} niveau(x) mur permanent`);
  ok('S2 — Attaquant gagne avec béliers', r.attackerWon);
  ok('S2 — Mur effectif = 10 (213 béliers → -10)', r.effectiveWallLevel === expectedWall);
}

// ─────────────────────────────────────────────────────────────
// S3 — Catapult Precision - Smithy (smith niv20 ciblé)
// attacker: axe×1000 + catapult×50   defender: spear×200  mur0
// ─────────────────────────────────────────────────────────────
section('S3 — Catapult Precision - Smithy (smith niv20)');
{
  const atk = mkUnits({ axeman: 1000, catapult: 50 });
  const def = mkUnits({ spearman: 200 });
  const r   = resolveBattle(atk, def, { wallLevel: 0, ramCount: 0 });

  const initialCats = 50;
  const lostCats    = r.attackerWon ? (r.attackerLosses['catapult'] ?? 0) : initialCats;
  const siegeDmg    = computeSiegeDamages(0, initialCats, lostCats, 'smith', { smith: 20, wall: 0 });

  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Cats perdues: ${lostCats} | Cats effectives: ${(initialCats * (1 - Math.pow(lostCats/initialCats, 1.5))).toFixed(1)}`);
  console.log(`  Dégâts forge: ${JSON.stringify(siegeDmg)}`);
  ok('S3 — Victoire attaquant', r.attackerWon);
  ok('S3 — Forge endommagée (< 20)', (siegeDmg['smith']?.to ?? 20) < 20);
  ok('S3 — Forge non détruite (> 0)', (siegeDmg['smith']?.to ?? 0) > 0);
}

// ─────────────────────────────────────────────────────────────
// S4 — Cavalry vs Infantry focus
// attacker: light×1000   defender: sword×1000  mur0
// ─────────────────────────────────────────────────────────────
section('S4 — Cavalry vs Infantry focus');
{
  const atk = mkUnits({ light_cavalry: 1000 });
  const def = mkUnits({ swordsman: 1000 });
  const r   = resolveBattle(atk, def, { wallLevel: 0 });

  // Défense pondérée : 100% cavalerie → defCav
  const atkPow = 1000 * 130;
  const defPow = 1000 * 15; // sword defCavalry=15
  const winPct = Math.pow(Math.min(atkPow,defPow)/Math.max(atkPow,defPow), 1.5);
  console.log(`  Att: ${atkPow} | Def (cav): ${defPow} | winnerPct: ${(winPct*100).toFixed(1)}%`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Pertes att light: ${r.attackerLosses['light_cavalry']} | Pertes def sword: ${r.defenderLosses['swordsman']}`);
  ok('S4 — Cavalerie légère écrase épéistes', r.attackerWon);
  ok('S4 — Pertes légères (< 50%)', (r.attackerLosses['light_cavalry'] ?? 1000) < 500);
}

// ─────────────────────────────────────────────────────────────
// S5 — Virtual Wall Min Threshold
// attacker: axe×1000 + ram×500   defender: spear×5000 + sword×5000  mur20
// ─────────────────────────────────────────────────────────────
section('S5 — Virtual Wall Min Threshold (500 béliers vs mur20)');
{
  const atk = mkUnits({ axeman: 1000, ram: 500 });
  const def = mkUnits({ spearman: 5000, swordsman: 5000 });
  const r   = resolveBattle(atk, def, { wallLevel: 20, ramCount: 500 });

  // 500 béliers → floor(500/20)=25 → max(floor(20/2)=10, 20-25=-5→0) → max(10, 0) = 10
  const expectedWall = Math.max(Math.floor(20/2), Math.max(0, 20 - Math.floor(500/20)));
  console.log(`  Mur effectif: ${r.effectiveWallLevel} (attendu ${expectedWall} = plancher niv/2)`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  ok('S5 — Défenseur gagne (trop peu d\'offensifs)', !r.attackerWon);
  ok('S5 — Mur effectif plafonné à niv/2=10', r.effectiveWallLevel === 10);
}

// ─────────────────────────────────────────────────────────────
// S6 — Rally Point Snipe
// attacker: axe×100 + catapult×1   defender: spear×10  mur0  cible: rally_point
// ─────────────────────────────────────────────────────────────
section('S6 — Rally Point Snipe (1 catapulte)');
{
  const atk = mkUnits({ axeman: 100, catapult: 1 });
  const def = mkUnits({ spearman: 10 });
  const r   = resolveBattle(atk, def, { wallLevel: 0 });

  const initialCats = 1;
  const lostCats    = r.attackerWon ? (r.attackerLosses['catapult'] ?? 0) : initialCats;
  const siegeDmg    = computeSiegeDamages(0, initialCats, lostCats, 'rally_point', { rally_point: 1, wall: 0 });

  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Dégâts rally_point: ${JSON.stringify(siegeDmg)}`);
  ok('S6 — Victoire attaquant', r.attackerWon);
  ok('S6 — Rally_point → 0 (règle spéciale)', siegeDmg['rally_point']?.to === 0);
}

// ─────────────────────────────────────────────────────────────
// S7 — Spy vs Spy combat
// attacker: scout×100   defender: scout×40  mur0
// ─────────────────────────────────────────────────────────────
section('S7 — Spy vs Spy (100 att vs 40 def)');
{
  const r = resolveScout(100, 40);

  // tauxPertes = min(1, 2*(40/100)^2) = 2*0.16 = 0.32
  const expectedLossRate = Math.min(1, 2 * Math.pow(40/100, 2));
  const expectedLost     = Math.ceil(100 * expectedLossRate);
  console.log(`  Taux pertes att: ${(expectedLossRate*100).toFixed(1)}% → perdus: ${expectedLost}`);
  console.log(`  Survivants: ${r.scoutsSurvived} | Ratio: ${(r.survivorRatio*100).toFixed(1)}% | Tier: ${r.tier}`);
  console.log(`  Scouts def tués: ${r.defenderScoutsKilled}`);
  ok('S7 — Attaquant espionnage réussi (tier > 0)', r.tier > 0);
  ok('S7 — Pertes att conformes formule', r.scoutsLost === expectedLost);
  ok('S7 — Scouts def éliminés', r.defenderScoutsKilled > 0);
  ok('S7 — Tier ≥ 2 (>50% survivants)', r.tier >= 2);
}

// ─────────────────────────────────────────────────────────────
// S8 — Archer Defense Efficiency
// attacker: axe×1000   defender: archer×400  mur10
// ─────────────────────────────────────────────────────────────
section('S8 — Archer Defense Efficiency (axe vs archer mur10)');
{
  const atk = mkUnits({ axeman: 1000 });
  const def = mkUnits({ archer: 400 });
  const r   = resolveBattle(atk, def, { wallLevel: 10 });

  // Attaque 100% infanterie → def pondérée = defGeneral
  const atkPow = 1000 * 40;
  const wB     = wallBonus(10);
  const defPow = 400 * 50 * wB; // archer defGeneral=50
  console.log(`  Att: ${atkPow} | Def (archers+mur10): ${defPow.toFixed(0)} | Bonus ×${wB.toFixed(3)}`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Pertes att axe: ${r.attackerLosses['axeman']} | Pertes def archer: ${r.defenderLosses['archer']}`);
  ok('S8 — Attaquant gagne (40k > 28.7k malgré mur10)', r.attackerWon);
}

// ─────────────────────────────────────────────────────────────
// S9 — Ram Suicide - Wall Scratches
// attacker: ram×100   defender: sword×50  mur20
// ─────────────────────────────────────────────────────────────
section('S9 — Ram Suicide - Wall Scratches (100 béliers vs 50 épéistes mur20)');
{
  const atk = mkUnits({ ram: 100 });
  const def = mkUnits({ swordsman: 50 });
  const r   = resolveBattle(atk, def, { wallLevel: 20, ramCount: 100 });

  // 100 béliers → floor(100/20)=5 → max(10, 20-5=15) → mur effectif=15
  const expectedWall = Math.max(Math.floor(20/2), Math.max(0, 20 - Math.floor(100/20)));
  const ramsSurvived = r.attackerWon ? Math.max(0, 100 - (r.attackerLosses['ram'] ?? 100)) : 0;
  const wallPermDmg  = Math.floor(ramsSurvived * 2 / 50);
  const siegeDmg     = computeSiegeDamages(ramsSurvived, 0, 0, null, { wall: 20 });

  console.log(`  Mur effectif pré-combat: ${r.effectiveWallLevel} (attendu ${expectedWall})`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Béliers perdus: ${r.attackerLosses['ram']} | Survivants: ${ramsSurvived}`);
  console.log(`  Dégâts mur permanent: ${JSON.stringify(siegeDmg)}`);
  ok('S9 — Mur effectif = 15 (100 béliers)', r.effectiveWallLevel === expectedWall);
  if (r.attackerWon) {
    ok('S9 — Mur réduit si victoire', (siegeDmg['wall']?.to ?? 20) < 20);
  } else {
    ok('S9 — Béliers morts → 0 dégât mur permanent', Object.keys(siegeDmg).length === 0);
  }
}

// ─────────────────────────────────────────────────────────────
// S10 — Exponent 1.5 Calibration
// attacker: axe×1000   defender: spear×1000  mur0
// ─────────────────────────────────────────────────────────────
section('S10 — Exponent 1.5 Calibration (axe vs spear équilibré)');
{
  const atk = mkUnits({ axeman: 1000 });
  const def = mkUnits({ spearman: 1000 });
  const r   = resolveBattle(atk, def, { wallLevel: 0 });

  // 100% inf → def pondérée = defGeneral
  const atkPow = 1000 * 40;
  const defPow = 1000 * 15;
  const winPct = Math.pow(defPow / atkPow, 1.5); // perdant/gagnant
  console.log(`  Att: ${atkPow} | Def: ${defPow} | winnerPct: ${(winPct*100).toFixed(2)}%`);
  console.log(`  Résultat: ${r.attackerWon ? 'VICTOIRE' : 'DÉFAITE'}`);
  console.log(`  Pertes att axe: ${r.attackerLosses['axeman']} (attendu ~${Math.ceil(1000*winPct)})`);
  console.log(`  Pertes def spear: ${r.defenderLosses['spearman']}`);
  ok('S10 — Attaquant gagne (40 > 15)', r.attackerWon);
  ok('S10 — Pertes att conformes (winnerPct^1.5)', r.attackerLosses['axeman'] === Math.ceil(1000 * winPct));
  ok('S10 — Défenseur éliminé à 100%', r.defenderLosses['spearman'] === 1000);
}

// ─────────────────────────────────────────────────────────────
// RÉSUMÉ
// ─────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(62)}`);
console.log(`  RÉSUMÉ`);
console.log('═'.repeat(62));
console.log(`\n  ${passed + failed}/${passed + failed} tests exécutés`);
console.log(`  ${passed}/${passed + failed} tests ✅   ${failed} ❌\n`);
