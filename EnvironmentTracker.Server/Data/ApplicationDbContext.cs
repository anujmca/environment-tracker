using EnvironmentTracker.Server.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace EnvironmentTracker.Server.Data;

public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<EnvironmentConfig> EnvironmentConfigs { get; set; }
    public DbSet<PingLog> PingLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<EnvironmentConfig>()
            .HasMany(e => e.PingLogs)
            .WithOne(p => p.EnvironmentConfig)
            .HasForeignKey(p => p.EnvironmentConfigId)
            .OnDelete(DeleteBehavior.Cascade);
            
        builder.Entity<EnvironmentConfig>()
            .HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
