import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AuthRequiredCard from "@/components/AuthRequiredCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { User, Save, Loader2, X, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Style() {
  const [comedyStyle, setComedyStyle] = useState("");
  const [languageHabits, setLanguageHabits] = useState("");
  const [commonTags, setCommonTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tonePreference, setTonePreference] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const {
    data: style,
    isLoading,
    isError,
    error,
  } = trpc.style.get.useQuery(undefined, { retry: false });

  const updateMutation = trpc.style.update.useMutation({
    onSuccess: () => {
      toast.success("个人风格已保存");
    },
    onError: error => {
      toast.error("保存失败：" + error.message);
    },
  });

  useEffect(() => {
    if (style) {
      setComedyStyle(style.comedyStyle || "");
      setLanguageHabits(style.languageHabits || "");
      setCommonTags(style.commonTags || []);
      setTonePreference(style.tonePreference || "");
      setTargetAudience(style.targetAudience || "");
    }
  }, [style]);

  const handleAddTag = () => {
    if (tagInput.trim() && !commonTags.includes(tagInput.trim())) {
      setCommonTags([...commonTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setCommonTags(commonTags.filter(t => t !== tag));
  };

  const handleSave = () => {
    updateMutation.mutate({
      comedyStyle: comedyStyle.trim() || undefined,
      languageHabits: languageHabits.trim() || undefined,
      commonTags: commonTags.length > 0 ? commonTags : undefined,
      tonePreference: tonePreference.trim() || undefined,
      targetAudience: targetAudience.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <AuthRequiredCard
        title="需要登录后设置个人风格"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-8 w-8 text-primary mic-icon" />
          <div>
            <h1 className="text-2xl font-display neon-pink">个人风格</h1>
            <p className="text-muted-foreground text-sm">
              设置你的喜剧风格，让 AI 更懂你
            </p>
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="neon-box-pink"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="club-card">
          <CardHeader>
            <CardTitle className="text-lg">喜剧风格</CardTitle>
            <CardDescription>描述你的喜剧风格和表演特点</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comedy-style">风格描述</Label>
              <Textarea
                id="comedy-style"
                placeholder="例如：擅长观察式幽默，喜欢从日常生活中发现荒诞；偏好自嘲式表达，善于用夸张手法放大小事..."
                value={comedyStyle}
                onChange={e => setComedyStyle(e.target.value)}
                className="min-h-[120px] bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">语气偏好</Label>
              <Input
                id="tone"
                placeholder="例如：轻松幽默、犀利讽刺、温和自嘲..."
                value={tonePreference}
                onChange={e => setTonePreference(e.target.value)}
                className="bg-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="club-card">
          <CardHeader>
            <CardTitle className="text-lg">语言习惯</CardTitle>
            <CardDescription>你的口头禅和常用表达方式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language-habits">语言特点</Label>
              <Textarea
                id="language-habits"
                placeholder="例如：喜欢用反问句；常说「你们知道吗」「说真的」；喜欢用比喻..."
                value={languageHabits}
                onChange={e => setLanguageHabits(e.target.value)}
                className="min-h-[120px] bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">目标受众</Label>
              <Input
                id="audience"
                placeholder="例如：年轻白领、大学生、都市青年..."
                value={targetAudience}
                onChange={e => setTargetAudience(e.target.value)}
                className="bg-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="club-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">常用梗/标签</CardTitle>
            <CardDescription>你经常使用的梗、话题或标签</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="添加常用梗或标签"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="bg-input"
              />
              <Button variant="outline" onClick={handleAddTag}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>
            {commonTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {commonTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 px-3 py-1"
                  >
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer ml-1"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                还没有添加常用梗，添加后可以在 AI 写稿时使用
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="club-card lg:col-span-2 border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">如何使用个人风格</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                设置好个人风格后，在「AI
                写稿」页面可以开启「使用个人风格」开关。 AI
                会根据你设置的喜剧风格、语言习惯和常用梗来生成更符合你个人特色的段子。
              </p>
              <p>
                建议尽可能详细地描述你的风格特点，这样 AI
                生成的内容会更贴近你的表演风格。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
