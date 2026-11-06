import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser, CurrentUser, Roles } from 'src/common/decorators'
import { requireProfessional } from '../patients/patient-access.service'
import {
  CreateMedicamentDto,
  UpdateMedicamentDto,
  UpdateReminderDto,
} from './medicaments.dto'
import { MedicamentsService } from './medicaments.service'

@ApiTags('medicaments')
@Roles('PROFESSIONAL')
@Controller()
export class MedicamentsController {
  constructor(private readonly medicaments: MedicamentsService) {}

  @Get('patients/:patientId/medicaments')
  @ApiOperation({ summary: 'Medicamentos de um paciente' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.medicaments.listByPatient(requireProfessional(user), patientId)
  }

  @Post('patients/:patientId/medicaments')
  @ApiOperation({ summary: 'Adiciona medicamento (e lembretes via `times`)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateMedicamentDto,
  ) {
    return this.medicaments.create(requireProfessional(user), patientId, dto)
  }

  @Patch('medicaments/:id')
  @ApiOperation({
    summary: 'Atualiza medicamento; `times` substitui os horários',
  })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicamentDto,
  ) {
    return this.medicaments.update(requireProfessional(user), id, dto)
  }

  @Delete('medicaments/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.medicaments.remove(requireProfessional(user), id)
  }

  @Get('reminders/today')
  @ApiOperation({ summary: 'Agenda de lembretes do dia (todos os pacientes)' })
  today(@CurrentUser() user: AuthUser) {
    return this.medicaments.todayReminders(requireProfessional(user))
  }

  @Patch('reminders/:id')
  @ApiOperation({ summary: 'Ativa/pausa ou edita um lembrete' })
  updateReminder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.medicaments.updateReminder(requireProfessional(user), id, dto)
  }

  @Delete('reminders/:id')
  @HttpCode(204)
  async removeReminder(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.medicaments.removeReminder(requireProfessional(user), id)
  }
}
