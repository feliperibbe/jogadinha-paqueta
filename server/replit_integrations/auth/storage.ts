import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq, or } from "drizzle-orm";

const ADMIN_EMAIL = "felipe.vasconcellos@ab-inbev.com";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const isAdminUser = userData.email === ADMIN_EMAIL;
    
    // Check if user already exists by ID or email to avoid unique constraint violations
    const existingConditions = [eq(users.id, userData.id!)];
    if (userData.email) {
      existingConditions.push(eq(users.email, userData.email));
    }
    
    const [existingUser] = await db
      .select()
      .from(users)
      .where(or(...existingConditions));
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          isAdmin: isAdminUser ? true : existingUser.isAdmin,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
        .returning();
      return updatedUser;
    }
    
    // Insert new user
    const [newUser] = await db
      .insert(users)
      .values({
        ...userData,
        isAdmin: isAdminUser ? true : false,
      })
      .returning();
    return newUser;
  }
}

export const authStorage = new AuthStorage();
