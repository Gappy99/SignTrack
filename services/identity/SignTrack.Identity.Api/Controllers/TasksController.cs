using SignTrack.Identity.Application.DTOs.Tasks;
using SignTrack.Identity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SignTrack.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/tasks")]
[Authorize]
public class TasksController(ITaskService tasks) : ControllerBase
{
    private string? GetUserId() =>
        User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TaskResponseDto>>> List(
        [FromQuery] string? groupId,
        [FromQuery] string? status)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(await tasks.ListAsync(userId, groupId, status));
    }

    [HttpPost]
    public async Task<ActionResult<TaskResponseDto>> Create([FromBody] CreateTaskDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try
        {
            var task = await tasks.CreateAsync(userId, dto);
            return StatusCode(201, task);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<TaskResponseDto>> Update(string id, [FromBody] UpdateTaskDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try
        {
            return Ok(await tasks.UpdateAsync(userId, id, dto));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try
        {
            await tasks.DeleteAsync(userId, id);
            return Ok(new { success = true });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }
}
