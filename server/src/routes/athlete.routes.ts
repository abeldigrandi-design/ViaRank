import { Router } from "express";
import { getAthlete } from "../controllers/athlete.controller";

const router = Router();

router.get("/athlete", getAthlete);

export default router;
