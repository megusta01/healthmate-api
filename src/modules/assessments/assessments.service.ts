import { BadRequestException, Injectable } from '@nestjs/common'
import { paginated, skipTake } from 'src/common/pagination'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  ownedPatients,
  PatientAccessService,
} from '../patients/patient-access.service'
import { CreateAssessmentDto, ListAssessmentsQuery } from './assessments.dto'

const include = {
  patient: { select: { id: true, name: true } },
  professional: { select: { user: { select: { name: true } } } },
} satisfies Prisma.HealthAssessmentInclude

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PatientAccessService,
  ) {}

  async list(professionalId: string, query: ListAssessmentsQuery) {
    const q = query.q?.trim()
    const where: Prisma.HealthAssessmentWhereInput = {
      patient: ownedPatients(professionalId),
      ...(query.patientId && { patientId: query.patientId }),
      ...(q && {
        OR: [
          { patient: { name: { contains: q, mode: 'insensitive' } } },
          { symptoms: { contains: q, mode: 'insensitive' } },
          { sideEffects: { contains: q, mode: 'insensitive' } },
          { observations: { contains: q, mode: 'insensitive' } },
        ],
      }),
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.healthAssessment.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query),
      }),
      this.prisma.healthAssessment.count({ where }),
    ])
    return paginated(data, total, query)
  }

  async create(
    professionalId: string,
    patientId: string,
    dto: CreateAssessmentDto,
  ) {
    if (!dto.symptoms && !dto.sideEffects && !dto.observations) {
      throw new BadRequestException('ASSESSMENT_EMPTY')
    }
    await this.access.assertPatient(professionalId, patientId)
    return this.prisma.healthAssessment.create({
      data: { ...dto, patientId, professionalId },
      include,
    })
  }

  async remove(professionalId: string, id: string) {
    await this.access.assertAssessment(professionalId, id)
    await this.prisma.healthAssessment.delete({ where: { id } })
  }
}
