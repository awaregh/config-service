import { Response } from "express";
import { ReloadEvent } from "../types";

const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
  res.on("close", () => clients.delete(res));
}

export function broadcast(event: ReloadEvent): void {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    res.write(data);
  }
}

export function clientCount(): number {
  return clients.size;
}
