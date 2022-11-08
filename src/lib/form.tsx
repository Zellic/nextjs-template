import {ComponentType, createContext, DetailedHTMLProps, InputHTMLAttributes, ReactNode, useContext} from "react";
import {
	Controller,
	FieldValues,
	FormProvider,
	useForm,
	useFormContext,
	UseFormReturn,
	useFormState,
	UseFormStateReturn
} from "react-hook-form";
import {ZodObject} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import styled from "styled-components";
import Select from 'react-select'

function VerticalField({id,label,err,children,...props}: {id: string, label: string | undefined, err: string | undefined, children: ReactNode}) {
	return (
		<div className={!err ? "field" : "field error"}>
			{typeof(label) === undefined ? null : <label htmlFor={id}>{label}</label>}
			{children}
			{/*<ChildComponent id={id} {...props} />*/}
			{err === undefined ? null : (
				<span className="error">{err}</span>
			)}
		</div>
	)
}

// noinspection TypeScriptRedundantGenericType
export const FieldInfoContext = createContext<ExtraFormType>(null)

interface ExtraFormType {
	fieldProps: (form: UseFormStateReturn<FieldValues>, props: FormComponent) => any,
	fieldType?: ComponentType<any>
}

export type InputType = "text" | "password" | "email" | "number" | "url" | "date"

export interface FormComponent {
	/**
	 * This is also the id for this field.
	 */
	id: string,
	label: string,
	formRegisterOpts?: any,
	// form: UseFormReturn<FieldValues, any>,
}

export function FieldWrapper(props: FormComponent & {children: ReactNode}) {
	const formState = useFormState({name: props.id, exact: true})
	const fi = useContext(FieldInfoContext)
	const Field = fi.fieldType ?? VerticalField
	return (
		<Field {...fi.fieldProps(formState, props)}>
			{props.children}
		</Field>
	)
}

// export function RegisterField(props: {component: JSX.Element}) {
// 	const form = useFormContext()
// 	const FieldComponent = props.component
// 	return (
// 		<FieldComponent
// 			{...props}
// 			id={props.id}
// 			{...form.control.register(props.id, {...(props.formRegisterOpts ?? {})})}
// 		/>
// 	)
// }

/*
TODO: inside out these functions so it's easier to make components
 */

export function Input(props: FormComponent & DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) {
	const form = useFormContext()
	return (
		<FieldWrapper {...props}>
			<input
				{...props}
				id={props.id}
				{...form.control.register(props.id, {...(props.formRegisterOpts ?? {})})}
			/>
		</FieldWrapper>
	)
}

export interface TextAreaProps {
	placeholder?: string,
}

export function TextArea(props: TextAreaProps & FormComponent) {
	const form = useFormContext()
	return (
		<FieldWrapper {...props}>
			<textarea
				id={props.id}
				placeholder={props.placeholder ?? ""}
				{...form.register(props.id, {...(props.formRegisterOpts ?? {})})}
			/>
		</FieldWrapper>
	)
}

export interface DropdownProps {
	items: Array<{value: any, label: string}>
}

export function Dropdown(props: DropdownProps & FormComponent & Parameters<Select>[0]) {
	const form = useFormContext()
	const defaultvalue = props.items.length === 0 ? undefined : props.items[0].value
	return (
		<FieldWrapper {...props}>
			<Controller
				control={form.control}
				defaultValue={defaultvalue}
				name={props.id}
				render={(args) => (
					<Select
						ref={args.field.ref}
						classNamePrefix="addl-class"
						options={props.items}
						value={props.items.find(c => c.value === args.field.value)}
						onChange={val => args.field.onChange(val.value)}
					/>
				)}
			/>
		</FieldWrapper>
	)
}

export interface FormProps {
	className?: string,
	/**
	 * defaults to VerticalField
	 */
	fieldType?: ComponentType<any>,

	/**
	 * used for dynamic forms that want to keep track of state themselves even if the component
	 * is unmounted
	 */
	form?: UseFormReturn<FieldValues, any>,
	formProps?: Parameters<typeof useForm>[0]

	schema?: ZodObject<any,any,any,any,any>,
	/**
	 * content that comes after the form fields
	 */
	children: ReactNode,
	submit: (data: Record<string, any>, form: UseFormReturn<FieldValues, any>) => Promise<void>
}

export const Form = (props: FormProps) => {
	const ugh = {
		mode: "all",
		resolver: props.schema !== undefined ? zodResolver(props.schema) : undefined,
		delayError: 200,
		...(props.formProps || {})
	}
	const form = useForm(ugh as any)
	// const form = WrapForm(
	// 	useForm({resolver: props.schema !== undefined ? zodResolver(props.schema) : undefined}),
	// 	props
	// )

	const submit = form.formState.isSubmitting ? (<Submitting><Spinner /></Submitting>) : null

	return (
		<FieldInfoContext.Provider value={{
			fieldProps: function(formState: UseFormStateReturn<FieldValues>, props: FormComponent): any {
				return {
					key: props.id + "-field",
					label: props.label,
					err: formState.errors[props.id]?.message.toString()
				}
			},
			fieldType: props.fieldType
		}}>
			<FormProvider {...form}>
				{submit}
				<form className={props.className} onSubmit={
					form.handleSubmit(
						async (d) => {
							return await props.submit(d, form);
						},
						(d) => {
							// not needed
							console.log(d)
						}
					)
				}>
					{props.children}
				</form>
			</FormProvider>
		</FieldInfoContext.Provider>
	)
}

const Spinner = styled.div`
	@keyframes spinner {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(720deg);
		}
	}
	width: 10px;
	height: 10px;
	border: 5px solid #f3f3f3;
	border-top: 5px solid #383636;
	border-bottom: 5px solid #383636;
	border-radius: 50%;
	animation: spinner 1.5s linear infinite;
`

const Submitting = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	z-index: 100;
	display: flex;
	text-align: center;
	justify-content: center;
	align-items: center;
	height: 100%;
	width: 100%;
	background: rgba(0,0,0,0.5);
`