import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { createHash, randomUUID } from 'node:crypto'
import { OAuth2Client } from 'google-auth-library'
import { PrismaService } from 'src/prisma/prisma.service'
import { AccessTokenPayload } from 'src/common/guards'
import { RegisterDto } from './auth.dto'
import { toProfile, UserWithProfessional } from '../users/user.mapper'

const BCRYPT_ROUNDS = 12

interface RefreshTokenPayload {
  sub: string
  jti: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

@Injectable()
export class AuthService {
  private googleClient?: OAuth2Client

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    })
    if (exists) throw new ConflictException('EMAIL_ALREADY_REGISTERED')

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        role: 'PROFESSIONAL',
        professional: {
          create: { specialty: dto.specialty, license: dto.license },
        },
      },
      include: { professional: true },
    })

    return this.authenticate(user)
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { professional: true },
    })

    // mesma mensagem para e-mail inexistente e senha errada (evita enumeração)
    const valid =
      !!user?.passwordHash &&
      (await bcrypt.compare(password, user.passwordHash))
    if (!user || !valid) throw new UnauthorizedException('INVALID_CREDENTIALS')

    return this.authenticate(user)
  }

  async loginWithGoogle(credential: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID')
    if (!clientId)
      throw new ServiceUnavailableException('GOOGLE_LOGIN_DISABLED')

    this.googleClient ??= new OAuth2Client(clientId)
    let payload
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      })
      payload = ticket.getPayload()
    } catch {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID')
    }
    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('GOOGLE_EMAIL_NOT_VERIFIED')
    }

    const email = payload.email.toLowerCase()
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: payload.sub }, { email }] },
      include: { professional: true },
    })

    const user = existing
      ? existing.googleId
        ? existing
        : await this.prisma.user.update({
            where: { id: existing.id },
            data: { googleId: payload.sub },
            include: { professional: true },
          })
      : await this.prisma.user.create({
          data: {
            name: payload.name ?? email.split('@')[0],
            email,
            googleId: payload.sub,
            role: 'PROFESSIONAL',
            professional: { create: { avatarUrl: payload.picture } },
          },
          include: { professional: true },
        })

    return this.authenticate(user)
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('REFRESH_TOKEN_MISSING')

    let payload: RefreshTokenPayload
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      })
    } catch {
      throw new UnauthorizedException('REFRESH_TOKEN_INVALID')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { professional: true },
    })

    if (!user || user.refreshTokenHash !== hashToken(refreshToken)) {
      // token antigo reutilizado => possível roubo: derruba a sessão
      if (user) await this.revoke(user.id)
      throw new UnauthorizedException('REFRESH_TOKEN_REVOKED')
    }

    return this.authenticate(user)
  }

  async revoke(userId: string) {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { refreshTokenHash: null },
    })
  }

  /** Revoga a sessão a partir do refresh token (usado no logout). */
  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return
    try {
      const { sub } = await this.jwt.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') },
      )
      await this.revoke(sub)
    } catch {
      // token já inválido: nada a revogar
    }
  }

  private async authenticate(user: UserWithProfessional) {
    if (!user.isActive) throw new ForbiddenException('USER_INACTIVE')

    const tokens = await this.issueTokens(user)
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(tokens.refreshToken) },
    })

    return { user: toProfile(user), tokens }
  }

  private async issueTokens(user: UserWithProfessional): Promise<AuthTokens> {
    const access: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      pid: user.professional?.id ?? null,
    }
    const refresh: RefreshTokenPayload = { sub: user.id, jti: randomUUID() }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(access, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_TTL', '15m'),
      }),
      this.jwt.signAsync(refresh, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_TTL', '7d'),
      }),
    ])

    return { accessToken, refreshToken }
  }
}

/** Tokens têm alta entropia: SHA-256 basta (bcrypt truncaria em 72 bytes). */
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
