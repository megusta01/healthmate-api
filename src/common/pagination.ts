import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 10

  @ApiPropertyOptional({ description: 'Busca por texto' })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  q?: string
}

export interface Paginated<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export function skipTake({ page, limit }: PaginationQueryDto) {
  return { skip: (page - 1) * limit, take: limit }
}

export function paginated<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationQueryDto,
): Paginated<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  }
}
