import { getAdminById } from "../helpers/admin";
import CartRepository from "../repository/CartRepository";
import { OK } from "../utils/Response";

export async function getCarts(admin_id: string, business_id: string) {
  await getAdminById(admin_id)
  const carts = await CartRepository.readCartByBusiness(business_id);
  return OK(`Carts fetched successfully`, carts);
}