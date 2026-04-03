import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'https://caliphate-frontend.vercel.app',
        'http://localhost:3000',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  app.setGlobalPrefix('api');
  
  // ── Serve backend/media/ as static files at /media ─────────────────
  // e.g. http://localhost:3001/media/ibn_khaldun.webp
  // Works identically on local and VPS — no R2 or extra config needed
  app.use(
    '/media',
    express.static(join(process.cwd(), 'media'), {
      maxAge: '7d',         // browser caches images for 7 days
      etag: true,           // supports conditional requests
      lastModified: true,
    }),
  );



  // ── Global validation pipe ──────────────────────────────────────────
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
  console.log('📚 CaliphateMakhtaba API ready to use');
}
bootstrap();
