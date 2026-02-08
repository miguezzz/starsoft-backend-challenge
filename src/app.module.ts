import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './shared/database';
import { RedisModule } from './shared/redis';
import { SessionsModule } from './modules/sessions/sessions.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SalesModule } from './modules/sales/sales.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // BullMQ configuration - usa mesma instância Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
        defaultJobOptions: {
          attempts: 3, // Retry até 3 vezes
          backoff: {
            type: 'exponential',
            delay: 1000, // Começar com 1s, depois 2s, 4s
            jitter: 0.3, // variação pra evitar thundering herd (banco atolado com retries),
          },
          removeOnComplete: {
            age: 3600, // Remover jobs completos após 1 hora
            count: 1000, // Manter apenas últimos 1000
          },
          removeOnFail: {
            age: 86400, // Remover jobs falhados após 24 horas
          },
        },
      }),
    }),
    DatabaseModule,
    RedisModule,
    SessionsModule,
    ReservationsModule,
    SalesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
