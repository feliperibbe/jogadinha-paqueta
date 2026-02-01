import { 
  users, 
  generatedVideos,
  paymentRequests,
  freeVideoUsage,
  type User, 
  type UpsertUser,
  type GeneratedVideo,
  type InsertGeneratedVideo,
  type PaymentRequest,
  type InsertPaymentRequest,
  type FreeVideoUsage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserCredits(userId: string, credits: number): Promise<User | undefined>;
  deductUserCredit(userId: string): Promise<boolean>;
  addUserCredit(userId: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  getVideoById(id: string): Promise<GeneratedVideo | undefined>;
  getVideosByUserId(userId: string): Promise<GeneratedVideo[]>;
  createVideo(video: InsertGeneratedVideo): Promise<GeneratedVideo>;
  updateVideo(id: string, updates: Partial<GeneratedVideo>): Promise<GeneratedVideo | undefined>;
  
  createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest>;
  getPendingPaymentRequests(): Promise<(PaymentRequest & { user: User | null })[]>;
  getPaymentRequestsByUserId(userId: string): Promise<PaymentRequest[]>;
  getPaymentRequestByToken(token: string): Promise<(PaymentRequest & { user: User | null }) | undefined>;
  approvePaymentRequest(id: string, approvedBy: string): Promise<PaymentRequest | undefined>;
  
  checkIpUsedFreeVideo(ipAddress: string, daysBack: number): Promise<FreeVideoUsage | undefined>;
  recordFreeVideoUsage(userId: string, ipAddress: string): Promise<FreeVideoUsage>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
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

  async updateUserCredits(userId: string, credits: number): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ credits, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async deductUserCredit(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} - 1`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async addUserCredit(userId: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ 
        credits: sql`${users.credits} + 1`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return result.length > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest> {
    const [created] = await db
      .insert(paymentRequests)
      .values(request)
      .returning();
    return created;
  }

  async getPendingPaymentRequests(): Promise<(PaymentRequest & { user: User | null })[]> {
    const requests = await db
      .select()
      .from(paymentRequests)
      .leftJoin(users, eq(paymentRequests.userId, users.id))
      .where(eq(paymentRequests.status, "pending"))
      .orderBy(desc(paymentRequests.createdAt));
    
    return requests.map(r => ({
      ...r.payment_requests,
      user: r.users,
    }));
  }

  async getPaymentRequestsByUserId(userId: string): Promise<PaymentRequest[]> {
    return db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.userId, userId))
      .orderBy(desc(paymentRequests.createdAt));
  }

  async getPaymentRequestByToken(token: string): Promise<(PaymentRequest & { user: User | null }) | undefined> {
    const [result] = await db
      .select()
      .from(paymentRequests)
      .leftJoin(users, eq(paymentRequests.userId, users.id))
      .where(eq(paymentRequests.approvalToken, token));
    
    if (!result) return undefined;
    
    return {
      ...result.payment_requests,
      user: result.users,
    };
  }

  async approvePaymentRequest(id: string, approvedBy: string): Promise<PaymentRequest | undefined> {
    const [request] = await db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id));
    
    if (!request) return undefined;

    const [updated] = await db
      .update(paymentRequests)
      .set({ 
        status: "approved", 
        approvedAt: new Date(),
        approvedBy 
      })
      .where(eq(paymentRequests.id, id))
      .returning();

    if (updated) {
      await db
        .update(users)
        .set({ 
          credits: sql`${users.credits} + 1`,
          updatedAt: new Date() 
        })
        .where(eq(users.id, request.userId));
    }

    return updated || undefined;
  }

  async checkIpUsedFreeVideo(ipAddress: string, daysBack: number): Promise<FreeVideoUsage | undefined> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const [usage] = await db
      .select()
      .from(freeVideoUsage)
      .where(
        and(
          eq(freeVideoUsage.ipAddress, ipAddress),
          gte(freeVideoUsage.usedAt, cutoffDate)
        )
      )
      .limit(1);
    
    return usage || undefined;
  }

  async recordFreeVideoUsage(userId: string, ipAddress: string): Promise<FreeVideoUsage> {
    const [usage] = await db
      .insert(freeVideoUsage)
      .values({ userId, ipAddress })
      .returning();
    
    return usage;
  }
}

export const storage = new DatabaseStorage();
