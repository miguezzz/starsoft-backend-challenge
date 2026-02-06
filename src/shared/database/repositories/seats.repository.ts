import { Injectable } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { seats } from '../schema';

@Injectable()
export class SeatsRepository {
  constructor(private drizzle: DrizzleService) {}

  async create(data: typeof seats.$inferInsert) {
    const [seat] = await this.drizzle.db.insert(seats).values(data).returning();
    return seat;
  }

  async createMany(data: (typeof seats.$inferInsert)[]) {
    return this.drizzle.db.insert(seats).values(data).returning();
  }

  async findById(id: string) {
    const [seat] = await this.drizzle.db
      .select()
      .from(seats)
      .where(eq(seats.id, id));
    return seat;
  }

  async findBySessionId(sessionId: string) {
    return this.drizzle.db
      .select()
      .from(seats)
      .where(eq(seats.sessionId, sessionId));
  }

  async findAvailableBySessionId(sessionId: string) {
    return this.drizzle.db
      .select()
      .from(seats)
      .where(and(eq(seats.sessionId, sessionId), eq(seats.status, 'available')));
  }

  async findByIds(ids: string[]) {
    return this.drizzle.db
      .select()
      .from(seats)
      .where(inArray(seats.id, ids));
  }

  async findByReservationId(reservationId: string) {
    return this.drizzle.db
      .select()
      .from(seats)
      .where(eq(seats.reservationId, reservationId));
  }

  async updateStatus(id: string, status: 'available' | 'reserved' | 'sold') {
    const [updated] = await this.drizzle.db
      .update(seats)
      .set({ status, updatedAt: new Date() })
      .where(eq(seats.id, id))
      .returning();
    return updated;
  }

  async updateManyStatus(
    ids: string[],
    status: 'available' | 'reserved' | 'sold',
    reservationId: string | null = null,
  ) {
    return this.drizzle.db
      .update(seats)
      .set({ status, reservationId, updatedAt: new Date() })
      .where(inArray(seats.id, ids))
      .returning();
  }

  async delete(id: string) {
    await this.drizzle.db.delete(seats).where(eq(seats.id, id));
  }
}
