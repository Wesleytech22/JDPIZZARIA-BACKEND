// Backend inicial da JD Pizzaria — Node/TypeScript.
// npm install && npm run dev
//
// Endpoints:
//   POST /orders                                  -> Terminal cria um pedido
//   GET  /orders/:id                              -> consulta um pedido
//   GET  /orders                                  -> lista pedidos
//   PATCH /orders/:id/status                      -> cozinha avança o status
//   POST /orders/:id/missing                      -> pizzaiolo avisa ingrediente faltando
//   POST /orders/:id/missing/:missingId/resolve   -> alguém confirma que já levou

import express, { Request, Response } from "express";
import cors from "cors";

type OrderItem = {
  productId: string;
  name: string;
  quantity: number;
  note: string;
  unitPrice: number;
};

type MissingIngredient = {
  id: string;
  description: string;
  requestedAtMs: number;
  resolvedAtMs: number | null;
};

type Order = {
  id: string;
  destination: "BALCAO" | "MESA" | "DELIVERY";
  tableCode: string | null;
  items: OrderItem[];
  total: number;
  status: "RECEBIDO" | "EM_PREPARO" | "PRONTO" | "SAIU_PARA_ENTREGA" | "ENTREGUE";
  trackingCode: string;
  createdAtMs: number;
  missingItems: MissingIngredient[];
};

const app = express();
app.use(cors());
app.use(express.json());
app.use((req: Request, _res: Response, next) => {
  console.log(`${new Date().toLocaleTimeString("pt-BR")} — ${req.method} ${req.path}`);
  next();
});

const orders = new Map<string, Order>();

app.post("/orders", (req: Request, res: Response) => {
  const { id, destination, tableCode, items, total } = req.body as Omit<Order, "status" | "trackingCode" | "createdAtMs" | "missingItems">;

  const order: Order = {
    id,
    destination,
    tableCode: tableCode ?? null,
    items,
    total,
    status: "RECEBIDO",
    trackingCode: id,
    createdAtMs: Date.now(),
    missingItems: [],
  };

  orders.set(order.id, order);
  res.status(201).json({ trackingCode: order.trackingCode, order });
});

app.get("/orders/:id", (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });
  res.json(order);
});

app.get("/orders", (_req: Request, res: Response) => {
  res.json(Array.from(orders.values()).sort((a, b) => b.createdAtMs - a.createdAtMs));
});

app.patch("/orders/:id/status", (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  const { status } = req.body as { status: Order["status"] };
  if (!status) return res.status(400).json({ error: "Campo 'status' obrigatório" });

  order.status = status;
  res.json(order);
});

app.post("/orders/:id/missing", (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  const { description } = req.body as { description: string };
  const missing: MissingIngredient = {
    id: `M-${Date.now()}`,
    description,
    requestedAtMs: Date.now(),
    resolvedAtMs: null,
  };
  order.missingItems.push(missing);
  res.status(201).json(order);
});

app.post("/orders/:id/missing/:missingId/resolve", (req: Request, res: Response) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado" });

  const missing = order.missingItems.find((m) => m.id === req.params.missingId);
  if (!missing) return res.status(404).json({ error: "Registro de faltando não encontrado" });

  missing.resolvedAtMs = Date.now();
  res.json(order);
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`JD Pizzaria backend rodando na porta ${PORT}`));