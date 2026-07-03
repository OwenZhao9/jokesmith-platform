import { trpc } from "@/lib/trpc";
import { buildApiUrl } from "@/lib/api";
import { UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient();

const isUnauthorizedError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;

  const trpcError = error as {
    data?: { code?: unknown };
    message?: unknown;
  };
  const message =
    typeof trpcError.message === "string" ? trpcError.message : "";

  return (
    trpcError.data?.code === "UNAUTHORIZED" ||
    message === UNAUTHED_ERR_MSG ||
    message.includes(UNAUTHED_ERR_MSG)
  );
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!isUnauthorizedError(error)) return false;
  if (typeof window === "undefined") return false;

  const loginUrl = getLoginUrl();
  if (!loginUrl || loginUrl === "#") return true;

  window.location.href = loginUrl;
  return true;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    if (redirectToLoginIfUnauthorized(error)) return;
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    if (redirectToLoginIfUnauthorized(error)) return;
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: buildApiUrl("/api/trpc"),
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
