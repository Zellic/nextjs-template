import {FieldValues, useFormState, UseFormStateReturn} from "react-hook-form";
import {ModalCallback, ModalProps, modals} from "lib/modal";
import {ReactElement} from "react";
import {Form, FormProps} from "lib/form";

const FormContentFragment = (props: {contents: (formstate: UseFormStateReturn<FieldValues>, props: ModalProps<any>) => ReactElement, modal: ModalProps<any>}) => {
	const formstate = useFormState();
	return props.contents(formstate, props.modal)
}

/**
 * Helper function to create a modal that just contains a form and a next/submit+cancel button.
 *
 * Returns a wrapper with a
 */
export function formModal<FORM_DATA, RETURN>(props: Omit<FormProps, 'submit' | 'children'> & {contents: (formstate: UseFormStateReturn<FieldValues>, props: ModalProps<RETURN>) => ReactElement}) {
	const modal = modals.create<typeof props & {submit: FormProps['submit']}, RETURN>((props) => {
		return (
			<Form {...props}>
				<FormContentFragment contents={props.contents} modal={{modal: props.modal}} />
			</Form>
		)
	})
	return {
		show: function(submit: (data: FORM_DATA) => Promise<RETURN>): Promise<RETURN> {
			let [cb, promise] = ModalCallback.create<RETURN>()
			const wrap_submit = async (data: FORM_DATA) => {
				const ret = await submit(data)
				cb.resolve(ret)
			}
			return modal._showInsideOut({...props, submit: wrap_submit} as any, cb, promise)
		}
	}
}