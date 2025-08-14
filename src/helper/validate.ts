import AdminRepository from "../repository/AdminRepository";
import { CE_BAD_REQUEST } from "../utils/Error"

export const getUserByEmail = async (email: string) => {
  const r = await AdminRepository.readOneByEmail(email);
  if(!r) throw new CE_BAD_REQUEST("Email doesn't exist");
  return r;
}

export const validateUserByEmail = async (email: string) => {
  const r = await AdminRepository.readOneByEmail(email);
  if (r) throw new CE_BAD_REQUEST("Email already exist");
  return true;
}