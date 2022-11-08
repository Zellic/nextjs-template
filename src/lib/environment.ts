let _global;
try {
	_global = global;
} catch(ex) {}

try {
	_global = window;
} catch(ex) {}

export const inDevEnvironment =
	(_global.process !== undefined && process && process.env.NODE_ENV === 'development') ||
	(_global.process !== undefined && process.env.IS_DEV === "1") ||
	// production should never be accessed over HTTP, redirects to HTTPs would be handled by
	// cloudflare or nginx
	(_global.location !== undefined && location.protocol !== 'https:');