import { ConflictException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { AuthService } from './auth.service'
import { durationToMs } from './auth.cookies'

const config = new ConfigService({
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
})

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    name: 'Ana',
    email: 'ana@x.com',
    passwordHash: bcrypt.hashSync('SenhaForte123', 4),
    googleId: null,
    phone: null,
    role: 'PROFESSIONAL',
    isActive: true,
    refreshTokenHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    professional: {
      id: 'p1',
      specialty: null,
      license: null,
      bio: null,
      avatarUrl: null,
    },
    ...overrides,
  }
}

describe('AuthService', () => {
  let prisma: { user: Record<string, jest.Mock> }
  let service: AuthService

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn(),
      },
    }
    service = new AuthService(prisma as any, new JwtService({}), config)
  })

  it('não expõe hashes no perfil retornado', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser())
    const { user, tokens } = await service.login('ana@x.com', 'SenhaForte123')

    expect(user).not.toHaveProperty('passwordHash')
    expect(user).not.toHaveProperty('refreshTokenHash')
    expect(user.professional?.id).toBe('p1')
    expect(tokens.accessToken).toBeTruthy()
  })

  it('recusa senha errada e e-mail inexistente com a mesma mensagem', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(makeUser())
    await expect(service.login('ana@x.com', 'errada')).rejects.toThrow(
      new UnauthorizedException('INVALID_CREDENTIALS'),
    )

    prisma.user.findUnique.mockResolvedValueOnce(null)
    await expect(service.login('nao@existe.com', 'x')).rejects.toThrow(
      new UnauthorizedException('INVALID_CREDENTIALS'),
    )
  })

  it('recusa login por senha em conta só-Google', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: null }))
    await expect(service.login('ana@x.com', 'qualquer')).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('impede cadastro com e-mail repetido', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' })
    await expect(
      service.register({
        name: 'Ana',
        email: 'ana@x.com',
        password: 'SenhaForte123',
      }),
    ).rejects.toThrow(ConflictException)
  })

  it('revoga a sessão quando um refresh token antigo é reutilizado', async () => {
    prisma.user.findUnique.mockResolvedValue(makeUser())
    const { tokens } = await service.login('ana@x.com', 'SenhaForte123')

    // banco guarda o hash de OUTRO token (o atual) -> o enviado é antigo
    prisma.user.findUnique.mockResolvedValue(
      makeUser({ refreshTokenHash: 'hash-de-outro-token' }),
    )
    await expect(service.refresh(tokens.refreshToken)).rejects.toThrow(
      new UnauthorizedException('REFRESH_TOKEN_REVOKED'),
    )
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { refreshTokenHash: null },
    })
  })
})

describe('durationToMs', () => {
  it.each([
    ['15m', 900_000],
    ['7d', 604_800_000],
    ['30s', 30_000],
    ['2h', 7_200_000],
  ])('%s -> %d', (input, expected) => {
    expect(durationToMs(input)).toBe(expected)
  })

  it('falha com formato inválido', () => {
    expect(() => durationToMs('15 minutos')).toThrow()
  })
})
