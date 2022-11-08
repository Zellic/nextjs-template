import {NextApiRequest, NextApiResponse} from "next";
import {ZodError, ZodObject} from "zod";
import {generateErrorMessage} from 'zod-error';

export interface RestResponseBase {
	status?: number
}

// TODO: Rewrite these as a shorthand to {success: status === 200, msg: text}
export interface TextResponse extends RestResponseBase {
	text: string
}

export interface JSONResponse<T> extends RestResponseBase {
	json: T
}

export const StandardResponses = {
	BadVerb: {status: 400, text: "This verb is not supported for this resource."},
	NotLoggedIn: {status: 401, text: "You must be authenticated to access this resource."},
	NoAccess: {status: 403, text: "You do not have access to this resource."},
	WrongOwner: {status: 403, text: "Item does not belong to your organization."},
	InternalError: {status: 500, text: "Internal server error. Please contact a developer for assistance."},
	BadResourceIdentifier: {status: 400, text: "The resource ID was not properly formed."},
	BadCSRF: {status: 401, text: "The CSRF token was missing or invalid."}
}

export const AlreadyReplied: unique symbol = Symbol();
export type RestFunctionReply<T> = JSONResponse<T> | TextResponse | typeof AlreadyReplied
export type RestFunction<T> = (req: NextApiRequest, res: NextApiResponse, data: any) => Promise<RestFunctionReply<T>>

const isJSON = (b: RestResponseBase): b is JSONResponse<any> => {
	return (b as any).json !== undefined
}

export function writeRestResponse(res: NextApiResponse, resp: TextResponse | JSONResponse<any>): typeof AlreadyReplied {
	if (resp !== undefined && resp !== null) {
		if (isJSON(resp))
			res.status(resp.status ?? 200).send(JSON.stringify(resp.json))
		else
			res.status(resp.status ?? 200).send(resp.text ?? "No message was provided...")
	} else {
		res.status(400).send("Failed request.")
	}
	return AlreadyReplied
}

export class RestAPI {
	// if a verb function returns null it means that method isn't supported
	// any invalid calls should instead return a RestResponse with a bad status code and error message
	/**
	 * Return values:
	 *
	 * RestResponse -> returned normally
	 * AlreadyReplied -> function has used [NextApiResponse] parameter to set the reply value manually
	 * null -> this verb is unsupported for this route, and should never be called (send StandardResponses.BadVerb)
	 */
	public verbs: {
		// retrieve
		get: RestFunction<any>,
		// create
		post: RestFunction<any>,
		// create or replace if exists
		put: RestFunction<any>,
		// update
		patch: RestFunction<any>,
		// delete
		delete: RestFunction<any>,
	}
	constructor() {
		this.verbs = {
			get: this.get,
			post: this.post,
			put: this.put,
			patch: this.patch,
			delete: this.delete,
		}
	}

	/**
	 * retrieve an existing record
	 */
	async get(req: NextApiRequest, res: NextApiResponse, data: any): Promise<RestFunctionReply<any>> {return StandardResponses.BadVerb}

	/**
	 * create a new record
	 */
	async post(req: NextApiRequest, res: NextApiResponse, data: any): Promise<RestFunctionReply<any>> {return StandardResponses.BadVerb}

	/**
	 * create a new record, or replace it if it already exists
	 */
	async put(req: NextApiRequest, res: NextApiResponse, data: any): Promise<RestFunctionReply<any>> {return StandardResponses.BadVerb}

	/**
	 * update an existing record
	 */
	async patch(req: NextApiRequest, res: NextApiResponse, data: any): Promise<RestFunctionReply<any>> {return StandardResponses.BadVerb}

	/**
	 * delete a record
	 */
	async delete(req: NextApiRequest, res: NextApiResponse, data: any): Promise<RestFunctionReply<any>> {return StandardResponses.BadVerb}

