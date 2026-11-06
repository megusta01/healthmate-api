/**
 * Dados de demonstração. Rode com: npm run db:seed
 * Login: demo@healthmate.app / Demo12345
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'
import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
  }),
})

async function main() {
  const email = 'demo@healthmate.app'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Seed já aplicado (${email}). Nada a fazer.`)
    return
  }

  const user = await prisma.user.create({
    data: {
      name: 'Dra. Camila Rocha',
      email,
      phone: '(11) 98888-1234',
      passwordHash: await bcrypt.hash('Demo12345', 12),
      professional: {
        create: {
          specialty: 'Enfermagem — Saúde do Idoso',
          license: 'COREN-SP 000000',
          bio: 'Acompanhamento domiciliar de pacientes crônicos.',
        },
      },
    },
    include: { professional: true },
  })
  const professionalId = user.professional!.id

  const patients = [
    {
      name: 'João da Silva',
      gender: 'MALE' as const,
      birthDate: new Date('1952-03-21'),
      phone: '(11) 97777-6666',
      bloodType: 'O+',
      weight: 82,
      height: 1.71,
      address: {
        street: 'Rua das Flores',
        number: '120',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01001-000',
      },
      medicaments: [
        {
          name: 'Losartana',
          dosage: '50 mg',
          quantity: 4,
          times: ['08:00', '20:00'],
        },
        {
          name: 'Metformina',
          dosage: '850 mg',
          quantity: 56,
          times: ['12:30'],
        },
      ],
      assessment: {
        symptoms: 'Tontura leve ao levantar',
        observations: 'PA 13x8. Orientado a levantar devagar.',
      },
    },
    {
      name: 'Maria Oliveira',
      gender: 'FEMALE' as const,
      birthDate: new Date('1964-11-02'),
      phone: '(11) 96666-5555',
      bloodType: 'A+',
      weight: 64.5,
      height: 1.6,
      address: {
        street: 'Av. Paulista',
        number: '900',
        complement: 'Apto 51',
        city: 'São Paulo',
        state: 'SP',
      },
      medicaments: [
        {
          name: 'Levotiroxina',
          dosage: '75 mcg',
          quantity: 28,
          times: ['06:30'],
        },
        {
          name: 'Sinvastatina',
          dosage: '20 mg',
          quantity: 2,
          times: ['21:00'],
        },
      ],
      assessment: {
        sideEffects: 'Dor muscular leve nas pernas',
        observations: 'Avaliar troca da estatina na próxima consulta.',
      },
    },
    {
      name: 'Carlos Lima',
      gender: 'MALE' as const,
      birthDate: new Date('1985-07-14'),
      phone: '(21) 95555-4444',
      bloodType: 'B-',
      medicaments: [
        {
          name: 'Amoxicilina',
          dosage: '500 mg',
          quantity: 15,
          times: ['07:00', '15:00', '23:00'],
        },
      ],
      assessment: {
        symptoms: 'Dor de garganta, febre baixa',
        observations: 'Início de antibiótico por 7 dias.',
      },
    },
  ]

  for (const { medicaments, assessment, ...data } of patients) {
    await prisma.patient.create({
      data: {
        ...data,
        professionals: { create: { professionalId } },
        assessments: { create: { ...assessment, professionalId } },
        medicaments: {
          create: medicaments.map(({ times, ...m }) => ({
            ...m,
            reminders: { create: times.map((time) => ({ time })) },
          })),
        },
      },
    })
  }

  console.log(`Seed concluído. Login: ${email} / Demo12345`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
