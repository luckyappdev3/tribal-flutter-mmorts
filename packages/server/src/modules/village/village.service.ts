import { PrismaClient } from '@prisma/client';

export class VillageService {
  constructor(private prisma: PrismaClient) {}

  async updateResources(villageId: string) {
    const village = await this.prisma.village.findUnique({
      where: { id: villageId },
      include: { buildings: true },
    });

    if (!village) throw new Error('Village non trouvé');

    return village;
  }
}