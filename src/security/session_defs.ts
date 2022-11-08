import {cookie_prefix} from "security/cookie_util";
import {SITE_KEY} from "info";

export const SESSION_COOKIE_NAME = cookie_prefix(SITE_KEY + "_session")
