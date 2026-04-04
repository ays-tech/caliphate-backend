import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS — restricted to your frontend for API routes
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  // ── Media files — open CORS so any browser/device can load images ──
  app.use('/media', (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.removeHeader('Access-Control-Allow-Credentials');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.use(
    '/media',
    express.static(join(process.cwd(), 'media'), {
      maxAge: '7d',
      etag: true,
      lastModified: true,
    }),
  );

  // ── Global validation pipe ─────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const messages = errors.map((e) =>
          Object.values(e.constraints || {}).join(', '),
        );
        return new BadRequestException(messages);
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`🖼️  Media files served at http://localhost:${port}/media`);
  console.log('📚 CaliphateMakhtaba API ready');
}
bootstrap();