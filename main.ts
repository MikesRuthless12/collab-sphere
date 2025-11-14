// Deno Deploy entry point for Collab Sphere
// This serves the static frontend files from the dist directory

import { serveDir } from "https://deno.land/std@0.224.0/http/file_server.ts";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Serve static files from dist directory
  const response = await serveDir(req, {
    fsRoot: "./dist",
    urlRoot: "",
    showDirListing: false,
    enableCors: true,
  });
  
  // If file not found and it's not an asset, serve index.html for client-side routing
  if (response.status === 404 && !url.pathname.startsWith('/assets/')) {
    try {
      const indexFile = await Deno.readFile("./dist/index.html");
      return new Response(indexFile, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  }
  
  return response;
});
