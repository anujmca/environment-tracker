using EnvironmentTracker.Server.Data;
using EnvironmentTracker.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace EnvironmentTracker.Server.Services;

public class PingService : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PingService> _logger;

    // In-memory cache of last check times globally per EnvironmentId
    private readonly Dictionary<int, DateTime> _lastCheckTimes = new();

    public PingService(IServiceProvider services, IHttpClientFactory httpClientFactory, ILogger<PingService> logger)
    {
        _services = services;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                var environments = await dbContext.EnvironmentConfigs
                    .Where(e => !e.IsPrivateNetwork)
                    .ToListAsync(stoppingToken);

                var now = DateTime.UtcNow;

                foreach (var env in environments)
                {
                    var intervalSpan = TimeSpan.FromMinutes(env.Interval);
                    _lastCheckTimes.TryGetValue(env.Id, out var lastCheck);

                    if (now - lastCheck >= intervalSpan)
                    {
                        _lastCheckTimes[env.Id] = now;
                        _ = CheckEnvironmentAsync(env.Id, env.Url, stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in PingService");
            }

            // wake up every 30 seconds to poll for targets. Since intervals are in minutes, 30s is a fine granularity.
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); 
        }
    }

    private async Task CheckEnvironmentAsync(int envId, string url, CancellationToken stoppingToken)
    {
        var status = "DOWN";
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            client.DefaultRequestHeaders.Add("User-Agent", "EnvironmentTracker-BackgroundWorker");

            var response = await client.GetAsync(url, stoppingToken);
            if (response.IsSuccessStatusCode)
            {
                status = "UP";
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Check failing for {Url}", url);
            status = "DOWN";
        }

        try
        {
            using var scope = _services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var log = new PingLog
            {
                EnvironmentConfigId = envId,
                Timestamp = DateTime.UtcNow,
                Status = status
            };
            dbContext.PingLogs.Add(log);
            await dbContext.SaveChangesAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save ping log");
        }
    }
}
