import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Calendar, Plus, Trash2, Edit, Loader2, MapPin, Clock, FileText, Check } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: "计划中", color: "bg-blue-500/20 text-blue-400" },
  completed: { label: "已完成", color: "bg-green-500/20 text-green-400" },
  cancelled: { label: "已取消", color: "bg-red-500/20 text-red-400" },
};

export default function Shows() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShow, setEditingShow] = useState<{
    id: number;
    title: string;
    venue: string | null;
    showDate: Date;
    duration: number | null;
    notes: string | null;
    status: "planned" | "completed" | "cancelled";
  } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [showDate, setShowDate] = useState("");
  const [showTime, setShowTime] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"planned" | "completed" | "cancelled">("planned");
  const [selectedScripts, setSelectedScripts] = useState<number[]>([]);

  const { data: shows, isLoading, refetch } = trpc.shows.list.useQuery();
  const { data: scripts } = trpc.scripts.list.useQuery({});

  const createMutation = trpc.shows.create.useMutation({
    onSuccess: () => {
      toast.success("演出已创建");
      refetch();
      resetForm();
      setDialogOpen(false);
    },
    onError: (error) => {
      toast.error("创建失败：" + error.message);
    },
  });

  const updateMutation = trpc.shows.update.useMutation({
    onSuccess: () => {
      toast.success("演出已更新");
      refetch();
      resetForm();
      setDialogOpen(false);
      setEditingShow(null);
    },
    onError: (error) => {
      toast.error("更新失败：" + error.message);
    },
  });

  const deleteMutation = trpc.shows.delete.useMutation({
    onSuccess: () => {
      toast.success("演出已删除");
      refetch();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error("删除失败：" + error.message);
    },
  });

  const resetForm = () => {
    setTitle("");
    setVenue("");
    setShowDate("");
    setShowTime("");
    setDuration("");
    setNotes("");
    setStatus("planned");
    setSelectedScripts([]);
  };

  const handleOpenDialog = (show?: typeof editingShow) => {
    if (show) {
      setEditingShow(show);
      setTitle(show.title);
      setVenue(show.venue || "");
      setShowDate(format(new Date(show.showDate), "yyyy-MM-dd"));
      setShowTime(format(new Date(show.showDate), "HH:mm"));
      setDuration(show.duration?.toString() || "");
      setNotes(show.notes || "");
      setStatus(show.status);
    } else {
      resetForm();
      setEditingShow(null);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("请输入演出名称");
      return;
    }
    if (!showDate || !showTime) {
      toast.error("请选择演出时间");
      return;
    }

    const dateTime = new Date(`${showDate}T${showTime}`);
    const data = {
      title: title.trim(),
      venue: venue.trim() || undefined,
      showDate: dateTime.getTime(),
      duration: duration ? parseInt(duration) : undefined,
      notes: notes.trim() || undefined,
      scriptIds: selectedScripts.length > 0 ? selectedScripts : undefined,
    };

    if (editingShow) {
      updateMutation.mutate({
        id: editingShow.id,
        ...data,
        status,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
    }
  };

  const toggleScript = (scriptId: number) => {
    setSelectedScripts((prev) =>
      prev.includes(scriptId)
        ? prev.filter((id) => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Group shows by status
  const groupedShows = useMemo(() => {
    if (!shows) return { planned: [], completed: [], cancelled: [] };
    return {
      planned: shows.filter((s) => s.status === "planned"),
      completed: shows.filter((s) => s.status === "completed"),
      cancelled: shows.filter((s) => s.status === "cancelled"),
    };
  }, [shows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-accent" />
          <div>
            <h1 className="text-2xl font-display neon-blue">演出排表</h1>
            <p className="text-muted-foreground text-sm">管理你的演出计划</p>
          </div>
        </div>
        <Button onClick={() => handleOpenDialog()} className="neon-box-blue">
          <Plus className="mr-2 h-4 w-4" />
          新建演出
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !shows || shows.length === 0 ? (
        <Card className="club-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">还没有演出计划</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="mr-2 h-4 w-4" />
              新建演出
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Planned Shows */}
          {groupedShows.planned.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                计划中 ({groupedShows.planned.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedShows.planned.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    onEdit={() => handleOpenDialog(show)}
                    onDelete={() => setDeleteId(show.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Shows */}
          {groupedShows.completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                已完成 ({groupedShows.completed.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedShows.completed.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    onEdit={() => handleOpenDialog(show)}
                    onDelete={() => setDeleteId(show.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Shows */}
          {groupedShows.cancelled.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                已取消 ({groupedShows.cancelled.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedShows.cancelled.map((show) => (
                  <ShowCard
                    key={show.id}
                    show={show}
                    onEdit={() => handleOpenDialog(show)}
                    onDelete={() => setDeleteId(show.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShow ? "编辑演出" : "新建演出"}</DialogTitle>
            <DialogDescription>
              {editingShow ? "修改演出信息" : "添加新的演出计划"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">演出名称 *</Label>
              <Input
                id="title"
                placeholder="例如：周末开放麦"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">场地</Label>
              <Input
                id="venue"
                placeholder="例如：笑果工厂"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">日期 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={showDate}
                  onChange={(e) => setShowDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">时间 *</Label>
                <Input
                  id="time"
                  type="time"
                  value={showTime}
                  onChange={(e) => setShowTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">时长（分钟）</Label>
              <Input
                id="duration"
                type="number"
                placeholder="例如：10"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            {editingShow && (
              <div className="space-y-2">
                <Label>状态</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">计划中</SelectItem>
                    <SelectItem value="completed">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="添加备注..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            {scripts && scripts.length > 0 && (
              <div className="space-y-2">
                <Label>关联稿件</Label>
                <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
                  {scripts.map((script) => (
                    <div
                      key={script.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleScript(script.id)}
                    >
                      <Checkbox
                        checked={selectedScripts.includes(script.id)}
                        onCheckedChange={() => toggleScript(script.id)}
                      />
                      <span className="text-sm truncate">{script.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这个演出吗？此操作无法撤销。
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

function ShowCard({
  show,
  onEdit,
  onDelete,
}: {
  show: {
    id: number;
    title: string;
    venue: string | null;
    showDate: Date;
    duration: number | null;
    notes: string | null;
    status: "planned" | "completed" | "cancelled";
  };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusInfo = statusLabels[show.status];

  return (
    <Card className="club-card group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base line-clamp-1">{show.title}</CardTitle>
          <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(show.showDate), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
            </span>
          </div>
          {show.venue && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{show.venue}</span>
            </div>
          )}
          {show.duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{show.duration} 分钟</span>
            </div>
          )}
        </div>
        {show.notes && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
            {show.notes}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
