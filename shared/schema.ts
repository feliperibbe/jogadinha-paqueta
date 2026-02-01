import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

import { users } from "./models/auth";

export const generatedVideos = pgTable("generated_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sourceImagePath: text("source_image_path").notNull(),
  generatedVideoUrl: text("generated_video_url"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  wavespeedRequestId: text("wavespeed_request_id"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  videos: many(generatedVideos),
}));

export const generatedVideosRelations = relations(generatedVideos, ({ one }) => ({
  user: one(users, {
    fields: [generatedVideos.userId],
    references: [users.id],
  }),
}));

export const insertGeneratedVideoSchema = createInsertSchema(generatedVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedVideo = z.infer<typeof insertGeneratedVideoSchema>;
export type GeneratedVideo = typeof generatedVideos.$inferSelect;
