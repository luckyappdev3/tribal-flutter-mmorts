import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

export class AuthService {
  constructor(private prisma: PrismaClient, private fastify: FastifyInstance) {}

  async register(data: any) {
    // Vérification de l'existence
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] }
    });
    if (existing) throw new Error("Email ou Pseudo déjà utilisé");

    const hashedPassword = await bcrypt.hash(data.password, 10);

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