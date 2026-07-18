import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Lock } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

type AuthRequiredCardProps = {
  title: string;
  description?: string;
  allowAdminLogin?: boolean;
};

export default function AuthRequiredCard({
  title,
  description = "登录后可以查看和管理你的个人内容。",
  allowAdminLogin = false,
}: AuthRequiredCardProps) {
  const [loginUrl] = useState(() =>
    typeof window === "undefined" ? "#" : getLoginUrl()
  );
  const [password, setPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const adminLogin = trpc.auth.adminLogin.useMutation({
    onSuccess: async () => {
      setAdminLoginError(null);
      await utils.auth.me.invalidate();
      window.location.reload();
    },
    onError: error => {
      setAdminLoginError(error.message);
    },
  });
  const canLogin = loginUrl !== "#";

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    adminLogin.mutate({ password });
  };

  return (
    <Card className="club-card">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Lock className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="font-medium">{title}</p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
        {canLogin && (
          <Button
            className="mt-4"
            onClick={() => (window.location.href = loginUrl)}
          >
            去登录 / 注册
          </Button>
        )}
        {allowAdminLogin && (
          <form
            className="mt-6 flex w-full max-w-sm flex-col gap-3"
            onSubmit={handleAdminLogin}
          >
            <Input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              placeholder="管理员密码"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant={canLogin ? "outline" : "default"}
              disabled={adminLogin.isPending || !password}
            >
              {adminLogin.isPending ? "登录中..." : "管理员密码登录"}
            </Button>
            {adminLoginError && (
              <p className="text-xs text-destructive">{adminLoginError}</p>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
