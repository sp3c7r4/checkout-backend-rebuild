import { validateUserByEmail } from "../helper/validate";
import { OK } from "../utils/Response";

export async function Email(email: string) {
  await validateUserByEmail(email)
  return OK(`Email doesn't exist`, {})
}