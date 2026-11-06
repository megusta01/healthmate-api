import { plainToInstance, Type } from 'class-transformer'
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator'

export class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV: 'development' | 'production' | 'test' = 'development'

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  PORT: number = 3333

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string

  /** "true" liga SSL na conexão com o banco (sem validar a CA do Supabase) */
  @IsBooleanString()
  @IsOptional()
  DATABASE_SSL?: string

  @IsString()
  @IsOptional()
  FRONTEND_URL = 'http://localhost:3000'

  /** "lax" quando o front faz proxy de /api (recomendado); "none" se front e API estão em domínios diferentes */
  @IsIn(['lax', 'strict', 'none'])
  @IsOptional()
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none' = 'lax'

  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET precisa de 32+ caracteres' })
  JWT_ACCESS_SECRET: string

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET precisa de 32+ caracteres' })
  JWT_REFRESH_SECRET: string

  @IsString()
  @IsOptional()
  JWT_ACCESS_TTL = '15m'

  @IsString()
  @IsOptional()
  JWT_REFRESH_TTL = '7d'

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID?: string
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validated, { skipMissingProperties: false })

  if (errors.length > 0) {
    const details = errors
      .map(
        (e) =>
          `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('\n')
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`)
  }

  return validated
}
