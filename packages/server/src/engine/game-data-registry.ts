import * as fs from 'fs';
import * as path from 'path';
import { BuildingDefinition, BuildingDefinitionSchema } from '@mmorts/shared'; 

export class GameDataRegistry {
  private buildings = new Map<string, BuildingDefinition>();

  // On enlève l'appel automatique dans le constructeur pour mieux contrôler le démarrage
  constructor() {}

  // On change le nom pour "loadAll" et on la met en public
  public async loadAll() {
    // Chemin robuste : on remonte de packages/server/src/engine vers packages/shared
    const buildingsPath = path.resolve(__dirname, '../../../shared/game-data/buildings');
    
    console.log(`🔍 Recherche des données dans : ${buildingsPath}`);

    if (!fs.existsSync(buildingsPath)) {
      throw new Error(`⚠️ Dossier GameData introuvable : ${buildingsPath}`);
    }

    const files = fs.readdirSync(buildingsPath);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(buildingsPath, file);
        try {
            const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const result = BuildingDefinitionSchema.safeParse(rawData);

            if (result.success) {
              this.buildings.set(result.data.id, result.data);
              console.log(`✅ GameData: Bâtiment '${result.data.id}' chargé.`);
            } else {
              console.error(`❌ Erreur de validation dans ${file}:`, result.error.message);
            }
        } catch (e) {
            console.error(`❌ Impossible de lire le fichier ${file}`);
        }
      }
    });
  }

  public getBuildingDef(id: string): BuildingDefinition {
    const b = this.buildings.get(id);
    if (!b) throw new Error(`Bâtiment introuvable dans le registre : ${id}`);
    return b;
  }
}

// On exporte la CLASSE, pas l'instance, pour pouvoir l'instancier proprement dans le bootstrap