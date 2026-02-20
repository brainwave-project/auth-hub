import { Request, Response } from "express";

export function readinessHandler(req: Request, res: Response) {
  res.status(200).json({ status: "ready" });
}