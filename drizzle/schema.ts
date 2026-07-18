import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const scriptCategory = pgEnum("script_category", [
  "politics",
  "life",
  "roast",
  "relationship",
  "work",
  "family",
  "tech",
  "other",
]);
export const showStatus = pgEnum("show_status", [
  "planned",
  "completed",
  "cancelled",
]);
export const transcriptionStatus = pgEnum("transcription_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);
export const apiUsageStatus = pgEnum("api_usage_status", [
  "success",
  "error",
]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    passwordHash: text("passwordHash"),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: userRole("role").default("user").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn", { mode: "date" })
      .defaultNow()
      .notNull(),
  },
  table => [uniqueIndex("users_email_unique").on(table.email)]
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * User comedy style profile - stores personalized style settings
 */
export const userStyles = pgTable("user_styles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  comedyStyle: text("comedyStyle"), // 喜剧风格：讽刺、自嘲、观察式等
  languageHabits: text("languageHabits"), // 语言习惯、口头禅
  commonTags: jsonb("commonTags").$type<string[]>(), // 常用梗/标签
  tonePreference: varchar("tonePreference", { length: 64 }), // 语气偏好
  targetAudience: varchar("targetAudience", { length: 128 }), // 目标受众
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type UserStyle = typeof userStyles.$inferSelect;
export type InsertUserStyle = typeof userStyles.$inferInsert;

/**
 * Scripts/Jokes - main content storage
 */
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  content: text("content").notNull(),
  category: scriptCategory("category").default("other").notNull(),
  tags: jsonb("tags").$type<string[]>(),
  isPublic: boolean("isPublic").default(false).notNull(),
  performanceCount: integer("performanceCount").default(0).notNull(), // 演出次数
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Script = typeof scripts.$inferSelect;
export type InsertScript = typeof scripts.$inferInsert;

/**
 * Shows/Performances - schedule management
 */
export const shows = pgTable("shows", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  title: varchar("title", { length: 256 }).notNull(),
  venue: varchar("venue", { length: 256 }),
  showDate: timestamp("showDate", { mode: "date" }).notNull(),
  duration: integer("duration"), // 演出时长（分钟）
  notes: text("notes"),
  status: showStatus("status").default("planned").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Show = typeof shows.$inferSelect;
export type InsertShow = typeof shows.$inferInsert;

/**
 * Show-Script relationship - which scripts are used in which shows
 */
export const showScripts = pgTable("show_scripts", {
  id: serial("id").primaryKey(),
  showId: integer("showId").notNull(),
  scriptId: integer("scriptId").notNull(),
  orderIndex: integer("orderIndex").default(0).notNull(), // 演出顺序
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type ShowScript = typeof showScripts.$inferSelect;
export type InsertShowScript = typeof showScripts.$inferInsert;

/**
 * Inspirations - quick idea capture
 */
export const inspirations = pgTable("inspirations", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 256 }), // 灵感来源
  tags: jsonb("tags").$type<string[]>(),
  isConverted: boolean("isConverted").default(false).notNull(), // 是否已转化为稿件
  convertedScriptId: integer("convertedScriptId"), // 转化后的稿件ID
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Inspiration = typeof inspirations.$inferSelect;
export type InsertInspiration = typeof inspirations.$inferInsert;

/**
 * Brainstorm sessions - AI-assisted topic exploration
 */
export const brainstorms = pgTable("brainstorms", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  topic: varchar("topic", { length: 256 }).notNull(),
  angles: jsonb("angles").$type<string[]>(), // 切入角度
  associations: jsonb("associations").$type<string[]>(), // 相关联想
  punchlines: jsonb("punchlines").$type<string[]>(), // 笑点方向
  rawResponse: text("rawResponse"), // AI 原始响应
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type Brainstorm = typeof brainstorms.$inferSelect;
export type InsertBrainstorm = typeof brainstorms.$inferInsert;

/**
 * Audio transcriptions - recording to text
 */
export const transcriptions = pgTable("transcriptions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  audioUrl: varchar("audioUrl", { length: 512 }).notNull(),
  audioKey: varchar("audioKey", { length: 256 }).notNull(),
  transcribedText: text("transcribedText"),
  status: transcriptionStatus("status").default("pending").notNull(),
  convertedScriptId: integer("convertedScriptId"), // 转化后的稿件ID
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Transcription = typeof transcriptions.$inferSelect;
export type InsertTranscription = typeof transcriptions.$inferInsert;

/**
 * External API usage logs - tracks AI and speech API consumption for admins.
 */
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  feature: varchar("feature", { length: 128 }).notNull(),
  provider: varchar("provider", { length: 64 }),
  model: varchar("model", { length: 128 }),
  promptTokens: integer("promptTokens").default(0).notNull(),
  completionTokens: integer("completionTokens").default(0).notNull(),
  totalTokens: integer("totalTokens").default(0).notNull(),
  status: apiUsageStatus("status").notNull(),
  errorMessage: text("errorMessage"),
  latencyMs: integer("latencyMs").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = typeof apiUsageLogs.$inferInsert;
