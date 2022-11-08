import {api_fetch} from "lib/utils";
import {CanFailNoPayload} from "lib/resthelpers";

export async function registerAccount(csrf: string, data: {account: string, password: string}): Promise<CanFailNoPayload> {
	return api_fetch<any>({
		url: `/api/account/register`,
		csrf: csrf,
		payload: data,
		method: 'POST'
	})
}

export async function loginAccount(csrf: string, data: {account: string, password: string}): Promise<CanFailNoPayload> {
	return api_fetch<any>({
		url: `/api/account/login`,
		csrf: csrf,
		payload: data,
		method: 'POST'
	})
}