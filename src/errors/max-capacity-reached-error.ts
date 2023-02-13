import { ApplicationError } from "@/protocols";

export function maxCapacityReached(): ApplicationError {
  return {
    name: "maxCapacityReachedError",
    message: "This room is full",
  };
}
