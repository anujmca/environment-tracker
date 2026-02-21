using System;

namespace EnvironmentTracker.Server.Models;

public class PingLog
{
    public int Id { get; set; }
    public int EnvironmentConfigId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "DOWN";

    public EnvironmentConfig EnvironmentConfig { get; set; } = null!;
}