	getHandler(): (req: NextApiRequest, res: NextApiResponse) => void {
		return this.handler.bind(this)
	}

	async handler(req: NextApiRequest, res: NextApiResponse) {
		const f = this.verbs[req.method.toLowerCase()]

		if(f === undefined)
			return writeRestResponse(res, StandardResponses.BadVerb)

		let ret: RestFunctionReply<any> = undefined
		try {
			ret = await f(req, res)
		} catch(ex) {
			// TODO: Log this to sentry/whatever
			console.log(`Failed API route: ${req.url}`)
			console.log(req.body)
			console.log(ex)
			return writeRestResponse(res, StandardResponses.InternalError)
		}

		if(ret === AlreadyReplied)
				return

		return writeRestResponse(res, ret)
	}
}

function zod_check<T>(zod_object: ZodObject<any,any,any,T>, d: any, onSuccess: (payload: T) => any): RestFunctionReply<any> {
	let payload = undefined
	try {
		payload = zod_object.parse(d)
	} catch(ex) {
		if(ex instanceof ZodError) {
			return {status: 400, text: generateErrorMessage(ex.issues, {maxErrors: 1})}
		}
		// TODO: log to sentry/whatever
		console.log(ex);
		return StandardResponses.InternalError
	}
	return onSuccess(payload)
}

export function Zod<T>(zod_object: ZodObject<any,any,any,T>) {
	return (target, name, descriptor: TypedPropertyDescriptor<RestFunction<any>>) => {
		const func = descriptor.value
		descriptor.value = async function(req: NextApiRequest, res: NextApiResponse, data: undefined | object): Promise<RestFunctionReply<any>> {
			// NextJS parses JSON "for" us (unwanted), but whatever
			// if the request is malformed they return status code 400 with body "Invalid JSON"
			let body = req.body
			if(typeof(body) !== "object") {
				try {
					body = JSON.parse(req.body)
				} catch (ex) {
					return {status: 400, text: "The request payload was not valid JSON."}
				}
			}

			return zod_check(zod_object, body, (payload) => func(req, res, {...data, ...payload}))
		}
		return descriptor
	}
}

function objMap(obj, func) {
	return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, func(v)]));
}

export function QueryString<T>(zod_object: ZodObject<any,any,any,T>) {
	return (target, name, descriptor: TypedPropertyDescriptor<RestFunction<any>>) => {
		const func = descriptor.value
		descriptor.value = async function(req: NextApiRequest, res: NextApiResponse, data: undefined | object): Promise<RestFunctionReply<any>> {
			const query = objMap(req.query, (it) => {
				const i = parseInt(it)
				if(!isNaN(i))
					return i
				const lower = it.toLowerCase()
				if(lower === "true")
					return true
				if(lower === "false")
					return false
				return it
			})

			// return zod_check(zod_object, {...(data ?? {}), ...query}, (payload) => func(req, res, payload))
			return zod_check(zod_object, query, (payload) => func(req, res, {...data, ...payload}))
		}
		return descriptor
	}
}

export class IDError extends Error {
	constructor(public desc) {
		super(desc);
	}
}

export function Id<T, D>(convert: ([param_name]: string) => T) {
	return (target, name, descriptor: TypedPropertyDescriptor<RestFunction<any>>) => {
		const func = descriptor.value
		descriptor.value = async function(req: NextApiRequest, res: NextApiResponse, data: undefined | object): Promise<RestFunctionReply<any>> {
			let id = undefined
			try {
				id = convert(req.query.id as any)
			} catch(ex) {
				if(ex instanceof IDError)
					return {status: 400, text: ex.desc}
				return StandardResponses.BadResourceIdentifier
			}
			return func(req, res, {...(data ?? {}), id: id})
		}
		return descriptor
	}
}

export function NumericID<T,D>() {
	return Id((it) => {
		const i = parseInt(it)
		if(isNaN(i))
			throw new IDError("Resource ID must be numeric.")
		return i
	})
}