// import { user } from "../../auth-schema";

import { db } from "../db";
import { client } from "../db/schema";
import { CE_INTERNAL_SERVER } from "../utils/Error";
import BaseRepository from "./BaseRepository";

class ClientRepository extends BaseRepository {
  constructor() {
    super(client);
  }

  async readAllUserWithBusiness(business_id: string): Promise<any[]> {
    try {
      const findOne = await db.query.userBusiness.findMany({
        where: (u, { eq }) => eq(u.business_id, business_id),
        with: {
          user: true,
        },
      });
      return findOne;
    } catch (err) {
      throw new CE_INTERNAL_SERVER(err.message);
    }
  }
}

export default new ClientRepository();