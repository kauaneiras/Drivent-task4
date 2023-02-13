import app, { init } from "@/app";
import httpStatus from "http-status";
import supertest from "supertest";
import faker from "@faker-js/faker";
import * as jwt from "jsonwebtoken";
import { TicketStatus } from "@prisma/client";
import {
  createUser,
  createEnrollmentWithAddress,
  createTicketTypeWithHotel,
  createTicket,
  createHotel,
  createRoomWithHotelId,
  createBookingWithRoomId,
  createTicketTypeRemote,
  createTicketTypeWithoutHotel
} from "../factories";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => { await init(); });
beforeEach(async () => { await cleanDb(); });
const server = supertest(app);

describe("/GET booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.get("/booking");
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 404 if user has no booking", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
    it("should respond with status 200 and booking body if user has booking", async () => {
      const user = await createUser();
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      const token = await generateValidToken(user);
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user.id);
      const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({
        Room: {
          capacity: createdRoom.capacity,
          createdAt: createdRoom.createdAt.toISOString(),
          hotelId: createdRoom.hotelId,
          id: createdRoom.id,
          name: createdRoom.name,
          updatedAt: createdRoom.updatedAt.toISOString(),
        },
        id: createdBooking.id
      });
    });
  });
});

describe("/POST booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.post("/booking");
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });

  describe("when token is valid", () => {
    it("should respond with status 200 and booking id if room has space and ticket is valid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
    it("should respond with status 403 if has no roomId", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`);
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if roomId is boolean", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: true });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if roomId is string", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: "asd" });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if no enrollment", async () => {
      const user = await createUser();
      const createdHotel = await createHotel();
      const token = await generateValidToken(user);
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if no ticket", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      await createEnrollmentWithAddress(user);
      await createTicketTypeWithHotel();
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if ticket is not paid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.RESERVED);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if ticket is remote", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeRemote();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if ticket has no hotel included", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithoutHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if cannot find room with random id", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      await createHotel();
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: faker.datatype.number() });
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
    it("should respond with status 403 if room has no spaces left", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      await createBookingWithRoomId(createdRoom.id, user.id);
      await createBookingWithRoomId(createdRoom.id, user.id);
      await createBookingWithRoomId(createdRoom.id, user.id);
      const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
  });
});

describe("/PUT booking", () => {
  it("should respond with status 401 if no token is given", async () => {
    const response = await server.put("/booking/1");
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  it("should respond with status 401 if given token is not valid", async () => {
    const token = faker.lorem.word();
    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  it("should respond with status 401 if there is no session for given token", async () => {
    const userWithoutSession = await createUser();
    const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
    const response = await server.put("/booking/1").set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(httpStatus.UNAUTHORIZED);
  });
  describe("when token is valid", () => {
    it("should respond with status 200 if changed room with success", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user.id);
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom2.id });
      expect(response.status).toBe(httpStatus.OK);
      expect(response.body).toEqual({ bookingId: expect.any(Number) });
    });
    it("should respond with status 404 if no room is found", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user.id);
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: faker.datatype.number() });
      expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
    it("should respond with status 403 if room is full", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user.id);
      await createBookingWithRoomId(createdRoom2.id, user.id);
      await createBookingWithRoomId(createdRoom2.id, user.id);
      await createBookingWithRoomId(createdRoom2.id, user.id);
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom2.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if booking id given is not valid", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const response = await server.put(`/booking/${faker.datatype.number()}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom2.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if booking id given is not from the user", async () => {
      const user = await createUser();
      const user2 = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user2.id);
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom2.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if room id is not in a valid format", async () => {
      const user = await createUser();
      const user2 = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom = await createRoomWithHotelId(createdHotel.id);
      const createdBooking = await createBookingWithRoomId(createdRoom.id, user2.id);
      const response = await server.put(`/booking/${createdBooking.id}`).set("Authorization", `Bearer ${token}`).send({ roomId: "asd" });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
    it("should respond with status 403 if booking id is not in a valid format", async () => {
      const user = await createUser();
      const token = await generateValidToken(user);
      const enrollment = await createEnrollmentWithAddress(user);
      const ticketType = await createTicketTypeWithHotel();
      await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
      const createdHotel = await createHotel();
      const createdRoom2 = await createRoomWithHotelId(createdHotel.id);
      const response = await server.put("/booking/asd").set("Authorization", `Bearer ${token}`).send({ roomId: createdRoom2.id });
      expect(response.status).toBe(httpStatus.FORBIDDEN);
    });
  });
});
