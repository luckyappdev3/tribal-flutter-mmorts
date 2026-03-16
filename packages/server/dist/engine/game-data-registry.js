"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameDataRegistry = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const shared_1 = require("@mmorts/shared");
class GameDataRegistry {
    buildings = new Map();
    // On enlève l'appel automatique dans le constructeur pour mieux contrôler le démarrage
    constructor() { }
    // On change le nom pour "loadAll" et on la met en public
    async loadAll() {
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
                    const result = shared_1.BuildingDefinitionSchema.safeParse(rawData);
                    if (result.success) {
                        this.buildings.set(result.data.id, result.data);
                        console.log(`✅ GameData: Bâtiment '${result.data.id}' chargé.`);
                    }
                    else {
                        console.error(`❌ Erreur de validation dans ${file}:`, result.error.message);
                    }
                }
                catch (e) {
                    console.error(`❌ Impossible de lire le fichier ${file}`);
                }
            }
        });
    }
    getBuildingDef(id) {
        const b = this.buildings.get(id);
        if (!b)
            throw new Error(`Bâtiment introuvable dans le registre : ${id}`);
        return b;
    }
}
exports.GameDataRegistry = GameDataRegistry;
// On exporte la CLASSE, pas l'instance, pour pouvoir l'instancier proprement dans le bootstrap
