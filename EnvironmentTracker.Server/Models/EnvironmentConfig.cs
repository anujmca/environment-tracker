using System;
using System.Collections.Generic;

namespace EnvironmentTracker.Server.Models;

public class EnvironmentConfig
{
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Usage { get; set; } = string.Empty;
    public int Interval { get; set; } = 10;
    public bool IsPrivateNetwork { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ApplicationUser User { get; set; } = null!;
    public ICollection<PingLog> PingLogs { get; set; } = new List<PingLog>();
}
