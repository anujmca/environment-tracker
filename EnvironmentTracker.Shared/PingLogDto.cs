using System;

namespace EnvironmentTracker.Shared;

public class PingLogDto
{
    public int Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class HistoryBlockDto
{
    public string Status { get; set; } = string.Empty;
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}
