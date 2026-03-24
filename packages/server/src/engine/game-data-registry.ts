import * as fs from 'fs';
import * as path from 'path';
import { BuildingDefinition, BuildingDefinitionSchema, UnitDefinition, UnitDefinitionSchema } from '@mmorts/shared';

export class GameDataRegistry {
  private buildings = new Map<string, BuildingDefinition>();
  private units     = new Map<string, UnitDefinition>();

  constructor() {}

  public async loadAll() {
    const sharedPath   = path.resolve(__dirname, '../../../shared/game-data');
    const buildingsPath = path.join(sharedPath, 'buildings');
    const unitsPath     = path.join(sharedPath, 'units');

    console.log(`🔍 Chargement des données de jeu depuis : ${sharedPath}`);

    // Chargement des bâtiments
    if (!fs.existsSync(buildingsPath)) {
      throw new Error(`⚠️ Dossier buildings introuvable : ${buildingsPath}`);
    }
    for (const file of fs.readdirSync(buildingsPath)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw    = JSON.parse(fs.readFileSync(path.join(buildingsPath, file), 'utf-8'));
        const result = BuildingDefinitionSchema.safeParse(raw);
        if (result.success) {
          this.buildings.set(result.data.id, result.data);
          console.log(`✅ Bâtiment chargé : '${result.data.id}'`);
        } else {
          console.error(`❌ Validation échouée pour ${file}:`, result.error.message);
        }
      } catch {
        console.error(`❌ Impossible de lire : ${file}`);
      }
    }

    // Chargement des unités
    if (!fs.existsSync(unitsPath)) {
      console.warn(`⚠️ Dossier units introuvable : ${unitsPath}`);
      return;
    }
    for (const file of fs.readdirSync(unitsPath)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw    = JSON.parse(fs.readFileSync(path.join(unitsPath, file), 'utf-8'));
        const result = UnitDefinitionSchema.safeParse(raw);
        if (result.success) {
          this.units.set(result.data.id, result.data);
          console.log(`✅ Unité chargée : '${result.data.id}'`);
        } else {
          console.error(`❌ Validation échouée pour ${file}:`, result.error.message);
        }
      } catch {
        console.error(`❌ Impossible de lire : ${file}`);
      }
    }
  }

  public getBuildingDef(id: string): BuildingDefinition {
    const b = this.buildings.get(id);
    if (!b) throw new Error(`Bâtiment introuvable dans le registre : ${id}`);
    return b;
  }

  public getUnitDef(id: string): UnitDefinition {
    const u = this.units.get(id);
    if (!u) throw new Error(`Unité introuvable dans le registre : ${id}`);
    return u;
  }

  public getAllUnits(): UnitDefinition[] {
    return Array.from(this.units.values()).sort((a, b) => a.order - b.order);
  }

  public getAllBuildings(): BuildingDefinition[] {
    return Array.from(this.buildings.values()).sort((a, b) => a.order - b.order);
  }
}
