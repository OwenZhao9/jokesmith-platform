import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import { lazy, Suspense } from "react";
import Home from "./pages/Home";

// Pages
const Scripts = lazy(() => import("./pages/Scripts"));
const ScriptEditor = lazy(() => import("./pages/ScriptEditor"));
const Inspirations = lazy(() => import("./pages/Inspirations"));
const Brainstorm = lazy(() => import("./pages/Brainstorm"));
const Shows = lazy(() => import("./pages/Shows"));
const Transcription = lazy(() => import("./pages/Transcription"));
const Style = lazy(() => import("./pages/Style"));
const Admin = lazy(() => import("./pages/Admin"));
const Status = lazy(() => import("./pages/Status"));
const Login = lazy(() => import("./pages/Login"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
      正在加载页面...
    </div>
  );
}

function Router() {
  return (
    <DashboardLayout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/scripts" component={Scripts} />
          <Route path="/scripts/new" component={ScriptEditor} />
          <Route path="/scripts/:id" component={ScriptEditor} />
          <Route path="/inspirations" component={Inspirations} />
          <Route path="/brainstorm" component={Brainstorm} />
          <Route path="/shows" component={Shows} />
          <Route path="/transcription" component={Transcription} />
          <Route path="/style" component={Style} />
          <Route path="/admin" component={Admin} />
          <Route path="/status" component={Status} />
          <Route path="/login" component={Login} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
