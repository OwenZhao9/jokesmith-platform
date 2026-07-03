import { eq, desc, like, and, or, inArray, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  userStyles,
  InsertUserStyle,
  UserStyle,
  scripts,
  InsertScript,
  Script,
  shows,
  InsertShow,
  Show,
  showScripts,
  InsertShowScript,
  inspirations,
  InsertInspiration,
  Inspiration,
  brainstorms,
  InsertBrainstorm,
  Brainstorm,
  transcriptions,
  InsertTranscription,
  Transcription,
  apiUsageLogs,
  InsertApiUsageLog,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _postgresClient: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _postgresClient = postgres(ENV.databaseUrl, {
        max: 1,
        prepare: false,
      });
      _db = drizzle(_postgresClient);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _postgresClient = null;
    }
  }
  return _db;
}

export async function getDatabaseHealth() {
  if (!ENV.databaseUrl) {
    return {
      configured: false,
      connected: false,
      apiUsageLogsMigrated: false,
      error: "DATABASE_URL is not configured",
    };
  }

  const db = await getDb();
  if (!db) {
    return {
      configured: true,
      connected: false,
      apiUsageLogsMigrated: false,
      error: "Database client could not be initialized",
    };
  }

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    return {
      configured: true,
      connected: false,
      apiUsageLogsMigrated: false,
      error: error instanceof Error ? error.message : "Database ping failed",
    };
  }

  try {
    await db.select({ id: apiUsageLogs.id }).from(apiUsageLogs).limit(1);
    return {
      configured: true,
      connected: true,
      apiUsageLogsMigrated: true,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: true,
      apiUsageLogsMigrated: false,
      error:
        error instanceof Error
          ? error.message
          : "api_usage_logs migration is missing",
    };
  }
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
    const updateSet: Partial<InsertUser> = {};

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
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    updateSet.updatedAt = new Date();

    await db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.openId, set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ User Style Functions ============
export async function getUserStyle(
  userId: number
): Promise<UserStyle | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(userStyles)
    .where(eq(userStyles.userId, userId))
    .limit(1);
  return result[0];
}

export async function upsertUserStyle(
  userId: number,
  style: Partial<InsertUserStyle>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await getUserStyle(userId);
  if (existing) {
    await db
      .update(userStyles)
      .set({ ...style, updatedAt: new Date() })
      .where(eq(userStyles.userId, userId));
  } else {
    await db.insert(userStyles).values({ userId, ...style });
  }
}

// ============ Script Functions ============
export async function createScript(script: InsertScript): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(scripts).values(script).returning({
    id: scripts.id,
  });
  return result.id;
}

export async function getScriptById(
  id: number,
  userId: number
): Promise<Script | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getUserScripts(
  userId: number,
  category?: string,
  search?: string
): Promise<Script[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(scripts.userId, userId)];
  if (category && category !== "all") {
    conditions.push(eq(scripts.category, category as Script["category"]));
  }
  if (search) {
    conditions.push(
      or(
        like(scripts.title, `%${search}%`),
        like(scripts.content, `%${search}%`)
      )!
    );
  }

  return db
    .select()
    .from(scripts)
    .where(and(...conditions))
    .orderBy(desc(scripts.updatedAt));
}

export async function updateScript(
  id: number,
  userId: number,
  data: Partial<InsertScript>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(scripts)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
}

export async function deleteScript(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.userId, userId)));
}

// ============ Show Functions ============
export async function createShow(show: InsertShow): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(shows).values(show).returning({
    id: shows.id,
  });
  return result.id;
}

export async function getShowById(
  id: number,
  userId: number
): Promise<Show | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(shows)
    .where(and(eq(shows.id, id), eq(shows.userId, userId)))
    .limit(1);
  return result[0];
}

export async function getUserShows(userId: number): Promise<Show[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(shows)
    .where(eq(shows.userId, userId))
    .orderBy(desc(shows.showDate));
}

export async function updateShow(
  id: number,
  userId: number,
  data: Partial<InsertShow>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(shows)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(shows.id, id), eq(shows.userId, userId)));
}

