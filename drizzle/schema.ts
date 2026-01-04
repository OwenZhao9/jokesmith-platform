import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User comedy style profile - stores personalized style settings
 */
export const userStyles = mysqlTable("user_styles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  comedyStyle: text("comedyStyle"), // 喜剧风格：讽刺、自嘲、观察式等
  languageHabits: text("languageHabits"), // 语言习惯、口头禅
  commonTags: json("commonTags").$type<string[]>(), // 常用梗/标签
  tonePreference: varchar("tonePreference", { length: 64 }), // 语气偏好
  targetAudience: varchar("targetAudience", { length: 128 }), // 目标受众
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStyle = typeof userStyles.$inferSelect;
export type InsertUserStyle = typeof userStyles.$inferInsert;

/**
 * Scripts/Jokes - main content storage
 */
export const scripts = mysqlTable("scripts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  category: mysqlEnum("category", ["politics", "life", "roast", "relationship", "work", "family", "tech", "other"]).default("other").notNull(),
  tags: json("tags").$type<string[]>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  performanceCount: int("performanceCount").default(0).notNull(), // 演出次数
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Script = typeof scripts.$inferSelect;
export type InsertScript = typeof scripts.$inferInsert;

/**
 * Shows/Performances - schedule management
 */
export const shows = mysqlTable("shows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  venue: varchar("venue", { length: 256 }),
  showDate: timestamp("showDate").notNull(),
  duration: int("duration"), // 演出时长（分钟）
  notes: text("notes"),
  status: mysqlEnum("status", ["planned", "completed", "cancelled"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Show = typeof shows.$inferSelect;
export type InsertShow = typeof shows.$inferInsert;

/**
 * Show-Script relationship - which scripts are used in which shows
 */
export const showScripts = mysqlTable("show_scripts", {
  id: int("id").autoincrement().primaryKey(),
  showId: int("showId").notNull(),
  scriptId: int("scriptId").notNull(),
  orderIndex: int("orderIndex").default(0).notNull(), // 演出顺序
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShowScript = typeof showScripts.$inferSelect;
export type InsertShowScript = typeof showScripts.$inferInsert;

/**
 * Inspirations - quick idea capture
 */
export const inspirations = mysqlTable("inspirations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 256 }), // 灵感来源
  tags: json("tags").$type<string[]>(),
  isConverted: boolean("isConverted").default(false).notNull(), // 是否已转化为稿件
  convertedScriptId: int("convertedScriptId"), // 转化后的稿件ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Inspiration = typeof inspirations.$inferSelect;
export type InsertInspiration = typeof inspirations.$inferInsert;

/**
 * Brainstorm sessions - AI-assisted topic exploration
 */
export const brainstorms = mysqlTable("brainstorms", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  topic: varchar("topic", { length: 256 }).notNull(),
  angles: json("angles").$type<string[]>(), // 切入角度
  associations: json("associations").$type<string[]>(), // 相关联想
  punchlines: json("punchlines").$type<string[]>(), // 笑点方向
  rawResponse: text("rawResponse"), // AI 原始响应
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Brainstorm = typeof brainstorms.$inferSelect;
export type InsertBrainstorm = typeof brainstorms.$inferInsert;

/**
 * Audio transcriptions - recording to text
 */
export const transcriptions = mysqlTable("transcriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  audioUrl: varchar("audioUrl", { length: 512 }).notNull(),
  audioKey: varchar("audioKey", { length: 256 }).notNull(),
  transcribedText: text("transcribedText"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  convertedScriptId: int("convertedScriptId"), // 转化后的稿件ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;
