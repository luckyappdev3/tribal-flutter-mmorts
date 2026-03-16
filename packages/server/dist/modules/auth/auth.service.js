"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class AuthService {
    prisma;
    fastify;
    constructor(prisma, fastify) {
        this.prisma = prisma;
        this.fastify = fastify;
    }
    async register(data) {
        // Vérification de l'existence
        const existing = await this.prisma.player.findFirst({
            where: { OR: [{ email: data.email }, { username: data.username }] }
        });
        if (existing)
            throw new Error("Email ou Pseudo déjà utilisé");
        const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
        // Création du Player + Village de départ
        return await this.prisma.player.create({
            data: {
                username: data.username,
                email: data.email,
                password: hashedPassword,
                villages: {
                    create: {
                        name: `Village de ${data.username}`,
                        x: Math.floor(Math.random() * 100),
                        y: Math.floor(Math.random() * 100),
                        buildings: {
                            create: [
                                { buildingId: 'headquarters', level: 1 },
                                { buildingId: 'timber_camp', level: 1 }
                            ]
                        }
                    }
                }
            },
            include: { villages: true }
        });
    }
    async login(email, pass) {
        const player = await this.prisma.player.findUnique({ where: { email } });
        if (!player)
            throw new Error();
        const isMatch = await bcrypt_1.default.compare(pass, player.password);
        if (!isMatch)
            throw new Error();
        return player;
    }
    generateToken(player) {
        return this.fastify.jwt.sign({ id: player.id, username: player.username });
    }
}
exports.AuthService = AuthService;
