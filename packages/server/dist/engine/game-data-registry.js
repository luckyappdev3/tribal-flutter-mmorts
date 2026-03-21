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
    units = new Map();
    constructor() { }
    async loadAll() {
        const sharedPath = path.resolve(__dirname, '../../../shared/game-data');
        const buildingsPath = path.join(sharedPath, 'buildings');
        const unitsPath = path.join(sharedPath, 'units');
        console.log(`🔍 Chargement des données de jeu depuis : ${sharedPath}`);
        // Chargement des bâtiments
        if (!fs.existsSync(buildingsPath)) {
            throw new Error(`⚠️ Dossier buildings introuvable : ${buildingsPath}`);
        }
        for (const file of fs.readdirSync(buildingsPath)) {
            if (!file.endsWith('.json'))
                continue;
            try {
                const raw = JSON.parse(fs.readFileSync(path.join(buildingsPath, file), 'utf-8'));
                const result = shared_1.BuildingDefinitionSchema.safeParse(raw);
                if (result.success) {
                    this.buildings.set(result.data.id, result.data);
                    console.log(`✅ Bâtiment chargé : '${result.data.id}'`);
                }
                else {
                    console.error(`❌ Validation échouée pour ${file}:`, result.error.message);
                }
            }
            catch {
                console.error(`❌ Impossible de lire : ${file}`);
            }
        }
        // Chargement des unités
        if (!fs.existsSync(unitsPath)) {
            console.warn(`⚠️ Dossier units introuvable : ${unitsPath}`);
            return;
        }
        for (const file of fs.readdirSync(unitsPath)) {
            if (!file.endsWith('.json'))
                continue;
            try {
                const raw = JSON.parse(fs.readFileSync(path.join(unitsPath, file), 'utf-8'));
                const result = shared_1.UnitDefinitionSchema.safeParse(raw);
                if (result.success) {
                    this.units.set(result.data.id, result.data);
                    console.log(`✅ Unité chargée : '${result.data.id}'`);
                }
                else {
                    console.error(`❌ Validation échouée pour ${file}:`, result.error.message);
                }
            }
            catch {
                console.error(`❌ Impossible de lire : ${file}`);
            }
        }
    }
    getBuildingDef(id) {
        const b = this.buildings.get(id);
        if (!b)
            throw new Error(`Bâtiment introuvable dans le registre : ${id}`);
        return b;
    }
    getUnitDef(id) {
        const u = this.units.get(id);
        if (!u)
            throw new Error(`Unité introuvable dans le registre : ${id}`);
        return u;
    }
    getAllUnits() {
        return Array.from(this.units.values());
    }
    getAllBuildings() {
        return Array.from(this.buildings.values());
    }
}
exports.GameDataRegistry = GameDataRegistry;
