import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthUser, CurrentUser, Roles } from 'src/common/decorators'
import { requireProfessional } from '../patients/patient-access.service'
import { CreateAssessmentDto, ListAssessmentsQuery } from './assessments.dto'
import { AssessmentsService } from './assessments.service'

@ApiTags('assessments')
@Roles('PROFESSIONAL')
@Controller()
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get('assessments')
  @ApiOperation({
    summary: 'Relatórios/avaliações (filtro por paciente e busca)',
  })
  list(@CurrentUser() user: AuthUser, @Query() query: ListAssessmentsQuery) {
    return this.assessments.list(requireProfessional(user), query)
  }

  @Post('patients/:patientId/assessments')
  @ApiOperation({ summary: 'Registra uma avaliação de saúde do paciente' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateAssessmentDto,
  ) {
    return this.assessments.create(requireProfessional(user), patientId, dto)
  }

  @Delete('assessments/:id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assessments.remove(requireProfessional(user), id)
  }
}
