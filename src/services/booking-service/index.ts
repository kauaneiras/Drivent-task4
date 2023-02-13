import bookingRepository from "@/repositories/booking-repository";
import ticketRepository from "@/repositories/ticket-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import { notFoundError, maxCapacityReached, requestError } from "@/errors";

async function getBookingIdService(userId: number) {
  const booking = await bookingRepository.listBookingRepository(userId);
  if (!booking) throw notFoundError();
  return booking;
}

async function insertBookingService(userId: number, roomId: number) {
  const room = await bookingRepository.findRoomRepository(roomId);
  const bookingsQtd = await bookingRepository.listAllBookingsRepository(roomId);
  const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);    
    
  if (!room) throw notFoundError();
  if (!enrollment) throw requestError(403, "Cannot find user enrrolment");
    
  const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

  if (!ticket) throw requestError(403, "Cannot find user ticket");
  if (ticket.status !== "PAID") throw requestError(403, "ticket payment not finished");
  if (ticket.TicketType.isRemote === true) throw requestError(403, "this ticket is remote");
  if (ticket.TicketType.includesHotel === false) throw requestError(403, "this ticket does not include hotel");
  if (bookingsQtd.length > room.capacity || bookingsQtd.length === room.capacity) throw maxCapacityReached();
    
  const insertedBooking = await bookingRepository.insertingBookingRepository(userId, roomId);
  return insertedBooking;
}

async function updatingBookingService(userId: number, oldBookingId: number, newRoomId: number) {
  const bookingsQtd = await bookingRepository.listAllBookingsRepository(newRoomId);
  const room = await bookingRepository.findRoomRepository(newRoomId);
  const oldBooking = await bookingRepository.listBookingByIdRepository(oldBookingId);

  if (!room) throw notFoundError();
  if (bookingsQtd.length === room.capacity || bookingsQtd.length > room.capacity) throw maxCapacityReached();
  if (oldBooking.userId !== userId) throw requestError(403, "Is not the user booking Id");
  if (!oldBooking) throw requestError(403, "Cannot find booking");
    
  await bookingRepository.deleteBookingRepository(oldBookingId);
  const insertedBooking = await bookingRepository.insertingBookingRepository(userId, newRoomId);
  return insertedBooking;
}

const bookingService = { getBookingIdService, insertBookingService, updatingBookingService };

export default bookingService;
