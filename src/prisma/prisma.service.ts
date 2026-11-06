import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from 'src/generated/prisma/client'

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name)

  constructor(config: ConfigService) {
    const ssl = config.get('DATABASE_SSL') === 'true'
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
        ...(ssl && { ssl: { rejectUnauthorized: false } }),
      }),
      log:
        config.get('NODE_ENV') === 'development'
          ? ['warn', 'error']
          : ['error'],
    })
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log('Conectado ao banco de dados')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
