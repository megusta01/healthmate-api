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
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser, CurrentUser, Roles } from 'src/common/decorators'
import { PaginationQueryDto } from 'src/common/pagination'
import { requireProfessional } from './patient-access.service'
import { CreatePatientDto, UpdatePatientDto } from './patients.dto'
import { PatientsService } from './patients.service'

@ApiTags('patients')
@Roles('PROFESSIONAL')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista paginada dos pacientes do profissional (busca por `q`)',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.patients.list(requireProfessional(user), query)
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra paciente (opcionalmente com medicamentos)',
  })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePatientDto) {
    return this.patients.create(requireProfessional(user), dto)
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Ficha completa: dados, medicamentos, lembretes e avaliações',
  })
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.patients.get(requireProfessional(user), id)
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(requireProfessional(user), id, dto)
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.patients.remove(requireProfessional(user), id)
  }
}
