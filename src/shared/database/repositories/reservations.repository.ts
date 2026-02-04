import { Injectable } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { reservations } from '../schema';

@Injectable()
export class ReservationsRepository {
  constructor(private drizzle: DrizzleService) {}

  async create(data: typeof reservations.$inferInsert) {
    const [reservation] = await this.drizzle.db
      .insert(reservations)
      .values(data)
      .returning();
    return reservation;
  }

  async findById(id: string) {
    const [reservation] = await this.drizzle.db
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    return reservation;
  }

  async findByUserId(userId: string) {
    return this.drizzle.db
      .select()
      .from(reservations)
      .where(eq(reservations.userId, userId));
  }

  async findBySeatId(seatId: string) {
    return this.drizzle.db
      .select()
      .from(reservations)
      .where(eq(reservations.seatId, seatId));
  }

  async findPendingBySeatId(seatId: string) {
    return this.drizzle.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.seatId, seatId),
          eq(reservations.status, 'pending'),
        ),
      );
  }

  async findExpired() {
    return this.drizzle.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.status, 'pending'),
          lt(reservations.expiresAt, new Date()),
        ),
      );
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'confirmed' | 'expired' | 'cancelled',
  ) {
    const [updated] = await this.drizzle.db
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.drizzle.db.delete(reservations).where(eq(reservations.id, id));
  }
}
