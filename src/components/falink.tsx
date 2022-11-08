import {FontAwesomeIcon, FontAwesomeIconProps} from "@fortawesome/react-fontawesome";
import styled from "styled-components";

export function FontAwesomeLink(props: {href: string} & FontAwesomeIconProps) {
	return (
		<IconLink href={props.href}><FontAwesomeIcon {...props} /></IconLink>
	)
}

const IconLink = styled.a`
	color: hsl(188, 79%, 85%);

	:active, :focus {
		color: hsl(188, 79%, 85%);
	}

	&:hover {
		color: hsl(207, 68%, 70%);
	}
`