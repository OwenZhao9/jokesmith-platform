import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const { data: user, isLoading: userLoading } = trpc.auth.me.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (!userLoading && user) {
      setLocation("/");
    }
  }, [setLocation, user, userLoading]);

  const onAuthSuccess = async (message: string) => {
    toast.success(message);
    await utils.auth.me.invalidate();
    setLocation("/");
  };

  const loginMutation = trpc.auth.passwordLogin.useMutation({
    onSuccess: () => onAuthSuccess("登录成功"),
    onError: error => toast.error(error.message),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => onAuthSuccess("注册成功"),
    onError: error => toast.error(error.message),
  });

  const isSubmitting = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("请输入邮箱和密码");
      return;
    }

    if (mode === "register") {
      registerMutation.mutate({
        email: trimmedEmail,
        password,
        name: name.trim() || undefined,
      });
      return;
    }

    loginMutation.mutate({ email: trimmedEmail, password });
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <Card className="club-card w-full overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-display neon-pink">
            {mode === "login" ? (
              <LogIn className="h-6 w-6 text-primary" />
            ) : (
              <UserPlus className="h-6 w-6 text-primary" />
            )}
            账号登录
          </CardTitle>
          <CardDescription>
            先用邮箱密码做小范围验证。登录后稿件、灵感、排表等内容只对当前账号可见。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={value => setMode(value as Mode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">登录</TabsTrigger>
              <TabsTrigger value="register">注册</TabsTrigger>
            </TabsList>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <TabsContent value="register" className="mt-0 space-y-2">
                <Input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="昵称，可选"
                  autoComplete="name"
                  maxLength={80}
                />
              </TabsContent>
              <Input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="邮箱"
                autoComplete="email"
              />
              <Input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="密码，至少 6 位"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting
                  ? "处理中..."
                  : mode === "login"
                    ? "登录"
                    : "注册并登录"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
