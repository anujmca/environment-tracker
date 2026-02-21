#!/bin/bash
# Exit on any failure
set -e

echo "Downloading .NET 8 SDK..."
curl -sSL https://dot.net/v1/dotnet-install.sh > dotnet-install.sh
chmod +x dotnet-install.sh

# Install the .NET 8 SDK locally into the ./dotnet folder
./dotnet-install.sh -c 8.0 -InstallDir ./dotnet

echo "Publishing the Blazor WebAssembly Client..."
# Use the locally installed dotnet executable to publish the project
./dotnet/dotnet publish EnvironmentTracker.Client/EnvironmentTracker.Client.csproj -c Release -o output
