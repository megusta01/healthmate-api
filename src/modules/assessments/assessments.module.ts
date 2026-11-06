import { Module } from '@nestjs/common'
import { PatientsModule } from '../patients/patients.module'
import { AssessmentsController } from './assessments.controller'
import { AssessmentsService } from './assessments.service'

@Module({
  imports: [PatientsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
})
export class AssessmentsModule {}
