using Blazored.LocalStorage;
using EnvironmentTracker.Shared;
using Microsoft.AspNetCore.Components.Authorization;
using System.Net.Http.Json;

namespace EnvironmentTracker.Client.Auth;

public class AuthService
{
    private readonly HttpClient _http;
    private readonly AuthenticationStateProvider _authStateProvider;
    private readonly ILocalStorageService _localStorage;

    public AuthService(HttpClient http, AuthenticationStateProvider authStateProvider, ILocalStorageService localStorage)
    {
        _http = http;
        _authStateProvider = authStateProvider;
        _localStorage = localStorage;
    }

    public async Task<bool> Register(RegisterRequest request)
    {
        var result = await _http.PostAsJsonAsync("api/auth/register", request);
        return result.IsSuccessStatusCode;
    }

    public async Task<bool> Login(LoginRequest request)
    {
        var result = await _http.PostAsJsonAsync("api/auth/login", request);
        
        if (result.IsSuccessStatusCode)
        {
            var response = await result.Content.ReadFromJsonAsync<AuthResponse>();
            await _localStorage.SetItemAsync("authToken", response!.Token);
            ((CustomAuthStateProvider)_authStateProvider).MarkUserAsAuthenticated(response.Token);
            _http.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("bearer", response.Token);
            return true;
        }
        return false;
    }

    public async Task Logout()
    {
        await _localStorage.RemoveItemAsync("authToken");
        ((CustomAuthStateProvider)_authStateProvider).MarkUserAsLoggedOut();
        _http.DefaultRequestHeaders.Authorization = null;
    }
}
