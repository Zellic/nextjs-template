import {AlreadyReplied, RestAPI, RestFunctionReply, Zod} from "lib/rest";
import type {NextApiRequest, NextApiResponse} from "next";
import {CanFailNoPayload} from "lib/resthelpers";
import {z} from "zod";
import {USER_BASE_KEY} from "redis_keys";
import {redis} from "redis";
import {PASSWORD_SALT_LENGTH} from "misc_constants";
import SHA256 from "crypto-js/sha256";
import {setSessionCookie} from "serverside/serverside_session";
import {checkCSRF} from "security/csrf";

const query = z.object({
	account: z.string(),
	password: z.string()
})

class AccountLogin extends RestAPI {
	@Zod(query)
	override async post(req: NextApiRequest, res: NextApiResponse, data: z.infer<typeof query>): Promise<RestFunctionReply<CanFailNoPayload>> {
		if (!checkCSRF(req, res))
			return AlreadyReplied

		const userblob = await redis.get(USER_BASE_KEY + data.account.toLowerCase())

		if(userblob === null) {
			// TODO: prevent scraping
			return {json: {success: false, msg: "Invalid or unknown account."}}
		}

		const user = JSON.parse(userblob)

		const salt = user.password.substring(0, PASSWORD_SALT_LENGTH)
		const calc = salt + SHA256(salt + data.password).toString()

		if(calc !== user.password) {
			return {json: {success: false, msg: "Invalid or unknown account."}}
		}

		// TODO: verify with zod
		setSessionCookie(res, user as any)

		return {json: {success: true}}
	}
}

export default new AccountLogin().getHandler();