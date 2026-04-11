import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const frontendUrl    = process.env.FRONTEND_URL || 'http://localhost:3000';
  const allowedOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];

  // Open CORS for static file routes — must come before enableCors()
  const openCors = (_req: any, res: any, next: any) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    if (_req.method === 'OPTIONS') { res.status(204).end(); return; }
    next();
  };

  // /media/ — legacy seeded images
  app.use('/media',   openCors);
  app.use('/media',   express.static(join(process.cwd(), 'media'),   { maxAge: '7d', etag: true }));

  // /uploads/ — all admin-uploaded files
  app.use('/uploads', openCors);
  app.use('/uploads', express.static(join(process.cwd(), 'uploads'), { maxAge: '7d', etag: true }));

  // API CORS — restricted to frontend
  app.enableCors({
    origin: (origin: string | undefined, callback: Function) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods:              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders:       ['Content-Type', 'Authorization'],
    credentials:          true,
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
  console.log(`🌐 CORS allowed: ${allowedOrigins.join(', ')}`);
  console.log(`🖼️  /media/   → ${join(process.cwd(), 'media')}`);
  console.log(`📁  /uploads/ → ${join(process.cwd(), 'uploads')}`);
  console.log('📚 CaliphateMakhtaba API ready');
}
bootstrap();
