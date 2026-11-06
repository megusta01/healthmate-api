import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/prisma/prisma.service'
import { MedicamentsService } from '../medicaments/medicaments.service'
import { ownedPatients } from '../patients/patient-access.service'

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly medicaments: MedicamentsService,
  ) {}

  async summary(professionalId: string) {
    const patientFilter = ownedPatients(professionalId)
    const activeMedicament = {
      status: 'ACTIVE' as const,
      patient: patientFilter,
    }
    const lowStock = {
      ...activeMedicament,
      // compara duas colunas: quantity <= low_stock_at
      quantity: { lte: this.prisma.medicament.fields.lowStockAt },
    }

    const [
      patients,
      activeMedicaments,
      lowStockCount,
      recentPatients,
      lowStockMedicaments,
      recentAssessments,
      reminders,
    ] = await Promise.all([
      this.prisma.patient.count({ where: patientFilter }),
      this.prisma.medicament.count({ where: activeMedicament }),
      this.prisma.medicament.count({ where: lowStock }),
      this.prisma.patient.findMany({
        where: patientFilter,
        select: { id: true, name: true, birthDate: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.medicament.findMany({
        where: lowStock,
        select: {
          id: true,
          name: true,
          dosage: true,
          quantity: true,
          lowStockAt: true,
          patient: { select: { id: true, name: true } },
        },
        orderBy: { quantity: 'asc' },
        take: 5,
      }),
      this.prisma.healthAssessment.findMany({
        where: { patient: patientFilter },
        include: { patient: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.medicaments.todayReminders(professionalId),
    ])

    return {
      totals: {
        patients,
        activeMedicaments,
        lowStock: lowStockCount,
        remindersToday: reminders.length,
      },
      recentPatients,
      lowStockMedicaments,
      recentAssessments,
      // o front filtra os próximos pelo relógio local do usuário
      reminders,
    }
  }
}
