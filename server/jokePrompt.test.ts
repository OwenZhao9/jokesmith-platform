import { describe, expect, it } from "vitest";
import { buildJokePrompt, JOKE_SYSTEM_PROMPT } from "./_core/jokePrompt";

describe("joke prompt", () => {
  it("turns filled pre-interview answers into structured writing material", () => {
    const prompt = buildJokePrompt({
      preInterview: {
        "职业/身份": "程序员",
        目标时长: "5 分钟",
        最想讲的主题1: "第一次去相亲",
        事件1经过: "对方迟到四十分钟，我一直不敢问服务员要水。",
        事件1原话和对话: "她坐下第一句问：你是不是不太爱说话？",
        联系方式: "private@example.com",
      },
      personalStyle: ["喜剧风格：观察式幽默", "语言习惯：短句"],
    });

    expect(prompt).toContain("根据前采提炼的创作重点：第一次去相亲");
    expect(prompt).not.toContain("关键词：");
    expect(prompt).toContain("目标时长：5 分钟");
    expect(prompt).toContain("### 个人定位");
    expect(prompt).toContain("事件1原话和对话");
    expect(prompt).toContain("喜剧风格：观察式幽默");
    expect(prompt).not.toContain("private@example.com");
  });

  it("omits empty answers and keeps a useful default duration", () => {
    const prompt = buildJokePrompt({
      preInterview: {
        所在城市: "   ",
      },
    });

    expect(prompt).toContain("目标时长：约 3 分钟");
    expect(prompt).toContain("用户没有补充前采素材");
    expect(prompt).not.toContain("所在城市");
  });

  it("makes user boundaries hard constraints", () => {
    expect(JOKE_SYSTEM_PROMPT).toContain("硬边界");
    expect(JOKE_SYSTEM_PROMPT).toContain("不得试探、改写或影射");
    expect(JOKE_SYSTEM_PROMPT).toContain("不捏造真实人物的敏感事实");
  });
});
