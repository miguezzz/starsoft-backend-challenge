import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../drizzle.service';
import { users } from '../schema';

@Injectable()
export class UsersRepository {
  constructor(private drizzle: DrizzleService) {}

  async create(data: typeof users.$inferInsert) {
    const [user] = await this.drizzle.db.insert(users).values(data).returning();
    return user;
  }

  async findAll() {
    return this.drizzle.db.select().from(users);
  }

  async findById(id: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async update(id: string, data: Partial<typeof users.$inferInsert>) {
    const [user] = await this.drizzle.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async delete(id: string) {
    await this.drizzle.db.delete(users).where(eq(users.id, id));
  }
}
