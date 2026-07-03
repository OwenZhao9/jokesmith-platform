CREATE TYPE "public"."api_usage_status" AS ENUM('success', 'error');--> statement-breakpoint
CREATE TYPE "public"."script_category" AS ENUM('politics', 'life', 'roast', 'relationship', 'work', 'family', 'tech', 'other');--> statement-breakpoint
CREATE TYPE "public"."show_status" AS ENUM('planned', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transcription_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "api_usage_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"feature" varchar(128) NOT NULL,
	"provider" varchar(64),
	"model" varchar(128),
	"promptTokens" integer DEFAULT 0 NOT NULL,
	"completionTokens" integer DEFAULT 0 NOT NULL,
	"totalTokens" integer DEFAULT 0 NOT NULL,
	"status" "api_usage_status" NOT NULL,
	"errorMessage" text,
	"latencyMs" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brainstorms" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"topic" varchar(256) NOT NULL,
	"angles" jsonb,
	"associations" jsonb,
	"punchlines" jsonb,
	"rawResponse" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspirations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"content" text NOT NULL,
	"source" varchar(256),
	"tags" jsonb,
	"isConverted" boolean DEFAULT false NOT NULL,
	"convertedScriptId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"content" text NOT NULL,
	"category" "script_category" DEFAULT 'other' NOT NULL,
	"tags" jsonb,
	"isPublic" boolean DEFAULT false NOT NULL,
	"performanceCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_scripts" (
	"id" serial PRIMARY KEY NOT NULL,
	"showId" integer NOT NULL,
	"scriptId" integer NOT NULL,
	"orderIndex" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(256) NOT NULL,
	"venue" varchar(256),
	"showDate" timestamp NOT NULL,
	"duration" integer,
	"notes" text,
	"status" "show_status" DEFAULT 'planned' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"audioUrl" varchar(512) NOT NULL,
	"audioKey" varchar(256) NOT NULL,
	"transcribedText" text,
	"status" "transcription_status" DEFAULT 'pending' NOT NULL,
	"convertedScriptId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_styles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"comedyStyle" text,
	"languageHabits" text,
	"commonTags" jsonb,
	"tonePreference" varchar(64),
	"targetAudience" varchar(128),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
