import { eq, desc, like, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  userStyles, InsertUserStyle, UserStyle,
  scripts, InsertScript, Script,
  shows, InsertShow, Show,
  showScripts, InsertShowScript,
  inspirations, InsertInspiration, Inspiration,
  brainstorms, InsertBrainstorm, Brainstorm,
  transcriptions, InsertTranscription, Transcription
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ User Style Functions ============
export async function getUserStyle(userId: number): Promise<UserStyle | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(userStyles).where(eq(userStyles.userId, userId)).limit(1);
  return result[0];
}

export async function upsertUserStyle(userId: number, style: Partial<InsertUserStyle>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getUserStyle(userId);
  if (existing) {
    await db.update(userStyles).set({ ...style, updatedAt: new Date() }).where(eq(userStyles.userId, userId));
  } else {
    await db.insert(userStyles).values({ userId, ...style });
  }
}

// ============ Script Functions ============
export async function createScript(script: InsertScript): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scripts).values(script);
  return result[0].insertId;
}

export async function getScriptById(id: number, userId: number): Promise<Script | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scripts).where(and(eq(scripts.id, id), eq(scripts.userId, userId))).limit(1);
  return result[0];
}

export async function getUserScripts(userId: number, category?: string, search?: string): Promise<Script[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(scripts.userId, userId)];
  if (category && category !== 'all') {
    conditions.push(eq(scripts.category, category as Script['category']));
  }
  if (search) {
    conditions.push(or(like(scripts.title, `%${search}%`), like(scripts.content, `%${search}%`))!);
  }
  
  return db.select().from(scripts).where(and(...conditions)).orderBy(desc(scripts.updatedAt));
}

export async function updateScript(id: number, userId: number, data: Partial<InsertScript>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(scripts).set({ ...data, updatedAt: new Date() }).where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
}

export async function deleteScript(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(scripts).where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
}

// ============ Show Functions ============
export async function createShow(show: InsertShow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(shows).values(show);
  return result[0].insertId;
}

export async function getShowById(id: number, userId: number): Promise<Show | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(shows).where(and(eq(shows.id, id), eq(shows.userId, userId))).limit(1);
  return result[0];
}

export async function getUserShows(userId: number): Promise<Show[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(shows).where(eq(shows.userId, userId)).orderBy(desc(shows.showDate));
}

export async function updateShow(id: number, userId: number, data: Partial<InsertShow>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(shows).set({ ...data, updatedAt: new Date() }).where(and(eq(shows.id, id), eq(shows.userId, userId)));
}

export async function deleteShow(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(showScripts).where(eq(showScripts.showId, id));
  await db.delete(shows).where(and(eq(shows.id, id), eq(shows.userId, userId)));
}

// ============ Show-Script Relationship Functions ============
export async function addScriptToShow(showId: number, scriptId: number, orderIndex: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(showScripts).values({ showId, scriptId, orderIndex });
}

export async function removeScriptFromShow(showId: number, scriptId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(showScripts).where(and(eq(showScripts.showId, showId), eq(showScripts.scriptId, scriptId)));
}

export async function getShowScripts(showId: number): Promise<{ script: Script; orderIndex: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({ 
    script: scripts, 
    orderIndex: showScripts.orderIndex 
  }).from(showScripts)
    .innerJoin(scripts, eq(showScripts.scriptId, scripts.id))
    .where(eq(showScripts.showId, showId))
    .orderBy(showScripts.orderIndex);
  return result;
}

export async function updateShowScripts(showId: number, scriptIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(showScripts).where(eq(showScripts.showId, showId));
  for (let i = 0; i < scriptIds.length; i++) {
    await db.insert(showScripts).values({ showId, scriptId: scriptIds[i], orderIndex: i });
  }
}

// ============ Inspiration Functions ============
export async function createInspiration(inspiration: InsertInspiration): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inspirations).values(inspiration);
  return result[0].insertId;
}

export async function getUserInspirations(userId: number, search?: string): Promise<Inspiration[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(inspirations.userId, userId)];
  if (search) {
    conditions.push(like(inspirations.content, `%${search}%`));
  }
  
  return db.select().from(inspirations).where(and(...conditions)).orderBy(desc(inspirations.createdAt));
}

export async function updateInspiration(id: number, userId: number, data: Partial<InsertInspiration>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(inspirations).set({ ...data, updatedAt: new Date() }).where(and(eq(inspirations.id, id), eq(inspirations.userId, userId)));
}

export async function deleteInspiration(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(inspirations).where(and(eq(inspirations.id, id), eq(inspirations.userId, userId)));
}

export async function convertInspirationToScript(inspirationId: number, userId: number, scriptData: InsertScript): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const scriptId = await createScript(scriptData);
  await db.update(inspirations).set({ 
    isConverted: true, 
    convertedScriptId: scriptId,
    updatedAt: new Date()
  }).where(and(eq(inspirations.id, inspirationId), eq(inspirations.userId, userId)));
  
  return scriptId;
}

// ============ Brainstorm Functions ============
export async function createBrainstorm(brainstorm: InsertBrainstorm): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brainstorms).values(brainstorm);
  return result[0].insertId;
}

export async function getUserBrainstorms(userId: number): Promise<Brainstorm[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brainstorms).where(eq(brainstorms.userId, userId)).orderBy(desc(brainstorms.createdAt));
}

export async function getBrainstormById(id: number, userId: number): Promise<Brainstorm | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brainstorms).where(and(eq(brainstorms.id, id), eq(brainstorms.userId, userId))).limit(1);
  return result[0];
}

// ============ Transcription Functions ============
export async function createTranscription(transcription: InsertTranscription): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(transcriptions).values(transcription);
  return result[0].insertId;
}

export async function getUserTranscriptions(userId: number): Promise<Transcription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transcriptions).where(eq(transcriptions.userId, userId)).orderBy(desc(transcriptions.createdAt));
}

export async function updateTranscription(id: number, userId: number, data: Partial<InsertTranscription>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(transcriptions).set({ ...data, updatedAt: new Date() }).where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)));
}

export async function getTranscriptionById(id: number, userId: number): Promise<Transcription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transcriptions).where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId))).limit(1);
  return result[0];
}
