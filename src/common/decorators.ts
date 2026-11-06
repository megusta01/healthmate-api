import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common'
import { Role } from 'src/generated/prisma/enums'

export const IS_PUBLIC_KEY = 'isPublic'
/** Libera a rota do guard de autenticação global. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const ROLES_KEY = 'roles'
/** Restringe a rota a determinados papéis. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles)

/** Dados do usuário autenticado, extraídos do access token. */
export interface AuthUser {
  userId: string
  role: Role
  /** id em `professionals` — presente quando role = PROFESSIONAL */
  professionalId: string | null
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest().user,
)
