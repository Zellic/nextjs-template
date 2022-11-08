import {z, ZodEffects, ZodNumber} from "zod";
import {CanFailSingleItem} from "lib/resthelpers";

export function areMapsEqual<K,V>(map1: Map<K,V>, map2: Map<K,V>): boolean {
	if(map1.size != map2.size)
		return false

	for(const [key,value] of map1.entries()) {
		if(!map2.has(key))
			return false
		if(value !== map2.get(key))
			return false
	}

	for(const key of map2.keys()) {
		if(!map1.has(key))
			return false
	}

	return true
}

export enum HTTPVerbs {
	GET='GET',
	POST='POST',
	PATCH='PATCH',
	DELETE='DELETE'
}

export type HTTPVerbLiterals = keyof typeof HTTPVerbs
export type ValidHTTPVerbs = {[key in HTTPVerbLiterals]: boolean | undefined}

// TODO: use this...
export interface APIResponse {
	status: 'success' | 'failed',
}

export interface APIRequest {
	url: string,
	csrf?: string,
	query?: {[key: string]: string | number | boolean},
	payload?: object,
	method?: HTTPVerbLiterals
}

/**
 * This is a utility function that inside-outs a promise, allowing us to `reject(...)` if the API response
 * doesn't match what we expected rather than having to check for it in the `.then(...)` handler of the promise
 * at every usage site of API functions.
 *
 * `resolve` or `reject` MUST be called by the passed `check` function.
 */
function api_fetch_insideout<T>(
	config: APIRequest,
	check: (
		response: Response,
		resolve: (value: (T | PromiseLike<T>)) => void,
		reject: (reason?: any) => void

	) => void,
): Promise<T> {
	const {url, csrf, payload, method} = config
	const query: any = config.query !== undefined ? {...config.query} : {}
	if(config.csrf !== undefined)
		query.csrf = config.csrf
	const final_url = Object.entries(query).length === 0 ? url : url + "?" + new URLSearchParams(query)

	return new Promise<T>(async (resolve, reject) => {
		const response = await fetch(
			final_url,
			{
				method: method ?? (payload !== undefined ? "POST" : "GET"),
				body: payload !== undefined ? JSON.stringify(payload) : undefined
			}
		)

		if (response.status != 200) {
			reject({status: response.status, msg: await response.text()})
			return
		}

		check(response, resolve, reject)
	})
}

/**
 * No sanity checking on the response whatsoever if the status code is 200, simply expects a JSON payload.
 */
export function api_fetch_unchecked<T>(config: APIRequest): Promise<T> {
	return api_fetch_insideout(config, async (resp, resolve) => resolve(await resp.json()))
}

// TODO: generate typescript type guards with the compiler plugin
//   and strongly assert the reified T returned here matches the API's result
export function api_fetch_single<T>(config: APIRequest): Promise<T> {
	return ((api_fetch_insideout<CanFailSingleItem<T>>(config, async (response, resolve, reject) => {
		const result = await response.json()
		if(typeof(result.success) !== "boolean" || (result.success && typeof(result.item) === "undefined") || (result.success === false && typeof(result.msg) === "undefined")) {
			throw new Error(`api_fetch_single is likely incorrectly typed: got ${JSON.stringify(result)}`)
		}
		if(result.success !== false) {
			resolve(result.item)
		} else {
			// if status wasn't 200 we'd have rejected within [api_fetch_insideout] already
			reject({status: 200, msg: result.msg})
		}
	}) as unknown) as Promise<CanFailSingleItem<T>>).then(it => ((it as unknown) as T))
}

export function api_fetch<T>(config: APIRequest): Promise<T> {
	return ((api_fetch_insideout<T>(config, async (response, resolve, reject) => {
		const result = await response.json()
		if(typeof(result.success) !== "boolean" || (result.success === false && typeof(result.msg) === "undefined")) {
			throw new Error(`api_fetch is likely incorrectly typed: got ${JSON.stringify(result)}`)
		}
		if(result.success !== false) {
			resolve(result)
		} else {
			// if status wasn't 200 we'd have rejected within [api_fetch_insideout] already
			reject({status: 200, msg: result.msg})
		}
	}) as unknown) as Promise<CanFailSingleItem<T>>).then(it => ((it as unknown) as T))
}

/**
 * Convenience function to append props to a [getServerSideProps] higher order function wrapper.
 */
export function addToProps(ret: any, add: any): any {
	if(ret.props === undefined)
		return {...ret, props: add}

	let {props, ...obj} = ret
	return {...obj, props: {...props, ...add}}
}

/**
 * Takes an arbitrary JS object and converts it to base64(JSON.encode(x))
 *
 * Used for query strings.
 */
export function base64(obj: any): string {
	return Buffer.from(JSON.stringify(obj), 'binary').toString('base64')
}

/**
 * Get the highest value item from an array with an arbitrary lambda evaluator.
 */
export function maxOfArray<T>(array: Array<T>, check: (it: T) => number): T | null {
	let m: [number, T] | null = null

	for(const item of array) {
		const value = check(item)

		if(m === null || value > m[0]) {
			m = [value, item]
		}
	}

	if(m === null)
		return null

	return m[1]
}

export function timestamp(date: Date): number {
	return Math.floor(date.getTime() / 1000)
}

interface HasID {
	id: number,
}

/**
 * convenience function for React: create a new object with added items, and sort by ID
 */
export function updateItems<T extends HasID>(items: Array<T>, added: Array<T>): Array<T> {
	const map = items === null ? {} : Object.fromEntries(items.map(it => {return [it.id, it]}))
	for(const item of added) {
		map[item.id] = item
	}
	return Object.values(map).sort(it => it.id)
}

export function zodStringInt(type: ZodNumber): ZodEffects<ZodNumber, ZodNumber["_output"], unknown> {
	return z.preprocess(
		(input) => {
			const processed = z.string().regex(/^\d+$/).transform(Number).safeParse(input);
			return processed.success ? processed.data : input;
		},
		type,
	)
}