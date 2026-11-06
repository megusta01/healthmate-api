import { BadRequestException } from '@nestjs/common'
import { Prisma } from 'src/generated/prisma/client'
import { CreateMedicamentDto, UpdateMedicamentDto } from './medicaments.dto'

/** "2026-11-05" -> Date (meia-noite UTC), compatível com coluna DATE. */
export const toDate = (value?: string | null) =>
  value === undefined ? undefined : value === null ? null : new Date(value)

function assertPeriod(dto: UpdateMedicamentDto) {
  if (dto.startDate && dto.endDate && dto.endDate < dto.startDate) {
    throw new BadRequestException('END_DATE_BEFORE_START_DATE')
  }
}

/** Dados de criação (aninhável em patient.create). */
export function toMedicamentCreate(
  dto: CreateMedicamentDto,
): Prisma.MedicamentCreateWithoutPatientInput {
  assertPeriod(dto)
  const { times, startDate, endDate, ...fields } = dto
  return {
    ...fields,
    startDate: toDate(startDate),
    endDate: toDate(endDate),
    reminders: times?.length
      ? { create: [...times].sort().map((time) => ({ time })) }
      : undefined,
  }
}

export function toMedicamentUpdate(
  dto: UpdateMedicamentDto,
): Prisma.MedicamentUpdateInput {
  assertPeriod(dto)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { times, startDate, endDate, ...fields } = dto
  return { ...fields, startDate: toDate(startDate), endDate: toDate(endDate) }
}

export const medicamentInclude = {
  reminders: { orderBy: { time: 'asc' } },
} satisfies Prisma.MedicamentInclude
