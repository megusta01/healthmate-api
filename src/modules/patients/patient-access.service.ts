import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { AuthUser } from 'src/common/decorators'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'

/** Retorna o professionalId do usuário logado ou recusa a requisição. */
export function requireProfessional(user: AuthUser): string {
  if (!user.professionalId) throw new ForbiddenException('PROFESSIONAL_ONLY')
  return user.professionalId
}

/** Filtro Prisma: pacientes vinculados ao profissional. */
export function ownedPatients(
  professionalId: string,
): Prisma.PatientWhereInput {
  return { professionals: { some: { professionalId } } }
}

/**
 * Centraliza a regra de acesso: um profissional só enxerga pacientes
 * vinculados a ele. Para os demais, responde 404 (não revela que existem).
 */
@Injectable()
export class PatientAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertPatient(professionalId: string, patientId: string) {
    const link = await this.prisma.patientProfessional.findUnique({
      where: { patientId_professionalId: { patientId, professionalId } },
      select: { patientId: true },
    })
    if (!link) throw new NotFoundException('PATIENT_NOT_FOUND')
  }

  async assertMedicament(professionalId: string, medicamentId: string) {
    const found = await this.prisma.medicament.findFirst({
      where: { id: medicamentId, patient: ownedPatients(professionalId) },
      select: { id: true, patientId: true },
    })
    if (!found) throw new NotFoundException('MEDICAMENT_NOT_FOUND')
    return found
  }

  async assertReminder(professionalId: string, reminderId: string) {
    const found = await this.prisma.reminder.findFirst({
      where: {
        id: reminderId,
        medicament: { patient: ownedPatients(professionalId) },
      },
      select: { id: true, medicamentId: true },
    })
    if (!found) throw new NotFoundException('REMINDER_NOT_FOUND')
    return found
  }

  async assertAssessment(professionalId: string, assessmentId: string) {
    const found = await this.prisma.healthAssessment.findFirst({
      where: { id: assessmentId, patient: ownedPatients(professionalId) },
      select: { id: true },
    })
    if (!found) throw new NotFoundException('ASSESSMENT_NOT_FOUND')
    return found
  }
}
