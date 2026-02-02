import { 
  users, 
  generatedVideos,
  type User, 
  type UpsertUser,
  type GeneratedVideo,
  type InsertGeneratedVideo
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  getVideoById(id: string): Promise<GeneratedVideo | undefined>;
  getVideosByUserId(userId: string): Promise<GeneratedVideo[]>;
  getVideoByIpAddress(ipAddress: string): Promise<GeneratedVideo | undefined>;
  getAllVideos(): Promise<GeneratedVideo[]>;
  createVideo(video: InsertGeneratedVideo): Promise<GeneratedVideo>;
  updateVideo(id: string, updates: Partial<GeneratedVideo>): Promise<GeneratedVideo | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user || undefined;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getVideoById(id: string): Promise<GeneratedVideo | undefined> {
    const [video] = await db.select().from(generatedVideos).where(eq(generatedVideos.id, id));
    return video || undefined;
  }

  async getVideosByUserId(userId: string): Promise<GeneratedVideo[]> {
    return db
      .select()
      .from(generatedVideos)
      .where(eq(generatedVideos.userId, userId))
      .orderBy(desc(generatedVideos.createdAt));
  }

  async getVideoByIpAddress(ipAddress: string): Promise<GeneratedVideo | undefined> {
    const [video] = await db
      .select()
      .from(generatedVideos)
      .where(eq(generatedVideos.ipAddress, ipAddress));
    return video || undefined;
  }

  async createVideo(video: InsertGeneratedVideo): Promise<GeneratedVideo> {
    const [created] = await db
      .insert(generatedVideos)
      .values(video)
      .returning();
    return created;
  }

  async updateVideo(id: string, updates: Partial<GeneratedVideo>): Promise<GeneratedVideo | undefined> {
    const [updated] = await db
      .update(generatedVideos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(generatedVideos.id, id))
      .returning();
    return updated || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllVideos(): Promise<GeneratedVideo[]> {
    return db.select().from(generatedVideos).orderBy(desc(generatedVideos.createdAt));
  }
}

export const storage = new DatabaseStorage();
