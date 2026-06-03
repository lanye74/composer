/// <reference types="@cloudflare/workers-types" />

interface Env {
  ASSETS: Fetcher;
}

const DICT_PATH_PREFIX = "/dict/";
const DICT_PATH_SUFFIX = ".br";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isPrecompressedDict = url.pathname.startsWith(DICT_PATH_PREFIX) && url.pathname.endsWith(DICT_PATH_SUFFIX);
    if (!isPrecompressedDict) return env.ASSETS.fetch(request);

    const upstream = await env.ASSETS.fetch(request);
    if (!upstream.ok) return upstream;

    const headers = new Headers(upstream.headers);
    headers.set("Content-Type", "application/octet-stream");
    headers.set("Content-Encoding", "br");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
      encodeBody: "manual",
    });
  },
} satisfies ExportedHandler<Env>;
