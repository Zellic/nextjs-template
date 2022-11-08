export default function Index() {
	return (
		<div>Hello there!</div>
	)
}

export async function getStaticProps({params}) {
	return {
		props: {}
	}
}