export async function deleteShow(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const show = await getShowById(id, userId);
  if (!show) return;
  await db.delete(showScripts).where(eq(showScripts.showId, id));
  await db.delete(shows).where(and(eq(shows.id, id), eq(shows.userId, userId)));
}

// ============ Show-Script Relationship Functions ============
export async function addScriptToShow(
  showId: number,
  scriptId: number,
  orderIndex: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(showScripts).values({ showId, scriptId, orderIndex });
}

export async function removeScriptFromShow(
  showId: number,
  scriptId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(showScripts)
    .where(
      and(eq(showScripts.showId, showId), eq(showScripts.scriptId, scriptId))
    );
}

export async function getShowScripts(
  showId: number,
  userId: number
): Promise<{ script: Script; orderIndex: number }[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      script: scripts,
      orderIndex: showScripts.orderIndex,
    })
    .from(showScripts)
    .innerJoin(scripts, eq(showScripts.scriptId, scripts.id))
    .where(and(eq(showScripts.showId, showId), eq(scripts.userId, userId)))
    .orderBy(showScripts.orderIndex);
  return result;
}

export async function updateShowScripts(
  showId: number,
  userId: number,
  scriptIds: number[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const show = await getShowById(showId, userId);
  if (!show) {
    throw new Error("Show not found");
  }

  const uniqueScriptIds = Array.from(new Set(scriptIds));
  if (uniqueScriptIds.length > 0) {
    const ownedScripts = await db
      .select({ id: scripts.id })
      .from(scripts)
      .where(
        and(eq(scripts.userId, userId), inArray(scripts.id, uniqueScriptIds))
      );
    if (ownedScripts.length !== uniqueScriptIds.length) {
      throw new Error("One or more scripts were not found");
    }
  }

  await db.delete(showScripts).where(eq(showScripts.showId, showId));
  for (let i = 0; i < uniqueScriptIds.length; i++) {
    await db
      .insert(showScripts)
      .values({ showId, scriptId: uniqueScriptIds[i], orderIndex: i });
  }
}

// ============ Inspiration Functions ============
export async function createInspiration(
  inspiration: InsertInspiration
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(inspirations).values(inspiration).returning({
    id: inspirations.id,
  });
  return result.id;
}

export async function getUserInspirations(
  userId: number,
  search?: string
): Promise<Inspiration[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(inspirations.userId, userId)];
  if (search) {
    conditions.push(like(inspirations.content, `%${search}%`));
  }

  return db
    .select()
    .from(inspirations)
    .where(and(...conditions))
    .orderBy(desc(inspirations.createdAt));
}

export async function updateInspiration(
  id: number,
  userId: number,
  data: Partial<InsertInspiration>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(inspirations)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(inspirations.id, id), eq(inspirations.userId, userId)));
}

export async function deleteInspiration(
  id: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(inspirations)
    .where(and(eq(inspirations.id, id), eq(inspirations.userId, userId)));
}

export async function convertInspirationToScript(
  inspirationId: number,
  userId: number,
  scriptData: InsertScript
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const scriptId = await createScript(scriptData);
  await db
    .update(inspirations)
    .set({
      isConverted: true,
      convertedScriptId: scriptId,
      updatedAt: new Date(),
    })
    .where(
      and(eq(inspirations.id, inspirationId), eq(inspirations.userId, userId))
    );

  return scriptId;
}

// ============ Brainstorm Functions ============
export async function createBrainstorm(
  brainstorm: InsertBrainstorm
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(brainstorms).values(brainstorm).returning({
    id: brainstorms.id,
  });
  return result.id;
}

export async function getUserBrainstorms(
  userId: number
): Promise<Brainstorm[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(brainstorms)
    .where(eq(brainstorms.userId, userId))
    .orderBy(desc(brainstorms.createdAt));
}

