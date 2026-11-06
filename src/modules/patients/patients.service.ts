import { Injectable, NotFoundException } from '@nestjs/common'
import { paginated, PaginationQueryDto, skipTake } from 'src/common/pagination'
import { Prisma } from 'src/generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import {
  medicamentInclude,
  toDate,
  toMedicamentCreate,
} from '../medicaments/medicament.mapper'
import { ownedPatients, PatientAccessService } from './patient-access.service'
import { CreatePatientDto, UpdatePatientDto } from './patients.dto'

const listSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  gender: true,
  birthDate: true,
  createdAt: true,
  _count: {
    select: { medicaments: { where: { status: 'ACTIVE' } } },
  },
} satisfies Prisma.PatientSelect

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PatientAccessService,
  ) {}

  async list(professionalId: string, query: PaginationQueryDto) {
    const q = query.q?.trim()
    const where: Prisma.PatientWhereInput = {
      ...ownedPatients(professionalId),
      ...(q && {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      }),
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.patient.findMany({
        where,
        select: listSelect,
        orderBy: { name: 'asc' },
        ...skipTake(query),
      }),
      this.prisma.patient.count({ where }),
    ])

    const data = rows.map(({ _count, ...p }) => ({
      ...p,
      activeMedicaments: _count.medicaments,
    }))
    return paginated(data, total, query)
  }

  async get(professionalId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, ...ownedPatients(professionalId) },
      include: {
        medicaments: {
          include: medicamentInclude,
          orderBy: [{ status: 'asc' }, { name: 'asc' }],
        },
        assessments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            professional: { select: { user: { select: { name: true } } } },
          },
        },
      },
    })
    if (!patient) throw new NotFoundException('PATIENT_NOT_FOUND')
    return patient
  }

  create(professionalId: string, dto: CreatePatientDto) {
    const { medicaments, birthDate, address, ...fields } = dto
    return this.prisma.patient.create({
      data: {
        ...fields,
        birthDate: toDate(birthDate),
        address: address ? { ...address } : undefined,
        professionals: { create: { professionalId } },
        medicaments: medicaments?.length
          ? { create: medicaments.map(toMedicamentCreate) }
          : undefined,
      },
      include: { medicaments: { include: medicamentInclude } },
    })
  }

  async update(professionalId: string, id: string, dto: UpdatePatientDto) {
    await this.access.assertPatient(professionalId, id)
    const { birthDate, address, ...fields } = dto
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...fields,
        birthDate: toDate(birthDate),
        // null limpa o endereço; undefined mantém o atual
        address:
          address === null
            ? Prisma.DbNull
            : address
              ? { ...address }
              : undefined,
      },
    })
  }

  /**
   * Remove o vínculo com o profissional. Se nenhum outro profissional
   * acompanha o paciente, apaga o paciente (e, em cascata, seus dados).
   */
  async remove(professionalId: string, id: string) {
    await this.access.assertPatient(professionalId, id)
    await this.prisma.$transaction(async (tx) => {
      await tx.patientProfessional.delete({
        where: { patientId_professionalId: { patientId: id, professionalId } },
      })
      const others = await tx.patientProfessional.count({
        where: { patientId: id },
      })
      if (others === 0) await tx.patient.delete({ where: { id } })
    })
  }
}
