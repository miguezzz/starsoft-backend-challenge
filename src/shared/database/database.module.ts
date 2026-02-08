import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleService } from './drizzle.service';
import { SessionsRepository } from './repositories/sessions.repository';
import { SeatsRepository } from './repositories/seats.repository';
import { ReservationsRepository } from './repositories/reservations.repository';
import { SalesRepository } from './repositories/sales.repository';
import { UsersRepository } from './repositories/users.repository';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DrizzleService,
    SessionsRepository,
    SeatsRepository,
    ReservationsRepository,
    SalesRepository,
    UsersRepository,
  ],
  exports: [
    DrizzleService,
    SessionsRepository,
    SeatsRepository,
    ReservationsRepository,
    SalesRepository,
    UsersRepository,
  ],
})
export class DatabaseModule {}
