import { Controller, Get, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { Public } from './common/decorators'
import { JwtAuthGuard, RolesGuard } from './common/guards'
import { PrismaExceptionFilter } from './common/prisma-exception.filter'
import { validateEnv } from './config/env.validation'
import { AssessmentsModule } from './modules/assessments/assessments.module'
import { AuthModule } from './modules/auth/auth.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { MedicamentsModule } from './modules/medicaments/medicaments.module'
import { PatientsModule } from './modules/patients/patients.module'
import { UsersModule } from './modules/users/users.module'
import { PrismaModule } from './prisma/prisma.module'
import { PrismaService } from './prisma/prisma.service'

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok' }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // limite global: 100 requisições por minuto por IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    MedicamentsModule,
    AssessmentsModule,
    DashboardModule,
  ],
  controllers: [HealthController],
  providers: [
    // ordem importa: rate limit -> autenticação -> papéis
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
