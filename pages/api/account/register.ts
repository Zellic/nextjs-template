import {AlreadyReplied, RestAPI, RestFunctionReply, Zod} from "lib/rest";
import type {NextApiRequest, NextApiResponse} from "next";
import {CanFailNoPayload} from "lib/resthelpers";
import {z} from "zod";
import {USER_BASE_KEY} from "redis_keys";
import {redis} from "redis";
import {PASSWORD_SALT_LENGTH} from "misc_constants";
import {setSessionCookie} from "serverside/serverside_session";
import {checkCSRF} from "security/csrf";
import SHA256 from "crypto-js/sha256";
import CryptoJS from "crypto-js/core";
import {User} from "security/auth";

const reg = /^[a-zA-Z0-9-_]+$/

const query = z.object({
	account: z.string().regex(reg, "Invalid characters."),
	password: z.string(),
	code: z.string()
})

class AccountRegister extends RestAPI {
	@Zod(query)
	override async post(req: NextApiRequest, res: NextApiResponse, data: z.infer<typeof query>): Promise<RestFunctionReply<CanFailNoPayload>> {
		if (!checkCSRF(req, res))
			return AlreadyReplied

		if(data.code !== "ember ember")
			return {json: {success: false, msg: "Invalid employee code."}}

		const check = await redis.get(USER_BASE_KEY + data.account.toLowerCase())

		if(check !== null) {
			// TODO: prevent scraping
			return {json: {success: false, msg: "Account name is already in use."}}
		}

		// TODO: move password stuff to one place
		// TOOD: not sure why WordArray seems to generate twice the bytes it says it will..?
		// nBytes=32 creates...
		// sigbytes
		// 32
		// words
		// [
		// 	-980547656,
		// 	-1131097943,
		// 	-1836290909,
		// 	-2011399897,
		// 	-786965617,
		// 	-371644161,
		// 	-1045928265,
		// 	737375035
		// ]
		const salt = CryptoJS.lib.WordArray.random(PASSWORD_SALT_LENGTH / 2)

		const user: User = {
			username: data.account,
			password: salt + SHA256(salt + data.password).toString(),
			admin: 0,
			created: new Date().toISOString(),
		}

		await redis.set(USER_BASE_KEY + data.account.toLowerCase(), JSON.stringify(user))
		setSessionCookie(res, user as any)

		return {json: {success: true}}
	}
}

export default new AccountRegister().getHandler();