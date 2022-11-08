import {AppProps} from "next/app";
import '/styles/main.scss'
import {Fragment, ReactElement, ReactNode} from "react";
import {NextPage} from "next";
import {CSRFContext, UserSessionContext} from "security/clientside_session";
import {ModalRenderer, modals} from "lib/modal";
import GlobalStyle from "style/global";
import {config, library} from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import {fas} from '@fortawesome/free-solid-svg-icons'
import Head from "next/head";
import {SITE_NAME} from "info";

config.autoAddCss = false
library.add(fas)

export type NextPageWithLayout = NextPage & {
	// TODO: figure out how to make this a generic
	getLayout?: (page: ReactElement, props: any) => ReactNode
}

type AppPropsWithLayout = AppProps & {
	Component: NextPageWithLayout
}

function DefaultWrapper(page: ReactElement, props: any): ReactNode {
	return page //(<NavbarWrapper>{page}</NavbarWrapper>)
}

function FunctionalityWrapper(page: ReactNode, props: any): ReactNode {
	// modalrenderer is considered safe for the functionality wrapper because it doesn't
	// render anything if there are no modals open, so it won't break e.g. a landing page
	let prev: ReactNode = (
		<Fragment key="maincontainer">
			<Head>
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>{SITE_NAME}</title>
			</Head>
			<div>
				<GlobalStyle />
				<ModalRenderer manager={modals} />
				{page}
			</div>
		</Fragment>
	)

	if(props.session_user !== undefined) {
		prev = (
			<UserSessionContext.Provider value={props.session_user}>
				{[prev]}
			</UserSessionContext.Provider>
		)
	}
	if(props.csrf !== undefined) {
		prev = (
			<CSRFContext.Provider value={props.csrf}>
				{[prev]}
			</CSRFContext.Provider>
		)
	}

	return prev
}

// next.js custom app entry point
export default function MyApp({ Component, pageProps: { session, ...pageProps }, }: AppPropsWithLayout) {
	// inject :root CSS variables for theme, they contain colors
	// useEffect(() => {
	// 	const sheet = document.documentElement.style; //.styleSheets[0];
	//
	// 	for(const [k,v] of theme.css.entries()) {
	// 		sheet.setProperty(k, v)
	// 	}
	// })

	// if a page's exported function has `getLayout` defined it can opt out of
	// the default nav wrapper, but not CSRF/UserSession/ModalRenderer
	const getLayout = Component.getLayout ?? DefaultWrapper

	return FunctionalityWrapper(getLayout(<Component {...pageProps} />, pageProps), pageProps)
}