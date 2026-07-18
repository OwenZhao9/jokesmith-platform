import { lazy, Suspense, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Save, X, Plus } from "lucide-react";
import { toast } from "sonner";
import AccessPasswordDialog from "@/components/AccessPasswordDialog";
import PreInterviewForm from "@/components/PreInterviewForm";
import {
  clearStoredSupabaseAccessSession,
  generateJokeWithSupabase,
  getStoredSupabaseAccessSession,
  isSupabaseBackendEnabled,
  loginSupabaseAccess,
  SupabaseAdminError,
} from "@/lib/supabaseAdmin";
import {
  toPromptReadyPreInterview,
  type PreInterviewAnswers,
} from "@shared/preInterview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "politics", label: "政治" },
  { value: "life", label: "生活" },
  { value: "roast", label: "吐槽" },
  { value: "relationship", label: "情感" },
  { value: "work", label: "职场" },
  { value: "family", label: "家庭" },
  { value: "tech", label: "科技" },
  { value: "other", label: "其他" },
];

const Streamdown = lazy(async () => {
  const module = await import("streamdown");
  return { default: module.Streamdown };
});

export default function Home() {
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [usePersonalStyle, setUsePersonalStyle] = useState(false);
  const [preInterviewAnswers, setPreInterviewAnswers] =
    useState<PreInterviewAnswers>({});
  const [generatedContent, setGeneratedContent] = useState("");
  const [isSupabaseGenerating, setIsSupabaseGenerating] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [isAccessLoggingIn, setIsAccessLoggingIn] = useState(false);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveCategory, setSaveCategory] = useState("other");

  const generateMutation = trpc.ai.generateJoke.useMutation({
    onSuccess: data => {
      setGeneratedContent(data.content);
      toast.success("段子生成成功！");
    },
    onError: error => {
      toast.error("生成失败：" + error.message);
    },
  });

  const createScriptMutation = trpc.scripts.create.useMutation({
    onSuccess: () => {
      toast.success("稿件保存成功！");
      setSaveDialogOpen(false);
      setSaveTitle("");
      setSaveCategory("other");
    },
    onError: error => {
      toast.error("保存失败：" + error.message);
    },
  });

  const { data: user } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: userStyle } = trpc.style.get.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });

  const runSupabaseGenerate = () => {
    setIsSupabaseGenerating(true);
    generateJokeWithSupabase({
      topic: topic.trim(),
      keywords: keywords.length > 0 ? keywords : undefined,
      usePersonalStyle,
      preInterview: toPromptReadyPreInterview(preInterviewAnswers),
    })
      .then(data => {
        setGeneratedContent(data.content);
        toast.success("段子生成成功！");
      })
      .catch(error => {
        if (error instanceof SupabaseAdminError && error.status === 401) {
          clearStoredSupabaseAccessSession();
          setAccessDialogOpen(true);
          toast.error("请先输入访问密码");
          return;
        }

        const message = error instanceof Error ? error.message : "未知错误";
        toast.error("生成失败：" + message);
      })
      .finally(() => {
        setIsSupabaseGenerating(false);
      });
  };

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("请输入话题");
      return;
    }

    if (isSupabaseBackendEnabled()) {
      if (!getStoredSupabaseAccessSession()) {
        setAccessDialogOpen(true);
        return;
      }

      runSupabaseGenerate();
      return;
    }

    generateMutation.mutate({
      topic: topic.trim(),
      keywords: keywords.length > 0 ? keywords : undefined,
      usePersonalStyle,
      preInterview: toPromptReadyPreInterview(preInterviewAnswers),
    });
  };

  const handlePreInterviewChange = (label: string, value: string) => {
    setPreInterviewAnswers(current => ({ ...current, [label]: value }));
  };

  const handleAccessLogin = () => {
    if (!accessPassword.trim()) {
      toast.error("请输入访问密码");
      return;
    }

    setIsAccessLoggingIn(true);
    loginSupabaseAccess(accessPassword.trim())
      .then(() => {
        toast.success("访问验证通过");
        setAccessPassword("");
        setAccessDialogOpen(false);
        runSupabaseGenerate();
      })
      .catch(error => {
        const message = error instanceof Error ? error.message : "未知错误";
        toast.error("验证失败：" + message);
      })
      .finally(() => {
        setIsAccessLoggingIn(false);
      });
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSaveScript = () => {
    if (!saveTitle.trim()) {
      toast.error("请输入稿件标题");
      return;
    }
    createScriptMutation.mutate({
      title: saveTitle.trim(),
      content: generatedContent,
      category: saveCategory as
        | "politics"
        | "life"
        | "roast"
        | "relationship"
        | "work"
        | "family"
        | "tech"
        | "other",
      tags: keywords,
    });
  };

  const hasStyle =
    userStyle &&
    (userStyle.comedyStyle ||
      userStyle.languageHabits ||
      (userStyle.commonTags && userStyle.commonTags.length > 0));
  const isGenerating = generateMutation.isPending || isSupabaseGenerating;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-8 w-8 text-primary mic-icon" />
        <div>
          <h1 className="text-2xl font-display neon-pink">AI 写稿助手</h1>
          <p className="text-muted-foreground text-sm">
            输入话题，让 AI 帮你创作脱口秀段子
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Input Section */}
          <Card className="club-card">
            <CardHeader>
              <CardTitle className="text-lg">创作设置</CardTitle>
              <CardDescription>设置话题和关键词，开始创作</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic">话题 *</Label>
                <Input
                  id="topic"
                  placeholder="例如：相亲、加班、养猫..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="bg-input"
                />
              </div>

              <div className="space-y-2">
                <Label>关键词（可选）</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="添加关键词"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    className="bg-input"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleAddKeyword}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {keywords.map(keyword => (
                      <Badge
                        key={keyword}
                        variant="secondary"
                        className="gap-1"
                      >
                        {keyword}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveKeyword(keyword)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="personal-style" className="cursor-pointer">
                    使用个人风格
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {hasStyle
                      ? "根据你设置的喜剧风格生成"
                      : "请先在「个人风格」页面设置你的风格"}
                  </p>
                </div>
                <Switch
                  id="personal-style"
                  checked={usePersonalStyle}
                  onCheckedChange={setUsePersonalStyle}
                  disabled={!hasStyle}
                />
              </div>
            </CardContent>
          </Card>

          <PreInterviewForm
            answers={preInterviewAnswers}
            onChange={handlePreInterviewChange}
            onClear={() => setPreInterviewAnswers({})}
          />

          <Button
            className="h-12 w-full text-base neon-box-pink"
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在提炼素材并生成舞台稿...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                根据前采生成段子
              </>
            )}
          </Button>
        </div>

        {/* Output Section */}
        <Card className="club-card lg:sticky lg:top-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">生成结果</CardTitle>
                <CardDescription>AI 生成的脱口秀段子</CardDescription>
              </div>
              {generatedContent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                  className="neon-box-purple"
                >
                  <Save className="mr-2 h-4 w-4" />
                  保存为稿件
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedContent ? (
              <div className="prose max-w-none">
                <Suspense
                  fallback={
                    <p className="text-sm text-muted-foreground">
                      正在渲染生成结果...
                    </p>
                  }
                >
                  <Streamdown>{generatedContent}</Streamdown>
                </Suspense>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-30" />
                <p>填写话题和前采后，AI 将生成可排练的舞台稿</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AccessPasswordDialog
        open={accessDialogOpen}
        password={accessPassword}
        isSubmitting={isAccessLoggingIn}
        onOpenChange={setAccessDialogOpen}
        onPasswordChange={setAccessPassword}
        onSubmit={handleAccessLogin}
      />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>保存为稿件</DialogTitle>
            <DialogDescription>为生成的段子添加标题和分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="save-title">稿件标题 *</Label>
              <Input
                id="save-title"
                placeholder="输入稿件标题"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="save-category">分类</Label>
              <Select value={saveCategory} onValueChange={setSaveCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSaveScript}
              disabled={createScriptMutation.isPending}
            >
              {createScriptMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
