import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    passwordHash: "scrypt:v1:salt:hash",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.openId).toBe("test-user-123");
    expect(result?.email).toBe("test@example.com");
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("returns null when not authenticated", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

describe("scripts router", () => {
  it("requires authentication for listing scripts", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.scripts.list({})).rejects.toThrow();
  });

  it("requires authentication for creating scripts", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.scripts.create({
        title: "Test Script",
        content: "Test content",
        category: "life",
      })
    ).rejects.toThrow();
  });
});

describe("inspirations router", () => {
  it("requires authentication for listing inspirations", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.inspirations.list({})).rejects.toThrow();
  });

  it("requires authentication for creating inspirations", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.inspirations.create({
        content: "Test inspiration",
      })
    ).rejects.toThrow();
  });
});

describe("shows router", () => {
  it("requires authentication for listing shows", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.shows.list()).rejects.toThrow();
  });

  it("requires authentication for creating shows", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.shows.create({
        title: "Test Show",
        showDate: Date.now(),
      })
    ).rejects.toThrow();
  });
});

describe("style router", () => {
  it("requires authentication for getting style", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.style.get()).rejects.toThrow();
  });

  it("requires authentication for updating style", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.style.update({
        comedyStyle: "观察式幽默",
      })
    ).rejects.toThrow();
  });
});

describe("brainstorm router", () => {
  it("requires authentication for listing brainstorms", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.brainstorm.list()).rejects.toThrow();
  });

  it("requires authentication for generating brainstorm", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.brainstorm.generate({
        topic: "相亲",
      })
    ).rejects.toThrow();
  });
});

describe("ai router", () => {
  it("requires authentication for generating jokes", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.generateJoke({
        usePersonalStyle: false,
        preInterview: {
          事件1经过: "下班前被通知今晚必须加班。",
        },
      })
    ).rejects.toThrow();
  });

  it("rejects generation when only private pre-interview fields are provided", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.generateJoke({
        usePersonalStyle: false,
        preInterview: {
          联系方式: "private@example.com",
          确认授权: "仅供内部测试",
        },
      })
    ).rejects.toThrow("请至少填写一项会发送给 AI 的前采素材");
  });
});

describe("transcription router", () => {
  it("requires authentication for listing transcriptions", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.transcription.list()).rejects.toThrow();
  });

  it("requires authentication for creating transcriptions", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.transcription.create({
        audioUrl: "https://example.com/audio.mp3",
        audioKey: "test-key",
      })
    ).rejects.toThrow();
  });
});
