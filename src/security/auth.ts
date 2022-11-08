import {SessionCookie} from "serverside/serverside_session";
import {GetServerSideProps} from "next";
import {addToProps} from "lib/utils";
import {UserContextValue} from "security/clientside_session";
import {ParsedUrlQuery} from "querystring";
import {GetServerSidePropsContext, GetServerSidePropsResult, PreviewData} from "next/types";
import {AES_Decrypt} from "lib/aes";
import {withCSRF} from "security/csrf";
import {IncomingMessage} from "http";
import {NextApiRequestCookies} from "next/dist/server/api-utils";
import {SESSION_COOKIE_NAME} from "security/session_defs";
import {redis} from "redis";
import {USER_BASE_KEY} from "redis_keys";

export type GetServerSideLoggedInProps<
	P extends { [key: string]: any } = { [key: string]: any },
	Q extends ParsedUrlQuery = ParsedUrlQuery,
	D extends PreviewData = PreviewData
	> = (
	context: GetServerSidePropsContext<Q, D>,
	session: SessionCookieWithAPI & {addToProps: () => void}
) => Promise<GetServerSidePropsResult<P>>

export interface User {
	username: string,
	password: string,
	admin: number,
	created: string,
}

export interface SessionCookieWithAPI extends SessionCookie {
	getUser: () => Promise<{id: number, username: string} | null>;
	isValid: () => Promise<boolean>,
	// refreshSession: () => Promise<void>;
}

/**
 * Higher order function, wraps getServerSideProps
 */
export function userMustBeLoggedIn(getServerSideProps: GetServerSideLoggedInProps): GetServerSideProps {
	return withCSRF(async (context) => {
		const session = decryptSession(context.req)

		if(session === null) {
			// TODO: redirect back to this URI
			// TODO: clear invalid session cookie?
			return {
				redirect: {
					permanent: false,
					destination: "/account/login"
				}
			}
		}

		let check = {shouldAddToProps: false}
		let user = undefined
		const props = await getServerSideProps(context, {
			...session,
			addToProps: () => {check.shouldAddToProps=true},
		})

		if(check.shouldAddToProps) {
			// TODO: user_ctx = props  for getUser cache?
			let user_ctx: UserContextValue | null = {
				username: session.user.username,
				admin: session.user.admin,
			}
			return addToProps(props, {session_user: user_ctx})
		} else {
			return props
		}
	})
}

export function decryptSession(req: IncomingMessage & {cookies: NextApiRequestCookies}): SessionCookieWithAPI | null {
	const val = req.cookies[SESSION_COOKIE_NAME]

	if(val === undefined || val === "deleted")
		return null

	const data = AES_Decrypt(val, process.env.SESSION_CRYPTOKEY)

	let session: SessionCookie
	try {
		session = JSON.parse(data) as SessionCookie
	} catch {
		// unset invalid session cookie?
		return null
	}

	let user = undefined
	return {
		...session,
		getUser: async () => {
			if (user !== undefined)
				return user
			user = JSON.stringify(await redis.get(USER_BASE_KEY + session.user.username.toLowerCase()))
			return user
		},
		isValid: async () => {
			return await redis.exists(USER_BASE_KEY + session.user.username.toLowerCase()) > 0
		}
	}
}