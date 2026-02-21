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
public class EnvironmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public EnvironmentsController(ApplicationDbContext context)
    {
        _context = context;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EnvironmentConfigDto>>> Get()
    {
        var envs = await _context.EnvironmentConfigs
            .Where(e => e.UserId == UserId)
            .ToListAsync();

        return Ok(envs.Select(e => new EnvironmentConfigDto
        {
            Id = e.Id,
            Url = e.Url,
            Name = e.Name,
            Usage = e.Usage,
            Interval = e.Interval,
            IsPrivateNetwork = e.IsPrivateNetwork,
            CreatedAt = e.CreatedAt
        }));
    }

    [HttpPost]
    public async Task<ActionResult<EnvironmentConfigDto>> Post(EnvironmentConfigDto dto)
    {
        var env = new EnvironmentConfig
        {
            UserId = UserId,
            Url = dto.Url,
            Name = dto.Name,
            Usage = dto.Usage,
            Interval = dto.Interval,
            IsPrivateNetwork = dto.IsPrivateNetwork
        };

        _context.EnvironmentConfigs.Add(env);
        await _context.SaveChangesAsync();
        dto.Id = env.Id;
        dto.CreatedAt = env.CreatedAt;

        return CreatedAtAction(nameof(Get), new { id = env.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Put(int id, EnvironmentConfigDto dto)
    {
        if (id != dto.Id) return BadRequest();

        var env = await _context.EnvironmentConfigs.FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);
        if (env == null) return NotFound();

        env.Name = dto.Name;
        env.Usage = dto.Usage;
        env.Interval = dto.Interval;
        env.IsPrivateNetwork = dto.IsPrivateNetwork;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var env = await _context.EnvironmentConfigs.FirstOrDefaultAsync(e => e.Id == id && e.UserId == UserId);
        if (env == null) return NotFound();

        _context.EnvironmentConfigs.Remove(env);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
