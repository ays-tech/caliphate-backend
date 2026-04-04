import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    'https://caliphate-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  // ── Media — open CORS before anything else ─────────────────────────
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

  // ── API CORS ────────────────────────────────────────────────────────
  app.enableCors({
    origin: (origin: string | undefined, callback: Function) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Log blocked origins so we can debug
      console.warn(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:   ['Content-Type', 'Authorization'],
    credentials:      true,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: false,
      transform:            true,
      transformOptions:     { enableImplicitConversion: true },
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
  console.log(`🌐 CORS allowed for: ${allowedOrigins.join(', ')}`);
  console.log(`🖼️  Media served at: http://localhost:${port}/media`);
  console.log('📚 CaliphateMakhtaba API ready');
}
bootstrap();