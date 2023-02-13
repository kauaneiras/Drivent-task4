import { Router } from "express";
import { authenticateToken } from "@/middlewares";
import { getBookingController, updateBookingController, postBookingController } from "@/controllers";

const bookingRouter = Router();

bookingRouter
  .all("/*", authenticateToken)
  .get("/", getBookingController)
  .post("/", postBookingController)
  .put("/:bookingId", updateBookingController);

export { bookingRouter };
