import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  ownedPatients,
  PatientAccessService,
} from '../patients/patient-access.service'
import {
  medicamentInclude,
  toMedicamentCreate,
  toMedicamentUpdate,
} from './medicament.mapper'
import {
  CreateMedicamentDto,
  UpdateMedicamentDto,
  UpdateReminderDto,
} from './medicaments.dto'

@Injectable()
export class MedicamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PatientAccessService,
  ) {}

  async listByPatient(professionalId: string, patientId: string) {
    await this.access.assertPatient(professionalId, patientId)
    return this.prisma.medicament.findMany({
      where: { patientId },
      include: medicamentInclude,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    })
  }

  async create(
    professionalId: string,
    patientId: string,
    dto: CreateMedicamentDto,
  ) {
    await this.access.assertPatient(professionalId, patientId)
    return this.prisma.medicament.create({
      data: {
        ...toMedicamentCreate(dto),
        patient: { connect: { id: patientId } },
      },
      include: medicamentInclude,
    })
  }

  async update(professionalId: string, id: string, dto: UpdateMedicamentDto) {
    await this.access.assertMedicament(professionalId, id)

    return this.prisma.$transaction(async (tx) => {
      // `times` substitui a lista de horários: remove os que saíram, cria os novos
      if (dto.times) {
        await tx.reminder.deleteMany({
          where: { medicamentId: id, time: { notIn: dto.times } },
        })
        await tx.reminder.createMany({
          data: dto.times.map((time) => ({ medicamentId: id, time })),
          skipDuplicates: true,
        })
      }
      return tx.medicament.update({
        where: { id },
        data: toMedicamentUpdate(dto),
        include: medicamentInclude,
      })
    })
  }

  async remove(professionalId: string, id: string) {
    await this.access.assertMedicament(professionalId, id)
    await this.prisma.medicament.delete({ where: { id } })
  }

  /** Lembretes ativos de hoje, de todos os pacientes do profissional. */
  todayReminders(professionalId: string) {
    return this.prisma.reminder.findMany({
      where: {
        isActive: true,
        medicament: {
          status: 'ACTIVE',
          patient: ownedPatients(professionalId),
        },
      },
      include: {
        medicament: {
          select: {
            id: true,
            name: true,
            dosage: true,
            quantity: true,
            patient: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: [{ time: 'asc' }, { medicament: { name: 'asc' } }],
    })
  }

  async updateReminder(
    professionalId: string,
    id: string,
    dto: UpdateReminderDto,
  ) {
    await this.access.assertReminder(professionalId, id)
    return this.prisma.reminder.update({ where: { id }, data: dto })
  }

  async removeReminder(professionalId: string, id: string) {
    await this.access.assertReminder(professionalId, id)
    await this.prisma.reminder.delete({ where: { id } })
  }
}
