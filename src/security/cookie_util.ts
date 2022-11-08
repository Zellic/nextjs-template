import {inDevEnvironment} from "lib/environment";

export function cookie_prefix(name: string) {
	return inDevEnvironment ? name : "__Host-" + name
}