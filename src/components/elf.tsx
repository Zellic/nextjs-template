import styled, {css} from "styled-components";

interface ClusterProps {
	gap?: string,
	justifyContent?: string,
	alignItems?: string,
}

export const Cluster = styled.div<ClusterProps>`
	display: flex;
	flex-wrap: wrap;
	gap: ${props => props.gap || "1rem"};
	justify-content: ${props => props.justifyContent || "center"};
	align-items: ${props => props.alignItems || "center"};
`

interface SidebarProps {
	gap?: string,
	alignItems?: string,
	isSidebarRight?: Boolean,
}

const content=css`
	// Start with no width, and grow to consume available space
	flex-basis: 0;
	flex-grow: 999;
	// Wrap when elements are equal width
	min-width: 50%;
`

const sidebar=css`
	// Width is determined by its content, unless set explicitly with a flex-basis value
	flex-basis: auto;
	flex-grow: 1;
	min-width: 0;
`

export const Sidebar = styled.div<SidebarProps>`
	display: flex;
	flex-wrap: wrap;
	gap: ${props => props.gap || "1rem"};
	align-items: ${props => props.alignItems || "stretch"};

	${({ isSidebarRight }) => isSidebarRight === true && css`
	>:first-child {
		${content}
	}
	
	>:last-child {
		${sidebar}
	}
	`}
	${({ isSidebarRight }) => isSidebarRight !== true && css`
	>:first-child {
		${sidebar}
	}
	
	>:last-child {
		${content}
	}
	`}
`

interface StackProps {
	space?: string,
}

export const Stack = styled.div<StackProps>`
	display: flex;
	flex-direction: column;
	justify-content: flex-start;

	// Stack margins take precedence
	> * {
		margin-top: 0;
		margin-bottom: 0;
	}

	> * + * {
		margin-top: ${props => props.space || "1rem"};
	}
`

export const Center = styled.div<StackProps>`
	// Padding will push this element out beyond its max-width if necessary
	box-sizing: content-box;
	max-width: var(--measure);

	// Center us horizontally
	margin-left: auto;
	margin-right: auto;

	// Center our children horizontally
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
`

export const PaddedDiv = styled.div`
	padding: var(--s0);
`