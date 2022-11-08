import {decryptSession} from "security/auth";
import {Form, Input} from "lib/form";
import {useContext, useState} from "react";
import {Center} from "components/elf";
import {z} from "zod";
import {loginAccount} from "api";
import {CSRFContext} from "security/clientside_session";
import {withCSRF} from "security/csrf";

export default function AccountLogin() {
	const csrf = useContext(CSRFContext)
	const [message, setMessage] = useState<String | null>(null)

	return (
		<Center>
			{message !== null ?
				<div>{message}</div>
				:
				(
					<Form
						schema={z.object({
							account: z.string().min(1),
							password: z.string().min(1)
						})}
						submit={async (data, form) => {
							await loginAccount(csrf, data as any)
								.then(() => {
									setMessage("Logged in!")
									window.location.replace("/")
								})
								.catch(it => {
									setMessage(it.msg)
								})
						}}
					>
						<Input
							id="account"
							label="Account"
						/>
						<Input
							id="password"
							type="password"
							label="Password"
						/>
						<button type="submit">Login</button>
					</Form>
				)
			}
		</Center>
	)
}

export const getServerSideProps = withCSRF(async ({req, params}) => {
	const session = decryptSession(req)

	if(session !== null && await session.isValid()) {
		return {
			redirect: {
				permanent: false,
				destination: "/"
			}
		}
	}

	return {props: {}}
})