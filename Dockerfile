# Use the official .NET 8 SDK as a build environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files
COPY ["EnvironmentTracker.Server/EnvironmentTracker.Server.csproj", "EnvironmentTracker.Server/"]
COPY ["EnvironmentTracker.Shared/EnvironmentTracker.Shared.csproj", "EnvironmentTracker.Shared/"]
COPY ["EnvironmentTracker.Client/EnvironmentTracker.Client.csproj", "EnvironmentTracker.Client/"]
RUN dotnet restore "EnvironmentTracker.Server/EnvironmentTracker.Server.csproj"

# Copy remaining source code
COPY . .

# Publish the Server project
WORKDIR "/src/EnvironmentTracker.Server"
RUN dotnet publish "EnvironmentTracker.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the ASP.NET Core runtime image for the final stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Ensure it binds to port 8080 (Render's default expectation for .NET 8)
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "EnvironmentTracker.Server.dll"]
