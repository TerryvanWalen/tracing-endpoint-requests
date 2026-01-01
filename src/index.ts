import express from "express";
import type { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

// Lets simplify our life a bit
declare module "express" {
  interface Request {
    traceId?: string;
  }
}

type RawRequest = {
  url: string;
  method: string;
  body: unknown;
};

type RawResponse = {
  status: number;
  body: unknown;
};

type TraceEvent = {
  timestamp: number;
  request: RawRequest;
  response: RawResponse;
};

type TraceContext = {
  traceId: string;
  events: TraceEvent[];
};

const als = new AsyncLocalStorage<TraceContext>();
const traceStore = new Map<string, TraceContext>();

async function mockExternalPost(body: unknown): Promise<RawResponse> {
  return {
    status: 200,
    body: { message: "world", received: body }
  };
}

async function doRequest(
  url: string,
  method: string,
  body: unknown
): Promise<RawResponse> {
  const ctx = als.getStore();
  if (!ctx) throw new Error("No ALS context available");

  const rawRequest: RawRequest = { url, method, body };
  const response = await mockExternalPost(body);

  ctx.events.push({
    timestamp: Date.now(),
    request: rawRequest,
    response
  });

  return response;
}

async function fetchServiceA() {
  return doRequest("https://mock.api/hello", "POST", { message: "hello" });
}

const app = express();

// Middleware automatically attaching ALS + traceId
app.use("/service", (req: Request, res: Response, next: NextFunction) => {
  const traceId = randomUUID();

  const context: TraceContext = {
    traceId,
    events: []
  };

  als.run(context, () => {
    (req).traceId = traceId;
    res.on("finish", () => {
      traceStore.set(traceId, context);
    });
    next();
  });
});

app.get("/service/a", async (req: Request, res: Response) => {
  await fetchServiceA();
  const traceId = (req).traceId
  res.json({
    traceId,
    debugUrl: `/debug/${traceId}`
  });
});

app.get("/debug/:traceId", (req: Request, res: Response) => {
  const trace = traceStore.get(req.params.traceId);
  if (!trace) {
    return res.status(404).json({ error: "Trace not found" });
  }
  res.json(trace);
});

app.listen(3000, () => {
  console.log("Running on http://localhost:3000/service/a");
});