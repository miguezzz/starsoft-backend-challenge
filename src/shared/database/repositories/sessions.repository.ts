import { Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { sessions } from '../schema';

@Injectable()
export class SessionsRepository {
  constructor(private drizzle: DrizzleService) {}

  async create(data: typeof sessions.$inferInsert) {
    const [session] = await this.drizzle.db.insert(sessions).values(data).returning();
    return session;
  }

  async findById(id: string) {
    const [session] = await this.drizzle.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id));
    return session;
  }

  async findAll() {
    return this.drizzle.db.select().from(sessions);
  }

  async findUpcoming() {
    return this.drizzle.db
      .select()
      .from(sessions)
      .where(eq(sessions.startTime, new Date()));
  }

  async update(id: string, data: Partial<typeof sessions.$inferInsert>) {
    const [updated] = await this.drizzle.db
      .update(sessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return updated;
  }

  async delete(id: string) {
    await this.drizzle.db.delete(sessions).where(eq(sessions.id, id));
  }
}
