import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // ── Media middleware FIRST — before global CORS ────────────────────
  // Open wildcard CORS only for /media/ image files
  app.use('/media', (req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    if (req.method === 'OPTIONS') return res.status(204).end();
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

  // ── API CORS — restricted to your frontend only ────────────────────
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

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
  console.log(`🌐 CORS allowed for: ${frontendUrl}`);
  console.log(`🖼️  Media served at: http://localhost:${port}/media`);
  console.log('📚 CaliphateMakhtaba API ready');
}
bootstrap();