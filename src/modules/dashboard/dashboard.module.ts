import { Controller, Get, Module } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser, CurrentUser, Roles } from 'src/common/decorators'
import { MedicamentsModule } from '../medicaments/medicaments.module'
import { requireProfessional } from '../patients/patient-access.service'
import { DashboardService } from './dashboard.service'

@ApiTags('dashboard')
@Roles('PROFESSIONAL')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Resumo para a tela inicial' })
  summary(@CurrentUser() user: AuthUser) {
    return this.dashboard.summary(requireProfessional(user))
  }
}

@Module({
  imports: [MedicamentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
