import {cloneElement, Fragment, useEffect, useRef, useState} from "react";

/**
 * This 'library' supports imperative-like modal -> promise calls using a global component that is
 * placed once in the tree at the top of the hierachy.
 *
 * Modals should derive themselves from this singleton component.
 *
 * E.g.
 *
 * ```
 * export const modals = new ModalManager()
 * export const YesNoPrompt = modals.create<YesNoPromptProps & {title: string}, boolean>((props) => {
 * 	return (
 * 		<ModalDialog title={props.title}>
 * 			<p>{props.message}</p>
 * 			<Cluster>
 * 				<button onClick={() => {props.modal.resolve(true)}}>Yes</button>
 * 				<button onClick={() => {props.modal.resolve(false)}}>No</button>
 * 			</Cluster>
 * 		</ModalDialog>
 * 	)
 * })
 * ```
 *
 * Usage:
 *
 * ```
 * 			<button onClick={(event) => {
 * 				YesNoPrompt.show({title: "test modal", message: "Really do this meme?"}).then((result) => {
 * 					console.log("button result: " + result.toString())
 * 				})
 * 			}}>Modal</button>
 * ```
 */

export interface ModalException {
	message: string,
}

export interface ModalProps<R> {
	modal: ModalCallback<R>
}

export class ModalCreator<P, R> {
	constructor(readonly manager: ModalManager, readonly render: (props: P & ModalProps<R>) => JSX.Element) {}

	show(props: P): Promise<R> {
		let [cb, promise] = ModalCallback.create<R>()
		return this._showInsideOut(props, cb, promise)
	}

	/**
	 * Use with caution. This allows you to pass a promise in from outside instead of creating one
	 * that's lexically scoped internally.
	 *
	 * This allows you to create modal wrappers that simplify API, e.g. FormModal, but passing
	 * an already resolved promise may cause undefined behavior. This should only use a
	 * locally scoped ModalCallback.create<R>() result.
	 */
	_showInsideOut(props: P, cb: ModalCallback<R>, promise: Promise<R>): Promise<R> {
		const modal = new Modal(this.render, {...props, modal: cb})

		this.manager._open(modal)

		promise.finally(() => {
			this.manager._close(modal)
		})

		return promise
	}
}

export class ModalCallback<R> {
	private active: boolean = true
	private constructor(
		private _resolve: (value: R) => void,
		private _reject: (reason?: any) => void
	) {}

	static create<R>(): [ModalCallback<R>, Promise<R>] {
		let _resolve: (value: R) => void
		let _reject: (reason?: any) => void
		const ret = new Promise<R>((resolve, reject: (reason?: any) => void) => {
			_resolve = resolve
			_reject = reject
		})
		return [new ModalCallback(_resolve, _reject), ret]
	}

	__setActive(b: boolean) {
		this.active = b
	}

	isActive(): boolean {
		return this.active
	}

	resolve(value: R) {
		this._resolve(value)
	}

	error(reason: ModalException) {
		this._reject(reason)
	}

	errorMsg(message: string) {
		this.error({message: message})
	}
}

export class ModalManager {
	/**
	 * Array tracking modals that are currently open.
	 */
	public modals: Array<Modal<any>> = []
	private callbacks: Array<() => void> = []

	_open(modal: Modal<any>) {
		this.modals.push(modal)

		for(const cb of this.callbacks) {
			cb()
		}
	}

	_close(modal: Modal<any>) {
		if(this.modals[this.modals.length - 1] !== modal)
			throw new Error("Modal tried to close other modal... " + modal.toString())
		this.modals = this.modals.splice(0, this.modals.length-1)

		// this will cause modal to be unmounted, which will cleanup callbacks
		for(const cb of this.callbacks) {
			cb()
		}
	}

	create<T, R>(component: (props: T & ModalProps<R>) => JSX.Element): ModalCreator<T, R> {
		return new ModalCreator(
			this,
			component,
		)
	}

	subscribe(onUpdate: () => void): {cleanup: () => void} {
		this.callbacks.push(onUpdate)
		return {
			cleanup: () => {
				this.callbacks = this.callbacks.filter(it => it !== onUpdate)
			}
		}
	}
}

export const ModalRenderer = (props: {manager: ModalManager}) => {
	const stable_ref = useRef(0)
	const [rerender, setRerender] = useState(0)
	const m = props.manager

	useEffect(() => {
		return props.manager.subscribe(() => {
			stable_ref.current = stable_ref.current + 1
			// re-render if the modal state changes...
			setRerender(stable_ref.current)
		}).cleanup
	}, [props.manager])

	const last = m.modals.length - 1
	return <Fragment>
		{m.modals.map((it, i) => {
			return cloneElement(it.render(i, i === last), {key: i}, null)
		})}
	</Fragment>
	// if(m.modals.length > 0)
	// 	return m.modals[m.modals.length - 1].render()
	//
	// return null
}

class Modal<P> {
	constructor (public inner: (props: P) => JSX.Element, public props: P & ModalProps<any>) {}

	render(key: number, active: boolean) {
		const Inner = this.inner
		this.props.modal.__setActive(active)
		return <Inner {...this.props} />
	}
}

export const modals = new ModalManager()