using System;
using System.ComponentModel.DataAnnotations;

namespace EnvironmentTracker.Shared;

public class EnvironmentConfigDto
{
    public int Id { get; set; }
    [Required, Url]
    public string Url { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Usage { get; set; } = string.Empty;
    [Range(1, 1440)]
    public int Interval { get; set; } = 10;
    public bool IsPrivateNetwork { get; set; } = false;
    public DateTime CreatedAt { get; set; }
    
    // UI specific properties
    public string CurrentStatus { get; set; } = "PENDING";
    public int DaysUp { get; set; } = 0;
    public DateTime? LastOnline { get; set; }
}
