import { auth } from "../../auth";
import env from "../config/env";
import { User } from "../types/user.types";
import AWS from "../utils/AWS";
import {
  getAdminById,
} from "../helpers/admin";
import { getBusinessById } from "../helpers/business";
import UserRepository from "../repository/UserRepository";
import UserResource from "../resource/user";
import { CREATED, OK } from "../utils/Response";

export async function getUsers(data: any) {
  const { admin_id, business_id } = data;
  await Promise.all([getAdminById(admin_id), getBusinessById(business_id)]);
  const users = await UserRepository.readAllUserWithBusiness(business_id);
  return OK(
    `Users fetched successfully`,
    users.map((user) => UserResource(user))
  );
}

export async function createUser(data: any) {
  const { business_id, name } = data;
  const create = await UserRepository.create({ business_id, name });
  return CREATED("User created successfully", create);
}


// export async function create(data: User) {
//   try {
//     const { name, email, password, image } = data;
//     const r = await auth.api.signUpEmail({
//         body: {
//             name,email,password,image,
//             // callbackURL: `${env.WEB_ORIGIN}/login`,
//         },
//     });
  
//     return CREATED('User registered successfully', r)
//   } catch(e) {
//     console.error(e)
//     return BAD_REQUEST(e.message)
//   }
// }
export async function imageUpload(base64: string) {
  const aws = new AWS();
  const r = await aws.uploadBase64(base64)
  return CREATED('Image upload to s3 success', r)
}