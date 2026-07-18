export type PreInterviewField = {
  label: string;
  placeholder: string;
  multiline?: boolean;
  includeInPrompt?: boolean;
};

export type PreInterviewSection = {
  id: string;
  title: string;
  description: string;
  fields: PreInterviewField[];
};

export type PreInterviewAnswers = Record<string, string>;

const field = (
  label: string,
  placeholder: string,
  options: Pick<PreInterviewField, "multiline" | "includeInPrompt"> = {}
): PreInterviewField => ({ label, placeholder, ...options });

export const preInterviewSections: PreInterviewSection[] = [
  {
    id: "profile",
    title: "个人定位",
    description: "让稿子先像你，再像一篇脱口秀稿。",
    fields: [
      field("常用称呼/艺名", "观众在台上应该怎么称呼你？"),
      field("联系方式", "手机号、微信或邮箱（不会发送给 AI）", {
        includeInPrompt: false,
      }),
      field("年龄/人生阶段", "例如：28 岁、刚工作三年、二孩妈妈"),
      field("所在城市", "常住城市或最熟悉的城市"),
      field("职业/身份", "尽量具体，例如：互联网产品经理、全职爸爸"),
      field("本次使用场景", "开放麦、商演、婚礼、公司年会、短视频等"),
      field("目标时长", "例如：3 分钟、5 分钟"),
      field("表演经验", "零基础、演过几次，或已有固定演出经验"),
      field("希望观众记住的标签", "演完后希望观众用哪几个词记住你？"),
    ],
  },
  {
    id: "goals",
    title: "本次写稿目标",
    description: "明确主题、观众和你不想要的方向。",
    fields: [
      field("稿子目标", "这篇稿子最重要的任务是什么？", { multiline: true }),
      field("希望整体风格", "犀利、松弛、自嘲、故事型、观察型等"),
      field("最想达到的效果", "爆笑、共鸣、立住人设、讲清一个观点等"),
      field("最想讲的主题1", "最有表达欲的主题"),
      field("最想讲的主题2", "第二选择，没有可不填"),
      field("最想讲的主题3", "第三选择，没有可不填"),
      field("不希望被写成什么样", "例如：鸡汤、网络段子拼贴、刻意冒犯", {
        multiline: true,
      }),
      field("目标观众", "年龄、职业、地域、与你的关系或现场构成"),
    ],
  },
  {
    id: "persona",
    title: "你是谁",
    description: "自我认知、别人眼里的你，以及最有喜感的反差。",
    fields: [
      field("3个词形容自己及证据", "每个词最好配一个真实例子", {
        multiline: true,
      }),
      field("别人最常吐槽你的点", "家人、朋友或同事最常怎么说你？", {
        multiline: true,
      }),
      field("你身上最大的反差", "例如：看起来社牛，其实害怕接电话", {
        multiline: true,
      }),
      field("最容易破防/尴尬的场景", "具体到人物、地点和当时发生了什么", {
        multiline: true,
      }),
      field("口头禅/语气/动作", "写下常说的原话，或描述你的标志性动作", {
        multiline: true,
      }),
    ],
  },
  {
    id: "existing",
    title: "已有稿件与反馈",
    description: "已有素材就做精修，没有可以跳过。",
    fields: [
      field("是否已有现成稿件", "有 / 没有，以及稿件目前的版本"),
      field("现有稿件内容", "粘贴需要续写或改写的稿件", { multiline: true }),
      field("现有稿件/录音/视频附件", "附件名称或链接（不会发送给 AI）", {
        includeInPrompt: false,
      }),
      field("目前有效的段落或句子", "哪些内容现场已经响过？", {
        multiline: true,
      }),
      field("目前最卡/最冷/最不像你的地方", "具体指出段落和问题", {
        multiline: true,
      }),
      field("已有演出反馈", "观众、演员或编剧给过哪些反馈？", {
        multiline: true,
      }),
      field("必须保留的内容", "必须保留的事实、原话、结构或包袱", {
        multiline: true,
      }),
      field("必须删掉的内容", "不想再出现的内容", { multiline: true }),
    ],
  },
  {
    id: "boundaries",
    title: "边界与冒犯尺度",
    description: "这里是硬约束。填写越明确，生成越安全。",
    fields: [
      field("绝对不能讲的话题或人物", "不能出现的人名、关系或敏感经历", {
        multiline: true,
      }),
      field("可匿名/改名/改关系的内容", "哪些事实可以做合成、匿名或改关系？", {
        multiline: true,
      }),
      field("家人尺度", "可以讲到什么程度？"),
      field("伴侣/前任尺度", "可以讲到什么程度？"),
      field("公司/客户尺度", "是否必须匿名，哪些信息不能出现？"),
      field("同事/朋友尺度", "可以讲到什么程度？"),
      field("收入/消费尺度", "能否出现具体数字或消费习惯？"),
      field("身材/外貌/年龄尺度", "哪些可以自嘲，哪些不能讲？"),
      field("疾病/心理状态尺度", "可讲范围与禁区"),
      field("性/亲密关系尺度", "可讲范围与禁区"),
      field("地域/身份标签尺度", "可讲范围与禁区"),
      field("现场是否有相关当事人", "谁会在现场？与表演者是什么关系？"),
      field("冒犯尺度整体要求", "保守、适中、辛辣，或给出具体边界", {
        multiline: true,
      }),
    ],
  },
  ...[1, 2, 3].map<PreInterviewSection>(eventNumber => ({
    id: `event-${eventNumber}`,
    title: `真实事件 ${eventNumber}`,
    description: "真实细节、原话和当时的反应，是最值钱的笑点素材。",
    fields: [
      field(`事件${eventNumber}标题`, "用一句话给这件事起名"),
      field(
        `事件${eventNumber}时间地点人物关系`,
        "什么时候、在哪里、有哪些人、彼此什么关系？",
        { multiline: true }
      ),
      field(`事件${eventNumber}经过`, "按真实发生顺序讲清楚，越具体越好", {
        multiline: true,
      }),
      field(`事件${eventNumber}原话和对话`, "尽量还原当时说过的原话", {
        multiline: true,
      }),
      field(
        `事件${eventNumber}真实反应`,
        "你当时怎么想、怎么做，身体有什么反应？",
        {
          multiline: true,
        }
      ),
      field(
        `事件${eventNumber}荒谬/反差点`,
        "现在回头看，最不合理或最矛盾的是什么？",
        {
          multiline: true,
        }
      ),
    ],
  })),
  {
    id: "patterns",
    title: "反复出现的人和事",
    description: "重复发生的失败和矛盾，最容易长成稳定的人设。",
    fields: [
      field("反复出现的问题", "生活里什么麻烦总在重演？", { multiline: true }),
      field("嘴上一套实际一套", "你说自己怎样，实际上又怎样？", {
        multiline: true,
      }),
      field("长期相处不来的某类人", "这类人有什么共同特征？", {
        multiline: true,
      }),
      field("重复失败的模式", "恋爱、工作、减肥、社交等反复失败的循环", {
        multiline: true,
      }),
      field("家人里最有戏的人", "描述这个人的习惯、原话和典型事件", {
        multiline: true,
      }),
      field("朋友/同事里最像段子的人", "描述这个人的习惯、原话和典型事件", {
        multiline: true,
      }),
      field("恋爱/前任/暧昧典型矛盾", "最常发生的冲突或错位", {
        multiline: true,
      }),
      field("最无语的一句原话", "尽量一字不改写下来"),
    ],
  },
  {
    id: "work-growth",
    title: "职业、家庭与成长",
    description: "行业黑话、家庭规则和成长环境都是高密度素材。",
    fields: [
      field("职业误解", "外行最常误解你职业的什么？", { multiline: true }),
      field("行业黑话/潜规则/奇怪流程", "列出外行听了会觉得荒谬的细节", {
        multiline: true,
      }),
      field("工作中最荒谬的一次沟通", "尽量还原人物、场景和原话", {
        multiline: true,
      }),
      field("职业爱恨", "为什么离不开，又为什么受不了？", {
        multiline: true,
      }),
      field("成长环境里的典型规则", "家里、学校或家乡有哪些默认规则？", {
        multiline: true,
      }),
      field("父母/长辈常说的一句话", "尽量保留原话和语气"),
      field("城市/家乡/学校奇怪细节", "只有当地人或校友才懂的具体细节", {
        multiline: true,
      }),
    ],
  },
  {
    id: "daily-life",
    title: "恋爱、社交与日常观察",
    description: "从熟悉生活里找到不合理但大家已经习惯的东西。",
    fields: [
      field("恋爱或社交固定问题", "你每次都会遇到什么问题？", {
        multiline: true,
      }),
      field("尴尬约会/聚会/饭局/群聊", "讲一件具体发生过的事", {
        multiline: true,
      }),
      field("日常习惯里的矛盾", "你有哪些明知不合理却一直保持的习惯？", {
        multiline: true,
      }),
      field("我一直不理解的是", "完成这句话，越具体越好", { multiline: true }),
      field("我最受不了的是", "完成这句话，并解释为什么", { multiline: true }),
      field("大家觉得正常但我觉得奇怪的是", "描述规则和你看到的漏洞", {
        multiline: true,
      }),
      field("我承认我有点双标的是", "对别人和对自己分别是什么标准？", {
        multiline: true,
      }),
      field("如果世界由我制定规则", "你会改掉什么，为什么？", {
        multiline: true,
      }),
    ],
  },
  {
    id: "performance",
    title: "语言与表演习惯",
    description: "让文字能从你的嘴里自然说出来。",
    fields: [
      field("不会说/说出口别扭的词", "列出不符合你语言习惯的词和表达"),
      field("讲东西最舒服的状态", "聊天感、吐槽感、讲故事、角色扮演等"),
      field("能做的动作或声音", "方言、模仿、音效、表情或肢体动作", {
        multiline: true,
      }),
      field("不想在台上做的表演方式", "例如：大喊、唱歌、夸张肢体、互动", {
        multiline: true,
      }),
    ],
  },
  {
    id: "brief",
    title: "最后给编剧的 Brief",
    description: "把前面的重点压缩成你最在意的创作要求。",
    fields: [
      field("给写稿人/AI的摘要", "用几句话总结：你是谁、讲什么、为什么好笑", {
        multiline: true,
      }),
      field("AI辅助生成指令", "例如：先立住人物，再围绕一个真实事件连续升级", {
        multiline: true,
      }),
      field("提交材料", "材料清单或链接（不会发送给 AI）", {
        multiline: true,
        includeInPrompt: false,
      }),
      field("补充说明", "还有什么是前面没有覆盖，但写稿必须知道的？", {
        multiline: true,
      }),
      field("截止时间", "交稿时间（不会发送给 AI）", {
        includeInPrompt: false,
      }),
      field("确认授权", "授权范围或备注（不会发送给 AI）", {
        includeInPrompt: false,
      }),
      field("填写日期", "填写日期（不会发送给 AI）", {
        includeInPrompt: false,
      }),
    ],
  },
];

export const preInterviewFields = preInterviewSections.flatMap(
  section => section.fields
);

export const preInterviewFieldLabels = new Set(
  preInterviewFields.map(item => item.label)
);

export const aiPreInterviewFieldLabels = new Set(
  preInterviewFields
    .filter(item => item.includeInPrompt !== false)
    .map(item => item.label)
);

export const toPromptReadyPreInterview = (
  answers: PreInterviewAnswers | undefined
) => {
  if (!answers) return {};

  return Object.fromEntries(
    Object.entries(answers)
      .filter(([label]) => aiPreInterviewFieldLabels.has(label))
      .map(([label, value]) => [label, value.trim()])
      .filter(([, value]) => value.length > 0)
  );
};
