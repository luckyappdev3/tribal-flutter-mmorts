import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

export class AuthService {
  constructor(
    private prisma:  PrismaClient,
    private fastify: FastifyInstance,
  ) {}

  async register(data: {
    username: string;
    email:    string;
    password: string;
  }) {
    const existing = await this.prisma.player.findFirst({
      where: { OR: [{ email: data.email }, { username: data.username }] },
    });
    if (existing) throw new Error('Email ou Pseudo déjà utilisé');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Crée uniquement le Player — le village est créé au démarrage de la partie (Phase 8)
    return this.prisma.player.create({
      data: {
        username: data.username,
        email:    data.email,
        password: hashedPassword,
      },
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