import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Enable CORS so browser cookies / headers flow properly to Convex auth endpoints
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;