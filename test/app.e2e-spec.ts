/**
 * Testes ponta a ponta contra um banco REAL (use um banco de teste!).
 * Requer DATABASE_URL e segredos JWT no .env. Rode: npm run test:e2e
 * Não apaga dados: cada execução usa e-mails únicos.
 */
import 'dotenv/config'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { AppModule } from '../src/app.module'

describe('HealthMate API (e2e)', () => {
  let app: INestApplication
  const run = Date.now()
  let agentA: ReturnType<typeof request.agent>
  let agentB: ReturnType<typeof request.agent>
  let patientId: string
  let medicamentId: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()
    app = moduleRef.createNestApplication()
    app.setGlobalPrefix('api')
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    await app.init()
    agentA = request.agent(app.getHttpServer())
    agentB = request.agent(app.getHttpServer())
  })

  afterAll(() => app.close())

  it('bloqueia rotas sem login', () =>
    request(app.getHttpServer()).get('/api/patients').expect(401))

  it('cadastra profissionais e já autentica via cookie', async () => {
    const res = await agentA
      .post('/api/auth/register')
      .send({
        name: 'Ana',
        email: `ana+${run}@teste.com`,
        password: 'SenhaForte123',
      })
      .expect(201)
    expect(res.body).not.toHaveProperty('passwordHash')
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('HttpOnly')]),
    )

    await agentB
      .post('/api/auth/register')
      .send({
        name: 'Bruno',
        email: `bruno+${run}@teste.com`,
        password: 'SenhaForte123',
      })
      .expect(201)
  })

  it('cria paciente com medicamento e lembretes numa única requisição', async () => {
    const res = await agentA
      .post('/api/patients')
      .send({
        name: 'João',
        birthDate: '1960-01-01',
        medicaments: [
          { name: 'Losartana', quantity: 2, times: ['20:00', '08:00'] },
        ],
      })
      .expect(201)
    patientId = res.body.id
    medicamentId = res.body.medicaments[0].id
    expect(res.body.medicaments[0].reminders.map((r: any) => r.time)).toEqual([
      '08:00',
      '20:00',
    ])
  })

  it('outro profissional não enxerga nem altera o paciente', async () => {
    await agentB.get(`/api/patients/${patientId}`).expect(404)
    await agentB
      .patch(`/api/medicaments/${medicamentId}`)
      .send({ quantity: 0 })
      .expect(404)
    const list = await agentB.get('/api/patients').expect(200)
    expect(list.body.meta.total).toBe(0)
  })

  it('dashboard aponta estoque baixo', async () => {
    const res = await agentA.get('/api/dashboard').expect(200)
    expect(res.body.totals).toMatchObject({
      patients: 1,
      lowStock: 1,
      remindersToday: 2,
    })
  })

  it('logout invalida a sessão', async () => {
    await agentA.post('/api/auth/logout').expect(204)
    await agentA.get('/api/auth/me').expect(401)
    await agentA.post('/api/auth/refresh').expect(401)
  })
})
