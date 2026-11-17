import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { RegisterSchema } from "./schemas";
import type { DbUser } from "./types";
import type { queryOne, execute, mapUser } from "./db";
import type { createSession, hashPassword } from "./auth";

type Dependencies = {
  queryOne: typeof queryOne;
  execute: typeof execute;
  mapUser: typeof mapUser;
  createSession: typeof createSession;
  hashPassword: typeof hashPassword;
};

export function createRegistrationHandler({ queryOne, execute, mapUser, createSession, hashPassword }: Dependencies) {
  return async (req: Request, res: Response) => {

    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "请求数据格式不正确" });
    const body = parsed.data;

    const existing = await queryOne<DbUser>("SELECT * FROM users WHERE email = $1", [
      body.email.toLowerCase(),
    ]);
    if (existing) {
      return res.status(409).json({ error: "这个邮箱已经注册" });
    }

    const userId = randomUUID();
    // Public registration never grants administrative privileges.
    const role = "student";

    await execute(
      `
        INSERT INTO users (id, email, name, password_hash, role)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [userId, body.email.toLowerCase(), body.name, hashPassword(body.password), role],
    );

    await createSession(res, userId);
    const user = await queryOne<DbUser>("SELECT * FROM users WHERE id = $1", [userId]);
    return res.status(201).json({ user: mapUser(user!) });
  };
}
