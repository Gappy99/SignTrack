using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignTrack.Messaging.Api.Dtos;
using SignTrack.Messaging.Api.Services;

namespace SignTrack.Messaging.Api.Controllers;

[ApiController]
[Route("api/v1/conversations")]
[Authorize]
public class ConversationsController(ConversationService conversations) : ControllerBase
{
    private string? GetUserId() =>
        User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpPost]
    public async Task<ActionResult<ConversationListItemDto>> Create([FromBody] CreateConversationDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            var result = await conversations.CreateConversationAsync(userId, dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (Exception ex) when (ex is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ConversationListItemDto>>> List()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var items = await conversations.GetMyConversationsAsync(userId);
        return Ok(items);
    }

    [HttpGet("unread-total")]
    public async Task<ActionResult<object>> UnreadTotal()
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        return Ok(new { total = await conversations.GetTotalUnreadAsync(userId) });
    }

    [HttpPost("call-room/{roomId}")]
    public async Task<ActionResult<ConversationListItemDto>> CallRoomChat(string roomId)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            return Ok(await conversations.GetOrCreateCallRoomConversationAsync(userId, roomId));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "No se pudo abrir el chat de reunión", error = ex.Message });
        }
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkRead(string id)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            await conversations.MarkReadAsync(userId, id);
            return Ok(new { success = true });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}/messages")]
    public async Task<ActionResult<MessagesPageDto>> GetMessages(
        string id,
        [FromQuery] string? cursor,
        [FromQuery] int limit = 50)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            var page = await conversations.GetMessagesAsync(userId, id, cursor, limit);
            await conversations.MarkReadAsync(userId, id);
            return Ok(page);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/messages")]
    public async Task<ActionResult<MessageDto>> SendMessage(string id, [FromBody] SendMessageDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        try
        {
            var message = await conversations.SendMessageAsync(userId, id, dto);
            return StatusCode(201, message);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { success = false, message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
