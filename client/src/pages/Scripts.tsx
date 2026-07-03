import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AuthRequiredCard from "@/components/AuthRequiredCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Search, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
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
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

const categories = [
  { value: "all", label: "全部分类" },
  { value: "politics", label: "政治" },
  { value: "life", label: "生活" },
  { value: "roast", label: "吐槽" },
  { value: "relationship", label: "情感" },
  { value: "work", label: "职场" },
  { value: "family", label: "家庭" },
  { value: "tech", label: "科技" },
  { value: "other", label: "其他" },
];

const categoryLabels: Record<string, string> = {
  politics: "政治",
  life: "生活",
  roast: "吐槽",
  relationship: "情感",
  work: "职场",
  family: "家庭",
  tech: "科技",
  other: "其他",
};

export default function Scripts() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    data: scripts,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.scripts.list.useQuery(
    {
      category: category === "all" ? undefined : category,
      search: search || undefined,
    },
    { retry: false }
  );

  const deleteMutation = trpc.scripts.delete.useMutation({
    onSuccess: () => {
      toast.success("稿件已删除");
      refetch();
      setDeleteId(null);
    },
    onError: error => {
      toast.error("删除失败：" + error.message);
    },
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const filteredScripts = useMemo(() => {
    return scripts || [];
  }, [scripts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary mic-icon" />
          <div>
            <h1 className="text-2xl font-display neon-pink">稿件管理</h1>
            <p className="text-muted-foreground text-sm">
              管理你的所有脱口秀稿件
            </p>
          </div>
        </div>
        <Button
          onClick={() => setLocation("/scripts/new")}
          className="neon-box-pink"
        >
          <Plus className="mr-2 h-4 w-4" />
          新建稿件
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索稿件..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-input"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
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

      {/* Scripts List */}
      {isError ? (
        <AuthRequiredCard
          title="需要登录后查看稿件"
          description={error.message}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredScripts.length === 0 ? (
        <Card className="club-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {search || category !== "all"
                ? "没有找到匹配的稿件"
                : "还没有稿件，开始创作吧！"}
            </p>
            {!search && category === "all" && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setLocation("/scripts/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                新建稿件
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredScripts.map(script => (
            <Card
              key={script.id}
              className="club-card cursor-pointer hover:border-primary/50 transition-colors group"
              onClick={() => setLocation(`/scripts/${script.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                    {script.title}
                  </CardTitle>
                  <Badge variant="secondary" className="shrink-0 ml-2">
                    {categoryLabels[script.category] || script.category}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  {format(new Date(script.updatedAt), "yyyy年MM月dd日 HH:mm", {
                    locale: zhCN,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {script.content}
                </p>
                {script.tags && script.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {script.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {script.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{script.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      setLocation(`/scripts/${script.id}`);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteId(script.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个稿件吗？此操作无法撤销。
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
