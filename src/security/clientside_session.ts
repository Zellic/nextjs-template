import {parse as parseCookie} from "cookie";
import {cookie_prefix} from "security/cookie_util";
import {createContext, useEffect, useRef, useState} from "react";
import {SITE_KEY} from "info";

/**
 * This indicates to the clientside frontend code that a session cookie is present, even if it can't be read.
 *
 * Used to determine whether to show links to account settings, etc...
 *
 * May content UX related data in the future.
 */
export const SESSION_TEST_COOKIE_NAME = cookie_prefix(SITE_KEY + "_is_logged_in")

export function isSessionCookiePresent(): boolean {
	const cookies = parseCookie(document.cookie)
	const val = cookies[SESSION_TEST_COOKIE_NAME]
	// logout page sets max-age for this cookie to -1, but the browser won't have dropped it on the redirect
	// back to / yet
	return val !== undefined && val !== "deleted"
}

class CookieListener {
	private callbacks: Map<string, Array<(value: string) => void>> = new Map()
	private timeoutID: NodeJS.Timeout | null = null
	private old: Record<string, string> | null = null

	constructor() {
		this.check_wrapped()
	}

	addCallback(cookie: string, cb: (value: string) => void): () => void {
		let h = this.callbacks.get(cookie)

		if(h === undefined) {
			h = []
			this.callbacks.set(cookie, h)
		}

		h.push(cb)

		return () => {
			if(h.length === 0)
				this.callbacks.delete(cookie)
			else
				this.callbacks.set(cookie, this.callbacks.get(cookie).filter(it => it !== cb))
		}
	}

	private check() {
		const current = parseCookie(document.cookie)
		const keys = this.old !== null ? Object.keys(current).concat(Object.keys(this.old)) : Object.keys(current)

		for(const key of keys) {
			const v = current[key]
			if(this.old !== null && this.old[key] === v)
				continue

			const cb = this.callbacks.get(key)

			if(cb === undefined)
				continue

			cb.forEach(it => it(v))
		}

		this.old = current
	}

	private check_wrapped() {
		this.check()
		this.timeoutID = setTimeout(this.check_wrapped.bind(this), 100)
	}
}

const listener = global.document !== undefined ? new CookieListener() : null

export function useIsLoggedIn() {
	// this can run in the server context when hydrating pages
	const isServerSide = global.document === undefined
	const [state, setState] = useState(() => {return false})

	const callback = useRef()

	// serverside and clientside must match at first when hydrating
	// so we default to false, and set the value right away when mounting
	useEffect(() => {
		setState(!isServerSide && isSessionCookiePresent())
	}, [isServerSide])

	useEffect(() => {
		if(!isServerSide) {
			return listener.addCallback(SESSION_TEST_COOKIE_NAME, (value) => {
				setState(isSessionCookiePresent())
			})
		}
	})

	return state
}

export interface UserContextValue {
	username: string,
	admin: number,
}

export const UserSessionContext = createContext<UserContextValue | null>(null)
// Keep this here to try to avoid tree shaking failing and pulling csrf.ts into the client bundle...
export const CSRFContext = createContext<string | null>(null)