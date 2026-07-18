import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, RotateCcw, ShieldCheck } from "lucide-react";
import {
  preInterviewFields,
  preInterviewSections,
  type PreInterviewAnswers,
} from "@shared/preInterview";

type PreInterviewFormProps = {
  answers: PreInterviewAnswers;
  onChange: (label: string, value: string) => void;
  onClear: () => void;
};

export default function PreInterviewForm({
  answers,
  onChange,
  onClear,
}: PreInterviewFormProps) {
  const filledCount = preInterviewFields.filter(
    item => answers[item.label]?.trim().length > 0
  ).length;
  const suggestedMaterialCount = 8;
  const progress = Math.min(
    100,
    Math.round((filledCount / suggestedMaterialCount) * 100)
  );

  return (
    <Card className="club-card overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-muted/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              脱口秀前采
            </CardTitle>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              不必全部填写。优先写清一个真实事件、当时的原话和你的真实反应，AI
              才能写出像你、而不是像模板的稿子。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">已填写 {filledCount} 项</Badge>
            {filledCount > 0 && (
              <Button variant="ghost" size="sm" onClick={onClear}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                清空
              </Button>
            )}
          </div>
        </div>
        <div className="space-y-2 pt-2">
          <Progress value={progress} className="h-1.5" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>建议至少提供 {suggestedMaterialCount} 项有效素材</span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              联系方式、授权和附件链接不会发送给 AI
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-0 sm:px-6">
        <Accordion
          type="multiple"
          defaultValue={["profile", "goals", "event-1"]}
          className="w-full"
        >
          {preInterviewSections.map(section => {
            const sectionFilledCount = section.fields.filter(
              item => answers[item.label]?.trim().length > 0
            ).length;

            return (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="min-w-0 space-y-1 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{section.title}</span>
                      {sectionFilledCount > 0 && (
                        <Badge variant="outline" className="font-normal">
                          {sectionFilledCount} 项素材
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-normal leading-5 text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-4 pt-1 md:grid-cols-2">
                    {section.fields.map((item, index) => {
                      const inputId = `pre-interview-${section.id}-${index}`;
                      const isPrivate = item.includeInPrompt === false;

                      return (
                        <div
                          key={item.label}
                          className={
                            item.multiline
                              ? "space-y-2 md:col-span-2"
                              : "space-y-2"
                          }
                        >
                          <Label
                            htmlFor={inputId}
                            className="flex flex-wrap items-center gap-2"
                          >
                            {item.label}
                            {isPrivate && (
                              <Badge
                                variant="outline"
                                className="border-emerald-200 bg-emerald-50 text-[10px] font-normal text-emerald-700"
                              >
                                不发送 AI
                              </Badge>
                            )}
                          </Label>
                          {item.multiline ? (
                            <Textarea
                              id={inputId}
                              value={answers[item.label] ?? ""}
                              onChange={event =>
                                onChange(item.label, event.target.value)
                              }
                              placeholder={item.placeholder}
                              maxLength={6000}
                              className="min-h-24 resize-y bg-input"
                            />
                          ) : (
                            <Input
                              id={inputId}
                              value={answers[item.label] ?? ""}
                              onChange={event =>
                                onChange(item.label, event.target.value)
                              }
                              placeholder={item.placeholder}
                              maxLength={6000}
                              className="bg-input"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
