using SignTrack.Identity.Application.DTOs.Appointments;
using SignTrack.Identity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SignTrack.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/appointments")]
[Authorize]
public class AppointmentsController(IAppointmentService appointments) : ControllerBase
{
    private string? GetUserId() =>
        User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AppointmentResponseDto>>> List()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        return Ok(await appointments.ListAsync(userId));
    }

    [HttpPost]
    public async Task<ActionResult<AppointmentResponseDto>> Create([FromBody] CreateAppointmentDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try
        {
            var item = await appointments.CreateAsync(userId, dto);
            return StatusCode(201, item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/link-room")]
    public async Task<ActionResult<AppointmentResponseDto>> LinkRoom(string id, [FromBody] LinkRoomDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        try
        {
            return Ok(await appointments.LinkRoomAsync(userId, id, dto.RoomId));
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

    [HttpPost("{id}/start")]
    public async Task<ActionResult<AppointmentResponseDto>> Start(string id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId)) return Unauthorized();

        var auth = Request.Headers.Authorization.ToString();
        if (string.IsNullOrWhiteSpace(auth))
            return Unauthorized(new { success = false, message = "Token requerido" });

        try
        {
            return Ok(await appointments.StartAsync(userId, id, auth));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

public class LinkRoomDto
{
    public string RoomId { get; set; } = string.Empty;
}
