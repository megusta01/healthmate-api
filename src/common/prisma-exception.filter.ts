import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from 'src/generated/prisma/client'

/**
 * Converte erros conhecidos do Prisma em respostas HTTP coerentes
 * (em vez de 500 genérico).
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name)

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()

    const map: Record<string, [HttpStatus, string]> = {
      P2002: [HttpStatus.CONFLICT, 'ALREADY_EXISTS'],
      P2003: [HttpStatus.BAD_REQUEST, 'INVALID_REFERENCE'],
      P2025: [HttpStatus.NOT_FOUND, 'NOT_FOUND'],
    }

    const [status, message] = map[exception.code] ?? [
      HttpStatus.INTERNAL_SERVER_ERROR,
      'DATABASE_ERROR',
    ]

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception.message, exception.stack)
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(exception.code === 'P2002' && { fields: exception.meta?.target }),
    })
  }
}
