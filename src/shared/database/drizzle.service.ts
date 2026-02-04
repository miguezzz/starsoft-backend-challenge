import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;
  public db: ReturnType<typeof drizzle>;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.buildConnectionString();

    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.db = drizzle(this.pool, { schema });

    // Test connection
    try {
      await this.pool.query('SELECT 1');
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
    console.log('Database connection closed');
  }

  private buildConnectionString(): string {
    const host = this.configService.get<string>('DATABASE_HOST', 'localhost');
    const port = this.configService.get<number>('DATABASE_PORT', 5432);
    const database = this.configService.get<string>('DATABASE_NAME', 'cinema_db');
    const user = this.configService.get<string>('DATABASE_USER', 'cinema_user');
    const password = this.configService.get<string>('DATABASE_PASSWORD', 'cinema_pass');

    return `postgresql://${user}:${password}@${host}:${port}/${database}`;
  }

  getDb() {
    return this.db;
  }
}
