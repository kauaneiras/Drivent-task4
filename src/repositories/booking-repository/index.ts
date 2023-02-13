import { prisma } from "@/config";

async function listBookingRepository(userId: number) {
  return prisma.booking.findFirst({
    where: { userId: userId },
    include: { Room: true }
  });
}

async function listBookingByIdRepository(id: number) {
  return prisma.booking.findFirst({
    where: { id: id },
    include: { Room: true }
  });
}

async function insertingBookingRepository(userId: number, roomId: number) {
  return prisma.booking.create({
    data: {
      userId: userId,
      roomId: roomId
    }
  });
}

async function deleteBookingRepository(bookingId: number) {
  return prisma.booking.delete({
    where: { id: bookingId }
  });
}

async function findRoomRepository(roomId: number) {
  return prisma.room.findFirst({
    where: { id: roomId }
  });
}

async function listAllBookingsRepository(roomId: number) {
  return prisma.booking.findMany({
    where: { roomId: roomId }
  });
}

const bookingRepository = {
  listBookingRepository, listAllBookingsRepository, findRoomRepository, insertingBookingRepository, deleteBookingRepository, listBookingByIdRepository
};

export default bookingRepository;
