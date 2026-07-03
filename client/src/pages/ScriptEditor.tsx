import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import AuthRequiredCard from "@/components/AuthRequiredCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
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

type CategoryType =
  | "politics"
  | "life"
  | "roast"
  | "relationship"
  | "work"
  | "family"
  | "tech"
  | "other";

export default function ScriptEditor() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isEditing = params.id && params.id !== "new";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<CategoryType>("other");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const {
    data: script,
    isLoading,
    isError,
    error,
  } = trpc.scripts.get.useQuery(
    { id: Number(params.id) },
    { enabled: !!isEditing, retry: false }
  );

  const createMutation = trpc.scripts.create.useMutation({
    onSuccess: () => {
      toast.success("稿件创建成功");
      setLocation("/scripts");
    },
    onError: error => {
      toast.error("创建失败：" + error.message);
    },
  });

  const updateMutation = trpc.scripts.update.useMutation({
    onSuccess: () => {
      toast.success("稿件更新成功");
      setLocation("/scripts");
    },
    onError: error => {
      toast.error("更新失败：" + error.message);
    },
  });

  useEffect(() => {
    if (script) {
      setTitle(script.title);
      setContent(script.content);
      setCategory(script.category as CategoryType);
      setTags(script.tags || []);
    }
  }, [script]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }
    if (!content.trim()) {
      toast.error("请输入内容");
      return;
    }

    if (isEditing) {
      updateMutation.mutate({
        id: Number(params.id),
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
      });
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isEditing && isError) {
    return (
      <AuthRequiredCard
        title="需要登录后编辑稿件"
        description={error.message}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/scripts")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-display neon-pink">
            {isEditing ? "编辑稿件" : "新建稿件"}
          </h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="neon-box-pink"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              保存
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="club-card">
            <CardHeader>
              <CardTitle className="text-lg">稿件内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题 *</Label>
                <Input
                  id="title"
                  placeholder="输入稿件标题"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="bg-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">内容 *</Label>
                <Textarea
                  id="content"
                  placeholder="在这里写下你的段子..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="min-h-[400px] bg-input resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="club-card">
            <CardHeader>
              <CardTitle className="text-lg">稿件设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>分类</Label>
                <Select
                  value={category}
                  onValueChange={v => setCategory(v as CategoryType)}
                >
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

              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="添加标签"
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
                  <Button variant="outline" size="icon" onClick={handleAddTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="club-card">
            <CardHeader>
              <CardTitle className="text-lg">统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">字数</span>
                  <span>{content.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">段落</span>
                  <span>{content.split(/\n\n+/).filter(Boolean).length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
