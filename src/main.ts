import { Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get(ConfigService)

  app.setGlobalPrefix('api')
  // atrás do proxy do Next/Vercel/Render: usa o IP real do cliente no rate limit
  app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cookieParser())
  app.enableCors({
    origin: config
      .get<string>('FRONTEND_URL', 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim()),
    credentials: true,
  })
  app.enableShutdownHooks()

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  if (config.get('NODE_ENV') !== 'production') {
    const doc = new DocumentBuilder()
      .setTitle('HealthMate API')
      .setDescription(
        'Pacientes, medicamentos, lembretes e avaliações de saúde',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('hm_access')
      .build()
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc))
  }

  const port = config.get<number>('PORT', 3333)
  await app.listen(port)
  Logger.log(`API rodando em http://localhost:${port}/api`, 'Bootstrap')
}

void bootstrap()
