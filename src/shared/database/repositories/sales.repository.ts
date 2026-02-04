import { Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { sales } from '../schema';

@Injectable()
export class SalesRepository {
  constructor(private drizzle: DrizzleService) {}

  async create(data: typeof sales.$inferInsert) {
    const [sale] = await this.drizzle.db.insert(sales).values(data).returning();
    return sale;
  }

  async findById(id: string) {
    const [sale] = await this.drizzle.db
      .select()
      .from(sales)
      .where(eq(sales.id, id));
    return sale;
  }

  async findByUserId(userId: string) {
    return this.drizzle.db
      .select()
      .from(sales)
      .where(eq(sales.userId, userId))
      .orderBy(desc(sales.confirmedAt));
  }

  async findBySessionId(sessionId: string) {
    return this.drizzle.db
      .select()
      .from(sales)
      .where(eq(sales.sessionId, sessionId));
  }

  async findByReservationId(reservationId: string) {
    const [sale] = await this.drizzle.db
      .select()
      .from(sales)
      .where(eq(sales.reservationId, reservationId));
    return sale;
  }

  async delete(id: string) {
    await this.drizzle.db.delete(sales).where(eq(sales.id, id));
  }
}