export async function getBrainstormById(
  id: number,
  userId: number
): Promise<Brainstorm | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(brainstorms)
    .where(and(eq(brainstorms.id, id), eq(brainstorms.userId, userId)))
    .limit(1);
  return result[0];
}

// ============ Transcription Functions ============
export async function createTranscription(
  transcription: InsertTranscription
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db
    .insert(transcriptions)
    .values(transcription)
    .returning({
      id: transcriptions.id,
    });
  return result.id;
}

export async function getUserTranscriptions(
  userId: number
): Promise<Transcription[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(transcriptions)
    .where(eq(transcriptions.userId, userId))
    .orderBy(desc(transcriptions.createdAt));
}

export async function updateTranscription(
  id: number,
  userId: number,
  data: Partial<InsertTranscription>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(transcriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)));
}

export async function getTranscriptionById(
  id: number,
  userId: number
): Promise<Transcription | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(transcriptions)
    .where(and(eq(transcriptions.id, id), eq(transcriptions.userId, userId)))
    .limit(1);
  return result[0];
}

// ============ API Usage / Admin Functions ============
const toNumber = (value: unknown): number => Number(value ?? 0);

async function readCount(
  query: Promise<Array<{ value: number | string | bigint | null }>>
): Promise<number> {
  const [row] = await query;
  return toNumber(row?.value);
}

export async function recordApiUsage(log: InsertApiUsageLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(apiUsageLogs).values(log);
  } catch (error) {
    // Usage logging must not break the user-facing API call.
    console.error("[API Usage] Failed to record usage:", error);
  }
}

