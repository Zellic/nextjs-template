import {deleteCookie} from "serverside/serverutils";
import {SESSION_COOKIE_NAME} from "security/session_defs";
import {SESSION_TEST_COOKIE_NAME} from "security/clientside_session";

export default function Logout() {
	return (
		<div>Logging out...</div>
	)
}

export async function getServerSideProps(context) {
	deleteCookie(context.res, SESSION_COOKIE_NAME)
	deleteCookie(context.res, SESSION_TEST_COOKIE_NAME)
	return {
		redirect: {
			permanent: false,
			destination: "/"
		}
	}
}