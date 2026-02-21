# Walkthrough: .NET 8 SaaS Rewrite

I have successfully ported the existing Node.js environment tracker to a robust **.NET 8 Hosted Blazor WebAssembly** application with a PostgreSQL database.

## Architecture Highlights

1. **Server API**: Built with ASP.NET Core Web API, using Entity Framework Core for PostgreSQL.
2. **Client App**: Standalone Blazor WebAssembly client utilizing components and robust C# state management.
3. **Authentication**: Secured with ASP.NET Core Identity & custom JWT Bearer tokens. 
4. **Data Isolation (Multi-Tenancy)**: The schema enforces user-level isolation. You will only see the environments that you create on your account.

## Pinging Logic Upgrades

The architecture was significantly enhanced to handle both public servers and private intranet endpoints:

- **Server Background Worker**: An `IHostedService` (`PingService`) runs continuously on the API backend to check public URLs efficiently.
- **Client Intranet Worker**: The Blazor dashboard now includes a background timer running every 30 seconds. It fetches and status-checks URLs explicitly marked as `Intranet (Client Ping) = true` directly from your browser, securely reporting the telemetry back to the server.

> [!TIP]
> **Client Ping Network Handling (CORS)**: Modern browsers typically block HTTP requests to endpoints on entirely different domains (like `google.com`) unless explicit CORS headers are provided. We upgraded the Client Pinger to use `NoCors` mode. This yields `Opaque Responses`; the browser allows the ping to succeed without revealing the data to the client, effectively bypassing the CORS blockade to verify the host is alive!

## Cloud Hosting Architecture

The application has been fully deployed to a modern, serverless cloud infrastructure with CI/CD automation:

1. **Database (Neon.tech)**: A serverless PostgreSQL instance running on AWS, providing instantaneous scaling and a generous free tier.
2. **Backend API (Render)**: The ASP.NET Core server runs in a custom Docker container on Render's Web Service platform. It automatically runs Entity Framework (`.Migrate()`) on startup to keep the Neon database schema in sync.
3. **Frontend (Cloudflare Pages)**: The Blazor WebAssembly static assets are automatically built (via a custom `build.sh` script to install the .NET SDK) and distributed globally across Cloudflare's CDN.

> [!NOTE]
> We swapped the database naming conventions globally to `snake_case` using `EFCore.NamingConventions` to ensure maximal compatibility with standard PostgreSQL tooling.

## Continuous Deployment

Any code pushed to the `release/multi-tenant` branch on GitHub automatically triggers builds on both Render and Cloudflare Pages. The production API endpoint is strictly configured in the frontend's `appsettings.Production.json`.
