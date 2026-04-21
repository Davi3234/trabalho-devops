import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '@infrastructure/generated/client'
import { env } from '@shared/env'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

  constructor() {
    super({
      adapter: PrismaService.createAdapter()
    })
  }

  private static createAdapter() {
    const connectionString = env('DATABASE_URL')
    return new PrismaPg({ connectionString })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
