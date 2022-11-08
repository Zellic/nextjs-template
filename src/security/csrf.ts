import {inDevEnvironment} from "lib/environment";
import {GetServerSideProps, NextApiRequest, NextApiResponse} from "next";
import {CookieSerializeOptions, parse as parseCookie, serialize as serializeCookie} from "cookie";
import {addToProps} from "lib/utils";
import {randomUUID} from "crypto";
import {cookie_prefix} from "security/cookie_util";
import {addCookieToResponse, deleteCookie} from "serverside/serverutils";
import {ServerResponse} from "http";
import {SITE_KEY} from "info";

export const CSRF_COOKIE_NAME = cookie_prefix(SITE_KEY + "_csrf")
const CSRF_COOKIE_CONFIG: CookieSerializeOptions = { path: "/", sameSite: "strict", secure: !inDevEnvironment }

/**
 * Uses a per-browser session CSRF token, which is stored as a session cookie and passed as a page
 * prop for the double-submit pattern.
 *
 * WARNING: This is exploitable if your CORS policy is looser than default. If the victim hasn't yet visited the
 * site, an attacker can grab visit /data/somepage.json, which will set the CSRF token and RETURN IT as a prop
 * to be used by API calls on the page.
 */
export function withCSRF(getServerSideProps: GetServerSideProps): GetServerSideProps {
	return async (context) => {
		let csrf = undefined
		if(context.req.headers.cookie !== undefined) {
			const cookies = parseCookie(context.req.headers.cookie)
			csrf = cookies[CSRF_COOKIE_NAME]
		}

		if(csrf === undefined) {
			csrf = randomUUID()
			addCookieToResponse(context.res, serializeCookie(
				CSRF_COOKIE_NAME, csrf, CSRF_COOKIE_CONFIG
			))
		}

		return addToProps(await getServerSideProps(context), {csrf: csrf});
	}
}

export function clearCSRF(res: ServerResponse) {
	deleteCookie(res, CSRF_COOKIE_NAME)
}

export function checkCSRF(req: NextApiRequest, res?: NextApiResponse | null): boolean {
	const csrf_query = req.query.csrf
	if(csrf_query === undefined)
		return false

	const ret = csrf_query === req.cookies[CSRF_COOKIE_NAME]
	if(ret === false && res !== undefined && res !== null)
		res.status(403).json({status: "failed", message: "The CSRF token was missing or invalid."})

	return ret
}