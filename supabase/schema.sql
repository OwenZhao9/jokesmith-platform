do $$
begin
  create type "public"."api_usage_status" as enum('success', 'error');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "public"."script_category" as enum('politics', 'life', 'roast', 'relationship', 'work', 'family', 'tech', 'other');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "public"."show_status" as enum('planned', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "public"."transcription_status" as enum('pending', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type "public"."user_role" as enum('user', 'admin');
exception
  when duplicate_object then null;
end $$;

create table if not exists "users" (
  "id" serial primary key,
  "openId" varchar(64) not null unique,
  "name" text,
  "email" varchar(320),
  "loginMethod" varchar(64),
  "role" "user_role" default 'user' not null,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null,
  "lastSignedIn" timestamp default now() not null
);

create table if not exists "scripts" (
  "id" serial primary key,
  "userId" integer not null,
  "title" varchar(256) not null,
  "content" text not null,
  "category" "script_category" default 'other' not null,
  "tags" jsonb,
  "isPublic" boolean default false not null,
  "performanceCount" integer default 0 not null,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "inspirations" (
  "id" serial primary key,
  "userId" integer not null,
  "content" text not null,
  "source" varchar(256),
  "tags" jsonb,
  "isConverted" boolean default false not null,
  "convertedScriptId" integer,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "shows" (
  "id" serial primary key,
  "userId" integer not null,
  "title" varchar(256) not null,
  "venue" varchar(256),
  "showDate" timestamp not null,
  "duration" integer,
  "notes" text,
  "status" "show_status" default 'planned' not null,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "show_scripts" (
  "id" serial primary key,
  "showId" integer not null,
  "scriptId" integer not null,
  "orderIndex" integer default 0 not null,
  "createdAt" timestamp default now() not null
);

create table if not exists "user_styles" (
  "id" serial primary key,
  "userId" integer not null,
  "comedyStyle" text,
  "languageHabits" text,
  "commonTags" jsonb,
  "tonePreference" varchar(64),
  "targetAudience" varchar(128),
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "brainstorms" (
  "id" serial primary key,
  "userId" integer not null,
  "topic" varchar(256) not null,
  "angles" jsonb,
  "associations" jsonb,
  "punchlines" jsonb,
  "rawResponse" text,
  "createdAt" timestamp default now() not null
);

create table if not exists "transcriptions" (
  "id" serial primary key,
  "userId" integer not null,
  "audioUrl" varchar(512) not null,
  "audioKey" varchar(256) not null,
  "transcribedText" text,
  "status" "transcription_status" default 'pending' not null,
  "convertedScriptId" integer,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "api_usage_logs" (
  "id" serial primary key,
  "userId" integer,
  "feature" varchar(128) not null,
  "provider" varchar(64),
  "model" varchar(128),
  "promptTokens" integer default 0 not null,
  "completionTokens" integer default 0 not null,
  "totalTokens" integer default 0 not null,
  "status" "api_usage_status" not null,
  "errorMessage" text,
  "latencyMs" integer default 0 not null,
  "createdAt" timestamp default now() not null
);

create table if not exists "api_settings" (
  "id" text primary key default 'default' check ("id" = 'default'),
  "provider" varchar(64) not null default 'openai-compatible',
  "baseUrl" text,
  "model" varchar(128),
  "apiKey" text,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create table if not exists "api_rate_limits" (
  "id" text primary key,
  "identifier" text not null,
  "feature" varchar(128) not null,
  "windowStart" timestamp not null,
  "windowSeconds" integer not null,
  "count" integer default 0 not null,
  "createdAt" timestamp default now() not null,
  "updatedAt" timestamp default now() not null
);

create index if not exists "api_usage_logs_created_at_idx" on "api_usage_logs" ("createdAt" desc);
create index if not exists "api_usage_logs_feature_idx" on "api_usage_logs" ("feature");
create index if not exists "api_rate_limits_window_idx" on "api_rate_limits" ("feature", "windowStart" desc);

alter table "users" enable row level security;
alter table "scripts" enable row level security;
alter table "inspirations" enable row level security;
alter table "shows" enable row level security;
alter table "show_scripts" enable row level security;
alter table "user_styles" enable row level security;
alter table "brainstorms" enable row level security;
alter table "transcriptions" enable row level security;
alter table "api_usage_logs" enable row level security;
alter table "api_settings" enable row level security;
alter table "api_rate_limits" enable row level security;

insert into "api_settings" ("id") values ('default')
on conflict ("id") do nothing;
