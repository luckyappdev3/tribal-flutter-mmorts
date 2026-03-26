import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';
import { BotService } from '../../bot/bot.service';

export class AuthService {
  constructor(
    private prisma:      PrismaClient,
    private fastify:     FastifyInstance,
    private botService?: BotService,
  ) {}

  async register(data: {
    username:      string;
    email:         string;
    password:      string;
    botDifficulty?: number;
  }) {
    // Vérification de l'existence
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] }
    });
    if (existing) throw new Error("Email ou Pseudo déjà utilisé");

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const level = Math.max(1, Math.min(10, data.botDifficulty ?? 5));

    // Rattacher au premier monde ouvert disponible
    const world = await this.prisma.gameWorld.findFirst({ where: { isOpen: true } });

    // Création du Player + Village de départ
    const player = await this.prisma.player.create({
      data: {
        username:     data.username,
        email:        data.email,
        password:     hashedPassword,
        botDifficulty: level,
        villages: {
          create: {
            name: `Village de ${data.username}`,
            x: Math.floor(Math.random() * 41),
            y: Math.floor(Math.random() * 41),
            ...(world ? { worldId: world.id } : {}),
            buildings: {
              create: [
                { buildingId: 'headquarters', level: 1 },
                { buildingId: 'timber_camp',  level: 1 },
                { buildingId: 'quarry',       level: 1 },
                { buildingId: 'iron_mine',    level: 1 },
                { buildingId: 'warehouse',    level: 1 },
                { buildingId: 'barracks',     level: 1 },
              ]
            }
          }
        }
      },
      include: { villages: true }
    });

    // Spawner 1 bot au niveau choisi par le joueur (non-bloquant)
    if (this.botService) {
      this.botService.spawnBotsForPlayer(player.id, level, 1).catch(err =>
        console.error('[AuthService] Erreur spawn bot :', err),
      );
    }

    return player;
  }

  async login(email: string, pass: string) {
    const player = await this.prisma.player.findUnique({ where: { email } });
    if (!player) throw new Error();

    const isMatch = await bcrypt.compare(pass, player.password);
    if (!isMatch) throw new Error();

    return player;
  }

  generateToken(player: { id: string, username: string }) {
    return this.fastify.jwt.sign({ id: player.id, username: player.username });
  }
}