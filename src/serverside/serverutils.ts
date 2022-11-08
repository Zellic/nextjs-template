import {ServerResponse} from "http";
import {CookieSerializeOptions, serialize as serializeCookie} from "cookie";
import {inDevEnvironment} from "lib/environment";

/**
 * Non-destructively adds a cookie to the server response.
 *
 * Note: This WILL NOT overwrite another cookie with the same name, it will be duplicated.
 */
export function addCookieToResponse(res: ServerResponse, cookie: string) {
	let cookies = res.getHeader("Set-Cookie")
	if(typeof(cookies) === 'string') {
		cookies = [cookies]
	} else if(!Array.isArray(cookies)) {
		cookies = []
	}
	cookies.push(cookie)
	res.setHeader("Set-Cookie", cookies)
}

const deleted: CookieSerializeOptions = { path: "/", httpOnly: true, sameSite: "strict", maxAge: -1, secure: !inDevEnvironment }

export function deleteCookie(res: ServerResponse, cookie: string) {
	addCookieToResponse(res, serializeCookie(
		cookie, "deleted", deleted
	))
}