import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { PaginationQueryDto } from 'src/common/pagination'

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value

export class CreateAssessmentDto {
  @ApiPropertyOptional({ example: 'Dor de cabeça leve pela manhã' })
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  symptoms?: string

  @ApiPropertyOptional({ example: 'Tontura após a dose da noite' })
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  sideEffects?: string

  @ApiPropertyOptional({ example: 'Pressão 13x8. Manter conduta.' })
  @Transform(trim)
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  observations?: string
}

export class ListAssessmentsQuery extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  patientId?: string
}
