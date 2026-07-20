import { Router } from "express";
import { register, login, refresh, logout, me } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticate, me);
