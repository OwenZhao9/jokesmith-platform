import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

type AccessPasswordDialogProps = {
  open: boolean;
  password: string;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
};

export default function AccessPasswordDialog({
  open,
  password,
  isSubmitting,
  onOpenChange,
  onPasswordChange,
  onSubmit,
}: AccessPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            需要访问密码
          </DialogTitle>
          <DialogDescription>
            为了防止公开 API 被刷，请先输入站点访问密码。登录状态会在本机保存 7 天。
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4 py-2"
          onSubmit={event => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="site-access-password">访问密码</Label>
            <Input
              id="site-access-password"
              type="password"
              autoComplete="current-password"
              placeholder="输入站点访问密码"
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !password.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                验证中...
              </>
            ) : (
              "继续使用"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
