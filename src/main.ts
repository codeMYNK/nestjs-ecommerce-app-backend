import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //Project Description
  app.setGlobalPrefix('api/v1');

  //Set Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  //Enable CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  //Enable Swagger Docs
  // const config = new DocumentBuilder()
  //   .setTitle('API Documentation')
  //   .setDescription('API Documentation for application')
  //   .setVersion('1.0')
  //   .addTag('auth', 'Authentication related endpoints')
  //   .addBearerAuth(
  //     {
  //       type: 'http',
  //       scheme: 'bearer',
  //       bearerFormat: 'JWT',
  //       name: 'JWT',
  //       description: 'Enter JWT Token',
  //       in: 'header',
  //     },
  //     'JWT-auth',
  //   )
  //   .addBearerAuth(
  //     {
  //       type: 'http',
  //       scheme: 'bearer',
  //       bearerFormat: 'JWT',
  //       name: 'Refresh-JWT',
  //       description: 'Enter refresh JWT Token',
  //       in: 'header',
  //     },
  //     'Refresh-JWT-auth',
  //   )
  //   .addServer('http://localhost:8080/', 'Development Server')
  //   .addServer(
  //     'https://nestjs-ecommerce-app-backend.onrender.com/',
  //     'Production Server',
  //   )
  //   .build();

  const configBuilder = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API Documentation for application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication related endpoints')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT' },
      'JWT-auth',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Refresh-JWT',
      },
      'Refresh-JWT-auth',
    );

  // Agar NODE_ENV production hai toh Render ka URL pehle dikhega, nahi toh localhost
  if (process.env.NODE_ENV === 'production') {
    configBuilder.addServer(
      'https://nestjs-ecommerce-app-backend.onrender.com/',
      'Production Server',
    );
  } else {
    configBuilder.addServer('http://localhost:8080/', 'Development Server');
    configBuilder.addServer(
      'https://nestjs-ecommerce-app-backend.onrender.com/',
      'Production Server',
    ); // Optional: Local par dono dekhne ke liye
  }

  const config = configBuilder.build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: `
      .swagger-ui .topbar {display: none}
      .swagger-ui .info { margin: 50px 0;}
      .swagger-ui .info .title {color: #4A90E2}
    `,
  });

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap().catch((error) => {
  Logger.error('Error starting server ', error);
  process.exit(1);
});
