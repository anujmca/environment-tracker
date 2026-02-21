using EnvironmentTracker.Server.Data;
using EnvironmentTracker.Server.Models;
using EnvironmentTracker.Shared;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace EnvironmentTracker.Server.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class LogsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LogsController(ApplicationDbContext context)
    {
        _context = context;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("history")]
    public async Task<ActionResult<IEnumerable<HistoryBlockDto>>> GetHistory([FromQuery] int environmentId)
    {
        var env = await _context.EnvironmentConfigs.FirstOrDefaultAsync(e => e.Id == environmentId && e.UserId == UserId);
        if (env == null) return NotFound();

        var logs = await _context.PingLogs
            .Where(p => p.EnvironmentConfigId == environmentId)
            .OrderBy(p => p.Timestamp)
            .ToListAsync();

        var history = new List<HistoryBlockDto>();
        HistoryBlockDto? currentBlock = null;

        foreach (var log in logs)
        {
            if (currentBlock == null)
            {
                currentBlock = new HistoryBlockDto { Status = log.Status, Start = log.Timestamp, End = log.Timestamp };
            }
            else if (currentBlock.Status != log.Status)
            {
                history.Add(currentBlock);
                currentBlock = new HistoryBlockDto { Status = log.Status, Start = log.Timestamp, End = log.Timestamp };
            }
            else
            {
                currentBlock.End = log.Timestamp;
            }
        }

        if (currentBlock != null)
        {
            history.Add(currentBlock);
        }

        history.Reverse(); // latest first
        return Ok(history);
    }

    [HttpGet("raw")]
    public async Task<ActionResult<IEnumerable<PingLogDto>>> GetRawLogs([FromQuery] int environmentId)
    {
        var env = await _context.EnvironmentConfigs.FirstOrDefaultAsync(e => e.Id == environmentId && e.UserId == UserId);
        if (env == null) return NotFound();

        var logs = await _context.PingLogs
            .Where(p => p.EnvironmentConfigId == environmentId)
            .OrderByDescending(p => p.Timestamp)
            .Select(p => new PingLogDto
            {
                Id = p.Id,
                Timestamp = p.Timestamp,
                Status = p.Status
            })
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost("telemetry")]
    public async Task<IActionResult> PostTelemetry([FromBody] PingLogDto dto, [FromQuery] int environmentId)
    {
        var env = await _context.EnvironmentConfigs.FirstOrDefaultAsync(e => e.Id == environmentId && e.UserId == UserId);
        if (env == null || !env.IsPrivateNetwork) return BadRequest("Invalid environment or not a private network");

        var log = new PingLog
        {
            EnvironmentConfigId = environmentId,
            Timestamp = DateTime.UtcNow,
            Status = dto.Status
        };

        _context.PingLogs.Add(log);
        await _context.SaveChangesAsync();
        return Ok();
    }
}
