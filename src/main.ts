import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { AppModule } from './app.module';
import { join } from 'path';
import * as express from 'express';
import { existsSync } from 'fs';


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

  // ── Serve backend/media/ as static files at /media ──────────────────
  // Try multiple paths for dev and production
  let mediaPath: string;
  
  // Try 1: From dist/ in production (dist -> ../media)
  mediaPath = join(__dirname, '..', 'media');
  console.log(`📁 Trying path 1: ${mediaPath}`);
  
  if (!existsSync(mediaPath)) {
    // Try 2: From cwd in development (backend/media)
    mediaPath = join(process.cwd(), 'media');
    console.log(`📁 Trying path 2: ${mediaPath}`);
  }
  
  if (!existsSync(mediaPath)) {
    // Try 3: From cwd parent + backend (if running from project root)
    mediaPath = join(process.cwd(), 'backend', 'media');
    console.log(`📁 Trying path 3: ${mediaPath}`);
  }

  console.log(`📁 Final media path: ${mediaPath}`);
  
  if (existsSync(mediaPath)) {
    console.log('✓ Media directory found, serving now...');
    app.use(
      '/media',
      (req: any, res: any, next: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        next();
      },
      express.static(join(process.cwd(), 'media'), {
        maxAge: '7d',
        etag: true,
        lastModified: true,
      }),
    );
  } else {
    console.error('❌ Media directory not found in any expected location!');
    console.error(`   Searched paths:`);
    console.error(`   1. ${join(__dirname, '..', 'media')}`);
    console.error(`   2. ${join(process.cwd(), 'media')}`);
    console.error(`   3. ${join(process.cwd(), 'backend', 'media')}`);
  }

  app.setGlobalPrefix('api');



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
