import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { PrismaFilter } from './prisma-filter';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.useGlobalFilters(new PrismaFilter());
  app.enableCors({ origin: (process.env.CORS_ORIGIN || 'http://localhost:3001').split(','), credentials: true });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true }));
  const spec=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle('Campus Orbit API').setVersion('1.0').addBearerAuth().build());
  SwaggerModule.setup('api/docs',app,spec,{useGlobalPrefix:false});
  await app.listen(Number(process.env.PORT)||3000,'0.0.0.0');
}
bootstrap();
