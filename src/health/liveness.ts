import { Request, Response } from "express";

export function livenessHandler(req: Request, res: Response) {
  res.status(200).json({ status: "alive" });
}