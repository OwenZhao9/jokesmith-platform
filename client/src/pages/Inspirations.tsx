import { useState } from "react";
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
import {
  Lightbulb,
  Plus,
  Search,
  Trash2,
  FileText,
  Loader2,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function Inspirations() {
  const [search, setSearch] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedInspiration, setSelectedInspiration] = useState<{
    id: number;
    content: string;
  } | null>(null);

  // New inspiration form
  const [newContent, setNewContent] = useState("");
  const [newSource, setNewSource] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");

  // Convert to script form
  const [convertTitle, setConvertTitle] = useState("");
  const [convertCategory, setConvertCategory] = useState("other");

  const {
    data: inspirations,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.inspirations.list.useQuery(
    {
      search: search || undefined,
    },
    {
      retry: false,
    }
  );

  const createMutation = trpc.inspirations.create.useMutation({
    onSuccess: () => {
      toast.success("灵感已记录");
      refetch();
      resetNewForm();
      setNewDialogOpen(false);
    },
    onError: error => {
      toast.error("记录失败：" + error.message);
    },
  });

  const deleteMutation = trpc.inspirations.delete.useMutation({
    onSuccess: () => {
      toast.success("灵感已删除");
      refetch();
      setDeleteId(null);
    },
    onError: error => {
      toast.error("删除失败：" + error.message);
    },
  });

  const convertMutation = trpc.inspirations.convertToScript.useMutation({
    onSuccess: () => {
      toast.success("已转化为稿件");
      refetch();
      setConvertDialogOpen(false);
      setSelectedInspiration(null);
      setConvertTitle("");
      setConvertCategory("other");
    },
    onError: error => {
      toast.error("转化失败：" + error.message);
    },
  });

  const resetNewForm = () => {
    setNewContent("");
    setNewSource("");
    setNewTags([]);
    setNewTagInput("");
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !newTags.includes(newTagInput.trim())) {
      setNewTags([...newTags, newTagInput.trim()]);
      setNewTagInput("");
    }
  };

  const handleCreate = () => {
    if (!newContent.trim()) {
      toast.error("请输入灵感内容");
      return;
    }
    createMutation.mutate({
      content: newContent.trim(),
      source: newSource.trim() || undefined,
      tags: newTags.length > 0 ? newTags : undefined,
    });
  };

  const handleConvert = () => {
    if (!selectedInspiration) return;
    if (!convertTitle.trim()) {
      toast.error("请输入稿件标题");
      return;
    }
    convertMutation.mutate({
      id: selectedInspiration.id,
      title: convertTitle.trim(),
      category: convertCategory as
        | "politics"
        | "life"
        | "roast"
        | "relationship"
        | "work"
        | "family"
        | "tech"
        | "other",
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="h-8 w-8 text-neon-yellow" />
          <div>
            <h1 className="text-2xl font-display neon-pink">灵感库</h1>
            <p className="text-muted-foreground text-sm">
              记录你的碎片化想法和灵感
            </p>
          </div>
        </div>
        <Button
          onClick={() => setNewDialogOpen(true)}
          className="neon-box-pink"
        >
          <Plus className="mr-2 h-4 w-4" />
          记录灵感
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索灵感..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-input"
        />
      </div>

      {/* Inspirations List */}
      {isError ? (
        <AuthRequiredCard
          title="需要登录后查看灵感库"
          description={error.message}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !inspirations || inspirations.length === 0 ? (
        <Card className="club-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {search ? "没有找到匹配的灵感" : "还没有记录灵感，开始记录吧！"}
            </p>
            {!search && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setNewDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                记录灵感
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {inspirations.map(inspiration => (
            <Card
              key={inspiration.id}
              className={`club-card ${inspiration.isConverted ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardDescription className="text-xs">
                    {format(
                      new Date(inspiration.createdAt),
                      "yyyy年MM月dd日 HH:mm",
                      { locale: zhCN }
                    )}
                  </CardDescription>
                  {inspiration.isConverted && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      已转化
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">
                  {inspiration.content}
                </p>
                {inspiration.source && (
                  <p className="text-xs text-muted-foreground mt-2">
                    来源：{inspiration.source}
                  </p>
                )}
                {inspiration.tags && inspiration.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {inspiration.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4">
                  {!inspiration.isConverted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedInspiration({
                          id: inspiration.id,
                          content: inspiration.content,
                        });
                        setConvertDialogOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      转为稿件
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(inspiration.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New Inspiration Dialog */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>记录灵感</DialogTitle>
            <DialogDescription>快速记录你的想法和观察</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-content">灵感内容 *</Label>
              <Textarea
                id="new-content"
                placeholder="写下你的灵感..."
                value={newContent}
                onChange={e => setNewContent(e.target.value)}
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-source">来源（可选）</Label>
              <Input
                id="new-source"
                placeholder="例如：地铁上听到的对话"
                value={newSource}
                onChange={e => setNewSource(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>标签（可选）</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="添加标签"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button variant="outline" size="icon" onClick={handleAddTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {newTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          setNewTags(newTags.filter(t => t !== tag))
                        }
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
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

      {/* Convert to Script Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>转化为稿件</DialogTitle>
            <DialogDescription>将灵感转化为正式稿件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedInspiration && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                {selectedInspiration.content}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="convert-title">稿件标题 *</Label>
              <Input
                id="convert-title"
                placeholder="输入稿件标题"
                value={convertTitle}
                onChange={e => setConvertTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={convertCategory}
                onValueChange={setConvertCategory}
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConvertDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending}
            >
              {convertMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  转化中...
                </>
              ) : (
                "转化"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条灵感吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "删除"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
