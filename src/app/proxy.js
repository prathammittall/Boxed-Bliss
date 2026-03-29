const DEFAULT_LOCAL_PROXY = "http://localhost:4000";

const configuredProxy = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const proxy = (configuredProxy && configuredProxy.length > 0 ? configuredProxy : DEFAULT_LOCAL_PROXY).replace(
	/\/+$/,
	""
);

export { proxy };
