import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AudioLines, Upload, Loader2, FileText, Play, Trash2, Check, X, AlertCircle } from "lucide-react";
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
import { storagePut } from "@/lib/storage";

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

const statusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: "待处理", icon: <AlertCircle className="h-3 w-3" />, color: "bg-yellow-500/20 text-yellow-400" },
  processing: { label: "处理中", icon: <Loader2 className="h-3 w-3 animate-spin" />, color: "bg-blue-500/20 text-blue-400" },
  completed: { label: "已完成", icon: <Check className="h-3 w-3" />, color: "bg-green-500/20 text-green-400" },
  failed: { label: "失败", icon: <X className="h-3 w-3" />, color: "bg-red-500/20 text-red-400" },
};

export default function Transcription() {
  const [uploading, setUploading] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedTranscription, setSelectedTranscription] = useState<{
    id: number;
    transcribedText: string | null;
  } | null>(null);
  const [convertTitle, setConvertTitle] = useState("");
  const [convertCategory, setConvertCategory] = useState("other");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: transcriptions, isLoading, refetch } = trpc.transcription.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.transcription.create.useMutation({
    onSuccess: (data) => {
      toast.success("音频已上传，开始转录");
      refetch();
      // Auto-start processing
      processMutation.mutate({ id: data.id });
    },
    onError: (error) => {
      toast.error("上传失败：" + error.message);
    },
  });

  const processMutation = trpc.transcription.process.useMutation({
    onSuccess: () => {
      toast.success("转录完成！");
      refetch();
    },
    onError: (error) => {
      toast.error("转录失败：" + error.message);
      refetch();
    },
  });

  const convertMutation = trpc.transcription.convertToScript.useMutation({
    onSuccess: () => {
      toast.success("已转化为稿件");
      refetch();
      setConvertDialogOpen(false);
      setSelectedTranscription(null);
      setConvertTitle("");
      setConvertCategory("other");
    },
    onError: (error) => {
      toast.error("转化失败：" + error.message);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (16MB limit)
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 16) {
      toast.error("文件大小超过16MB限制");
      return;
    }

    // Check file type
    const allowedTypes = ["audio/webm", "audio/mp3", "audio/mpeg", "audio/wav", "audio/ogg", "audio/m4a", "audio/mp4"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("不支持的音频格式，请上传 mp3、wav、webm、ogg 或 m4a 格式");
      return;
    }

    setUploading(true);
    try {
      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = file.name.split(".").pop() || "mp3";
      const fileKey = `transcriptions/${timestamp}-${randomSuffix}.${extension}`;

      // Upload to S3
      const arrayBuffer = await file.arrayBuffer();
      const result = await storagePut(fileKey, new Uint8Array(arrayBuffer), file.type);

      // Create transcription record
      createMutation.mutate({
        audioUrl: result.url,
        audioKey: result.key,
      });
    } catch (error) {
      toast.error("上传失败：" + (error instanceof Error ? error.message : "未知错误"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleConvert = () => {
    if (!selectedTranscription) return;
    if (!convertTitle.trim()) {
      toast.error("请输入稿件标题");
      return;
    }
    convertMutation.mutate({
      id: selectedTranscription.id,
      title: convertTitle.trim(),
      category: convertCategory as "politics" | "life" | "roast" | "relationship" | "work" | "family" | "tech" | "other",
    });
  };

  const handleRetry = (id: number) => {
    processMutation.mutate({ id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AudioLines className="h-8 w-8 text-primary mic-icon" />
        <div>
          <h1 className="text-2xl font-display neon-pink">录音转文字</h1>
          <p className="text-muted-foreground text-sm">上传演出或排练录音，自动转录为文字</p>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="club-card">
        <CardContent className="pt-6">
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">上传中...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">点击上传音频文件</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    支持 mp3、wav、webm、ogg、m4a 格式，最大 16MB
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transcriptions List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">转录记录</h2>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !transcriptions || transcriptions.length === 0 ? (
          <Card className="club-card">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AudioLines className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">还没有转录记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {transcriptions.map((transcription) => {
              const statusInfo = statusLabels[transcription.status];
              return (
                <Card key={transcription.id} className="club-card">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardDescription className="text-xs">
                        {format(new Date(transcription.createdAt), "yyyy年MM月dd日 HH:mm", { locale: zhCN })}
                      </CardDescription>
                      <Badge className={`gap-1 ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {transcription.status === "completed" && transcription.transcribedText ? (
                      <>
                        <p className="text-sm whitespace-pre-wrap line-clamp-4">
                          {transcription.transcribedText}
                        </p>
                        <div className="flex justify-end gap-2 mt-4">
                          {!transcription.convertedScriptId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedTranscription({
                                  id: transcription.id,
                                  transcribedText: transcription.transcribedText,
                                });
                                setConvertDialogOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              转为稿件
                            </Button>
                          )}
                          {transcription.convertedScriptId && (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="h-3 w-3" />
                              已转为稿件
                            </Badge>
                          )}
                        </div>
                      </>
                    ) : transcription.status === "failed" ? (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-destructive">转录失败，请重试</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(transcription.id)}
                          disabled={processMutation.isPending}
                        >
                          {processMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "重试"
                          )}
                        </Button>
                      </div>
                    ) : transcription.status === "processing" ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        正在转录中，请稍候...
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">等待处理</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetry(transcription.id)}
                          disabled={processMutation.isPending}
                        >
                          开始转录
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Convert to Script Dialog */}
      <Dialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>转化为稿件</DialogTitle>
            <DialogDescription>将转录文字保存为正式稿件</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedTranscription && (
              <div className="p-3 bg-muted rounded-lg text-sm max-h-[150px] overflow-y-auto">
                {selectedTranscription.transcribedText}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="convert-title">稿件标题 *</Label>
              <Input
                id="convert-title"
                placeholder="输入稿件标题"
                value={convertTitle}
                onChange={(e) => setConvertTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={convertCategory} onValueChange={setConvertCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConvert} disabled={convertMutation.isPending}>
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
    </div>
  );
}
