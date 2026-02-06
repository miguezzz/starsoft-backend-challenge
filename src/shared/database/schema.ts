import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  decimal,
  pgEnum,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const seatStatusEnum = pgEnum('seat_status', [
  'available',
  'reserved',
  'sold',
]);

export const reservationStatusEnum = pgEnum('reservation_status', [
  'pending',
  'confirmed',
  'expired',
  'cancelled',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Sessions Table (Sessões de Cinema)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieName: varchar('movie_name', { length: 255 }).notNull(),
  roomNumber: varchar('room_number', { length: 50 }).notNull(),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  ticketPrice: decimal('ticket_price', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Seats Table (Assentos)
export const seats = pgTable(
  'seats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    seatNumber: varchar('seat_number', { length: 10 }).notNull(), // Ex: A1, B5, C10
    status: seatStatusEnum('status').default('available').notNull(),
    reservationId: uuid('reservation_id').references(() => reservations.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('session_seat_idx').on(table.sessionId, table.seatNumber),
    unique('session_seat_unique').on(
      table.sessionId,
      table.seatNumber,
    ),
  ],
);

// Reservations Table (Reservas Temporárias)
export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    status: reservationStatusEnum('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('reservation_user_idx').on(table.userId),
    index('reservation_expires_idx').on(table.expiresAt),
  ],
);

// Sales Table (Vendas Confirmadas)
export const sales = pgTable(
  'sales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationId: uuid('reservation_id')
      .references(() => reservations.id, { onDelete: 'cascade' })
      .notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' })
      .notNull(),
    seatId: uuid('seat_id')
      .references(() => seats.id, { onDelete: 'cascade' })
      .notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('sale_user_idx').on(table.userId),
    index('sale_session_idx').on(table.sessionId),
  ]
);

// Relations
export const sessionsRelations = relations(sessions, ({ many }) => ({
  seats: many(seats),
  reservations: many(reservations),
  sales: many(sales),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  session: one(sessions, {
    fields: [seats.sessionId],
    references: [sessions.id],
  }),
  reservations: one(reservations),
  sales: one(sales),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  session: one(sessions, {
    fields: [reservations.sessionId],
    references: [sessions.id],
  }),
  sale: one(sales, {
    fields: [reservations.id],
    references: [sales.reservationId],
  }),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  reservation: one(reservations, {
    fields: [sales.reservationId],
    references: [reservations.id],
  }),
  session: one(sessions, {
    fields: [sales.sessionId],
    references: [sessions.id],
  }),
  seat: one(seats, {
    fields: [sales.seatId],
    references: [seats.id],
  }),
}));
