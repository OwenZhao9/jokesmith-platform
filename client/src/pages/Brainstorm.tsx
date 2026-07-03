import { useState } from "react";
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
import {
  Brain,
  Loader2,
  Sparkles,
  Target,
  Link2,
  Laugh,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import AccessPasswordDialog from "@/components/AccessPasswordDialog";
import {
  clearStoredSupabaseAccessSession,
  generateBrainstormWithSupabase,
  getStoredSupabaseAccessSession,
  isSupabaseBackendEnabled,
  loginSupabaseAccess,
  SupabaseAdminError,
} from "@/lib/supabaseAdmin";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function Brainstorm() {
  const [topic, setTopic] = useState("");
  const [currentResult, setCurrentResult] = useState<{
    id: number;
    angles: string[];
    associations: string[];
    punchlines: string[];
  } | null>(null);
  const [isSupabaseGenerating, setIsSupabaseGenerating] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");
  const [isAccessLoggingIn, setIsAccessLoggingIn] = useState(false);

  const {
    data: brainstorms,
    isLoading: isLoadingHistory,
    isError: isHistoryError,
    error: historyError,
    refetch,
  } = trpc.brainstorm.list.useQuery(undefined, { retry: false });

  const generateMutation = trpc.brainstorm.generate.useMutation({
    onSuccess: data => {
      setCurrentResult({
        id: data.id,
        angles: data.angles || [],
        associations: data.associations || [],
        punchlines: data.punchlines || [],
      });
      refetch();
      toast.success("头脑风暴完成！");
    },
    onError: error => {
      toast.error("生成失败：" + error.message);
    },
  });

  const runSupabaseGenerate = () => {
    setIsSupabaseGenerating(true);
    generateBrainstormWithSupabase(topic.trim())
      .then(data => {
        setCurrentResult({
          id: data.id,
          angles: data.angles || [],
          associations: data.associations || [],
          punchlines: data.punchlines || [],
        });
        toast.success("头脑风暴完成！");
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

    generateMutation.mutate({ topic: topic.trim() });
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
  const isGenerating = generateMutation.isPending || isSupabaseGenerating;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-secondary" />
        <div>
          <h1 className="text-2xl font-display neon-purple">话题头脑风暴</h1>
          <p className="text-muted-foreground text-sm">
            输入话题，AI 帮你发散思维
          </p>
        </div>
      </div>

      <AccessPasswordDialog
        open={accessDialogOpen}
        password={accessPassword}
        isSubmitting={isAccessLoggingIn}
        onOpenChange={setAccessDialogOpen}
        onPasswordChange={setAccessPassword}
        onSubmit={handleAccessLogin}
      />

      {/* Input Section */}
      <Card className="club-card">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Input
              placeholder="输入话题，例如：相亲、加班、养宠物..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              className="bg-input flex-1"
            />
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="neon-box-purple"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  思考中...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  开始风暴
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Result */}
      {currentResult && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="club-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">切入角度</CardTitle>
              </div>
              <CardDescription className="text-xs">
                从不同视角探讨话题
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentResult.angles.map((angle, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-primary shrink-0">{index + 1}.</span>
                    <span>{angle}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="club-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-secondary" />
                <CardTitle className="text-base">相关联想</CardTitle>
              </div>
              <CardDescription className="text-xs">
                出人意料的关联
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentResult.associations.map((assoc, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-secondary shrink-0">
                      {index + 1}.
                    </span>
                    <span>{assoc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="club-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Laugh className="h-5 w-5 text-accent" />
                <CardTitle className="text-base">笑点方向</CardTitle>
              </div>
              <CardDescription className="text-xs">
                可能产生喜剧效果的方向
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {currentResult.punchlines.map((punch, index) => (
                  <li key={index} className="flex gap-2 text-sm">
                    <span className="text-accent shrink-0">{index + 1}.</span>
                    <span>{punch}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">历史记录</h2>
        {isHistoryError ? (
          <AuthRequiredCard
            title="需要登录后查看头脑风暴历史"
            description={historyError.message}
          />
        ) : isLoadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !brainstorms || brainstorms.length === 0 ? (
          <Card className="club-card">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Brain className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                还没有头脑风暴记录
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {brainstorms.map(brainstorm => (
              <BrainstormHistoryItem
                key={brainstorm.id}
                brainstorm={brainstorm}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BrainstormHistoryItem({
  brainstorm,
}: {
  brainstorm: {
    id: number;
    topic: string;
    angles: string[] | null;
    associations: string[] | null;
    punchlines: string[] | null;
    createdAt: Date;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="club-card">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline">{brainstorm.topic}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(
                    new Date(brainstorm.createdAt),
                    "yyyy年MM月dd日 HH:mm",
                    { locale: zhCN }
                  )}
                </span>
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Target className="h-4 w-4 text-primary" />
                  切入角度
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {brainstorm.angles?.map((angle, i) => (
                    <li key={i}>• {angle}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Link2 className="h-4 w-4 text-secondary" />
                  相关联想
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {brainstorm.associations?.map((assoc, i) => (
                    <li key={i}>• {assoc}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Laugh className="h-4 w-4 text-accent" />
                  笑点方向
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {brainstorm.punchlines?.map((punch, i) => (
                    <li key={i}>• {punch}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
