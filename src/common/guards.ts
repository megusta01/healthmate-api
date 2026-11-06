import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'
import { Role } from 'src/generated/prisma/enums'
import { AuthUser, IS_PUBLIC_KEY, ROLES_KEY } from './decorators'
import { ACCESS_COOKIE } from 'src/modules/auth/auth.cookies'

export interface AccessTokenPayload {
  sub: string
  role: Role
  pid: string | null
}

/**
 * Guard global: toda rota exige access token válido, exceto as marcadas com @Public().
 * Aceita o token no cookie httpOnly (navegador) ou no header Authorization: Bearer (Swagger, apps).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request = context.switchToHttp().getRequest<Request>()
    const token = this.extractToken(request)
    if (!token) throw new UnauthorizedException('TOKEN_MISSING')

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      })
      const user: AuthUser = {
        userId: payload.sub,
        role: payload.role,
        professionalId: payload.pid,
      }
      ;(request as Request & { user: AuthUser }).user = user
      return true
    } catch {
      throw new UnauthorizedException('TOKEN_INVALID')
    }
  }

  private extractToken(request: Request): string | undefined {
    const fromCookie = request.cookies?.[ACCESS_COOKIE]
    if (fromCookie) return fromCookie

    const [type, value] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? value : undefined
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true

    const user: AuthUser | undefined = context.switchToHttp().getRequest().user
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('FORBIDDEN_ROLE')
    }
    return true
  }
}
