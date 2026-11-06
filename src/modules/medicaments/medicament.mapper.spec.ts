import { BadRequestException } from '@nestjs/common'
import { toMedicamentCreate, toMedicamentUpdate } from './medicament.mapper'

describe('medicament.mapper', () => {
  it('cria lembretes ordenados a partir de `times`', () => {
    const data = toMedicamentCreate({
      name: 'Losartana',
      times: ['20:00', '08:00'],
      startDate: '2026-11-01',
    })

    expect(data.reminders).toEqual({
      create: [{ time: '08:00' }, { time: '20:00' }],
    })
    expect(data.startDate).toEqual(new Date('2026-11-01T00:00:00.000Z'))
    expect(data).not.toHaveProperty('times')
  })

  it('não cria lembretes quando não há horários', () => {
    expect(toMedicamentCreate({ name: 'X' }).reminders).toBeUndefined()
  })

  it('rejeita data final anterior à inicial', () => {
    expect(() =>
      toMedicamentUpdate({ startDate: '2026-11-10', endDate: '2026-11-01' }),
    ).toThrow(BadRequestException)
  })

  it('no update, campos ausentes continuam undefined (não sobrescrevem)', () => {
    expect(toMedicamentUpdate({ quantity: 3 })).toEqual({
      quantity: 3,
      startDate: undefined,
      endDate: undefined,
    })
  })
})
