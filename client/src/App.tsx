import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

// Pages
import Home from "./pages/Home";
import Scripts from "./pages/Scripts";
import ScriptEditor from "./pages/ScriptEditor";
import Inspirations from "./pages/Inspirations";
import Brainstorm from "./pages/Brainstorm";
import Shows from "./pages/Shows";
import Transcription from "./pages/Transcription";
import Style from "./pages/Style";

function Router() {
  return (
    <DashboardLayout>
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
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
