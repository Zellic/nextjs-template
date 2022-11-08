import {CookieSerializeOptions, serialize as serializeCookie} from "cookie";
import {IncomingMessage, ServerResponse} from "http";
import {AES_Encrypt} from "lib/aes";
import {SESSION_TEST_COOKIE_NAME} from "security/clientside_session";
import {NextApiRequestCookies} from "next/dist/server/api-utils";
import {SESSION_COOKIE_NAME} from "security/session_defs";
import {inDevEnvironment} from "lib/environment";
import {addCookieToResponse} from "serverside/serverutils";
import {User} from "security/auth";

const SESSION_COOKIE_CONFIG: CookieSerializeOptions = { path: "/", httpOnly: true, sameSite: "strict", maxAge: 3600*24*60, secure: !inDevEnvironment }
const SESSION_TEST_COOKIE_CONFIG: CookieSerializeOptions = { path: "/", sameSite: "strict", maxAge: 3600*24*60, secure: !inDevEnvironment }

export interface SessionCookie {
	user: {
		username: string,
		admin: number,
	}
}

export function setSessionCookie(res: ServerResponse, user: User): SessionCookie {
	const cookie: SessionCookie = {
		user: {
			username: user.username,
			admin: user.admin,
		}
	}

	const data = AES_Encrypt(JSON.stringify(cookie), process.env.SESSION_CRYPTOKEY)
	addCookieToResponse(res, serializeCookie(
		SESSION_COOKIE_NAME, data, SESSION_COOKIE_CONFIG
	))
	addCookieToResponse(res, serializeCookie(
		SESSION_TEST_COOKIE_NAME, "{}", SESSION_TEST_COOKIE_CONFIG
	))
	return cookie
}

export function hasLoginSessionCookie(req: IncomingMessage & {cookies: NextApiRequestCookies}): boolean {
	const val = req.cookies[SESSION_COOKIE_NAME]

	return val !== undefined && val !== "deleted"
}