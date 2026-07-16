using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignTrack.Calls.Api.Dtos;
using SignTrack.Calls.Api.Services;

namespace SignTrack.Calls.Api.Controllers;

[ApiController]
[Route("api/v1/rooms")]
[Authorize]
public class RoomsController(RoomService rooms) : ControllerBase
{
    private string? GetUserId() =>
        User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpPost]
    public async Task<ActionResult<RoomListItemDto>> Create([FromBody] CreateRoomDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            var room = await rooms.CreateRoomAsync(userId, dto);
            return StatusCode(201, room);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomListItemDto>>> List()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        return Ok(await rooms.GetMyRoomsAsync(userId));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<RoomDetailDto>> Get(string id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            return Ok(await rooms.GetRoomAsync(userId, id));
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

    [HttpPost("{id}/join")]
    public async Task<ActionResult<JoinRoomResponseDto>> Join(string id, [FromBody] JoinRoomDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            return Ok(await rooms.JoinRoomAsync(userId, id, dto));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/end")]
    public async Task<IActionResult> End(string id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            await rooms.EndRoomAsync(userId, id);
            return Ok(new { success = true, message = "Reunión terminada" });
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
