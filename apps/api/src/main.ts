import { ValidationPipe } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join, resolve } from 'path';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const prismaService = app.get(PrismaService);
  const port = Number(process.env.PORT ?? 3100);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const uploadDir = process.env.UPLOAD_DIR
    ? resolve(process.cwd(), process.env.UPLOAD_DIR)
    : join(process.cwd(), 'uploads');
  const staticDir = process.env.STATIC_DIR
    ? resolve(process.cwd(), process.env.STATIC_DIR)
    : resolve(process.cwd(), '../../bibi-box (2)/static');

  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'auth/wechat', method: RequestMethod.POST },
      { path: 'health', method: RequestMethod.GET },
    ],
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });
  app.useStaticAssets(staticDir, {
    prefix: '/static/',
  });

  await prismaService.enableShutdownHooks(app);
  await app.listen(port, host);
}

void bootstrap();
