import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { AuthUser, CurrentUser, Public } from 'src/common/decorators'
import { UsersService } from '../users/users.service'
import { GoogleLoginDto, LoginDto, RegisterDto } from './auth.dto'
import {
  clearAuthCookies,
  CookieSettings,
  durationToMs,
  REFRESH_COOKIE,
  setAuthCookies,
} from './auth.cookies'
import { AuthService } from './auth.service'

/** Limite mais rígido nas rotas sensíveis: 10 requisições/minuto por IP. */
const STRICT = { default: { limit: 10, ttl: 60_000 } }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookies: CookieSettings

  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    config: ConfigService,
  ) {
    const production = config.get('NODE_ENV') === 'production'
    this.cookies = {
      secure: production,
      sameSite: config.get('COOKIE_SAMESITE') ?? 'lax',
      accessTtlMs: durationToMs(config.get('JWT_ACCESS_TTL', '15m')),
      refreshTtlMs: durationToMs(config.get('JWT_REFRESH_TTL', '7d')),
    }
  }

  @Public()
  @Throttle(STRICT)
  @Post('register')
  @ApiOperation({ summary: 'Cadastra um profissional e já inicia a sessão' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.register(dto)
    setAuthCookies(res, tokens, this.cookies)
    return user
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login com e-mail e senha (define cookies httpOnly)',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.login(dto.email, dto.password)
    setAuthCookies(res, tokens, this.cookies)
    return user
  }

  @Public()
  @Throttle(STRICT)
  @Post('google')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Login/cadastro com Google (ID token do Google Identity Services)',
  })
  async google(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.auth.loginWithGoogle(dto.credential)
    setAuthCookies(res, tokens, this.cookies)
    return user
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Renova o access token usando o refresh token (cookie)',
  })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { user, tokens } = await this.auth.refresh(
        req.cookies?.[REFRESH_COOKIE],
      )
      setAuthCookies(res, tokens, this.cookies)
      return user
    } catch (error) {
      clearAuthCookies(res, this.cookies)
      throw error
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Encerra a sessão e revoga o refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE])
    clearAuthCookies(res, this.cookies)
  }

  @Get('me')
  @ApiOperation({ summary: 'Usuário autenticado' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.getProfile(user.userId)
  }
}