export async function getAdminOverview() {
  const db = await getDb();
  if (!db) {
    return {
      totals: {
        users: 0,
        scripts: 0,
        inspirations: 0,
        shows: 0,
        brainstorms: 0,
        transcriptions: 0,
      },
      recent: {
        usersToday: 0,
        usersLast7Days: 0,
        activeUsersToday: 0,
        activeUsersLast7Days: 0,
      },
      api: {
        totalCalls: 0,
        totalTokens: 0,
        totalErrors: 0,
        callsToday: 0,
        tokensToday: 0,
        errorsToday: 0,
        averageLatencyMs: 0,
      },
      topFeatures: [],
      dailyUsage: [],
      recentUsers: [],
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last7Days = new Date(today);
  last7Days.setDate(last7Days.getDate() - 6);

  const [
    usersTotal,
    scriptsTotal,
    inspirationsTotal,
    showsTotal,
    brainstormsTotal,
    transcriptionsTotal,
    usersToday,
    usersLast7Days,
    activeUsersToday,
    activeUsersLast7Days,
    apiTotalsRows,
    apiTodayRows,
    topFeaturesRows,
    dailyUsageRows,
    recentUsers,
  ] = await Promise.all([
    readCount(db.select({ value: sql<number>`count(*)` }).from(users)),
    readCount(db.select({ value: sql<number>`count(*)` }).from(scripts)),
    readCount(db.select({ value: sql<number>`count(*)` }).from(inspirations)),
    readCount(db.select({ value: sql<number>`count(*)` }).from(shows)),
    readCount(db.select({ value: sql<number>`count(*)` }).from(brainstorms)),
    readCount(db.select({ value: sql<number>`count(*)` }).from(transcriptions)),
    readCount(
      db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, today))
    ),
    readCount(
      db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, last7Days))
    ),
    readCount(
      db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.lastSignedIn, today))
    ),
    readCount(
      db
        .select({ value: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.lastSignedIn, last7Days))
    ),
    db
      .select({
        totalCalls: sql<number>`count(*)`,
        totalTokens: sql<number>`coalesce(sum(${apiUsageLogs.totalTokens}), 0)`,
        totalErrors: sql<number>`coalesce(sum(case when ${apiUsageLogs.status} = 'error' then 1 else 0 end), 0)`,
        averageLatencyMs: sql<number>`coalesce(avg(${apiUsageLogs.latencyMs}), 0)`,
      })
      .from(apiUsageLogs),
    db
      .select({
        callsToday: sql<number>`count(*)`,
        tokensToday: sql<number>`coalesce(sum(${apiUsageLogs.totalTokens}), 0)`,
        errorsToday: sql<number>`coalesce(sum(case when ${apiUsageLogs.status} = 'error' then 1 else 0 end), 0)`,
      })
      .from(apiUsageLogs)
      .where(gte(apiUsageLogs.createdAt, today)),
    db
      .select({
        feature: apiUsageLogs.feature,
        calls: sql<number>`count(*)`,
        tokens: sql<number>`coalesce(sum(${apiUsageLogs.totalTokens}), 0)`,
        errors: sql<number>`coalesce(sum(case when ${apiUsageLogs.status} = 'error' then 1 else 0 end), 0)`,
      })
      .from(apiUsageLogs)
      .groupBy(apiUsageLogs.feature)
      .orderBy(sql`count(*) desc`)
      .limit(8),
    db
      .select({
        date: sql<string>`date(${apiUsageLogs.createdAt})`,
        calls: sql<number>`count(*)`,
        tokens: sql<number>`coalesce(sum(${apiUsageLogs.totalTokens}), 0)`,
        errors: sql<number>`coalesce(sum(case when ${apiUsageLogs.status} = 'error' then 1 else 0 end), 0)`,
      })
      .from(apiUsageLogs)
      .where(gte(apiUsageLogs.createdAt, last7Days))
      .groupBy(sql`date(${apiUsageLogs.createdAt})`)
      .orderBy(sql`date(${apiUsageLogs.createdAt})`),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .orderBy(desc(users.lastSignedIn))
      .limit(8),
  ]);

  const apiTotals = apiTotalsRows[0];
  const apiToday = apiTodayRows[0];

  return {
    totals: {
      users: usersTotal,
      scripts: scriptsTotal,
      inspirations: inspirationsTotal,
      shows: showsTotal,
      brainstorms: brainstormsTotal,
      transcriptions: transcriptionsTotal,
    },
    recent: {
      usersToday,
      usersLast7Days,
      activeUsersToday,
      activeUsersLast7Days,
    },
    api: {
      totalCalls: toNumber(apiTotals?.totalCalls),
      totalTokens: toNumber(apiTotals?.totalTokens),
      totalErrors: toNumber(apiTotals?.totalErrors),
      callsToday: toNumber(apiToday?.callsToday),
      tokensToday: toNumber(apiToday?.tokensToday),
      errorsToday: toNumber(apiToday?.errorsToday),
      averageLatencyMs: Math.round(toNumber(apiTotals?.averageLatencyMs)),
    },
    topFeatures: topFeaturesRows.map(row => ({
      feature: row.feature,
      calls: toNumber(row.calls),
      tokens: toNumber(row.tokens),
      errors: toNumber(row.errors),
    })),
    dailyUsage: dailyUsageRows.map(row => ({
      date: row.date,
      calls: toNumber(row.calls),
      tokens: toNumber(row.tokens),
      errors: toNumber(row.errors),
    })),
    recentUsers,
  };
}

export async function getAdminApiUsage(limit = 50) {
  const db = await getDb();
  if (!db) return [];

  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const rows = await db
    .select({
      id: apiUsageLogs.id,
      userId: apiUsageLogs.userId,
      userName: users.name,
      userEmail: users.email,
      feature: apiUsageLogs.feature,
      provider: apiUsageLogs.provider,
      model: apiUsageLogs.model,
      promptTokens: apiUsageLogs.promptTokens,
      completionTokens: apiUsageLogs.completionTokens,
      totalTokens: apiUsageLogs.totalTokens,
      status: apiUsageLogs.status,
      errorMessage: apiUsageLogs.errorMessage,
      latencyMs: apiUsageLogs.latencyMs,
      createdAt: apiUsageLogs.createdAt,
    })
    .from(apiUsageLogs)
    .leftJoin(users, eq(apiUsageLogs.userId, users.id))
    .orderBy(desc(apiUsageLogs.createdAt))
    .limit(safeLimit);

  return rows;
}
