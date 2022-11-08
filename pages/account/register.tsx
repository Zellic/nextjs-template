import {decryptSession} from "security/auth";
import {Form, Input} from "lib/form";
import {useContext, useState} from "react";
import {Center, Stack} from "components/elf";
import styled from "styled-components";
import {z} from "zod";
import {registerAccount} from "api";
import {CSRFContext} from "security/clientside_session";
import {withCSRF} from "security/csrf";

export default function AccountRegister() {
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
							password: z.string().min(1),
							confirm: z.string().min(1),
							code: z.string().min(1)
						})}
						submit={async (data, form) => {
							if(data.password !== data.confirm) {
								form.setError("confirm", {
									type: "custom",
									message: "Passwords must match."
								})
								return
							}

							await registerAccount(csrf, data as any)
								.then(() => {
									setMessage("Registered!")
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
						<Input
							id="confirm"
							type="password"
							label="Confirm Password"
						/>
						<Input
							id="code"
							type="password"
							label="Registration code"
						/>
						<button type="submit">Register</button>
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

const Spacer = styled(Stack)`
	margin-top: var(--s5);
`

const Container = styled.div`
	position: relative;
	overflow: hidden;
	color: #000;
	max-width: 40ch;
	background: #edf2fc;
	border-radius: 0.5vmin;
	padding: var(--s1);
	width: 40ch;
`