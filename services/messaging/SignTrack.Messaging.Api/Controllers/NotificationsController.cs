using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignTrack.Messaging.Api.Dtos;
using SignTrack.Messaging.Api.Services;

namespace SignTrack.Messaging.Api.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationsController(NotificationService notifications) : ControllerBase
{
    private string? GetUserId() =>
        User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpGet("vapid-public-key")]
    [AllowAnonymous]
    public ActionResult<object> VapidPublicKey()
    {
        var key = notifications.GetVapidPublicKey();
        return Ok(new { publicKey = key, enabled = key != null });
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscribeDto dto)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        if (string.IsNullOrWhiteSpace(dto.Endpoint) || dto.Keys == null)
            return BadRequest(new { success = false, message = "Suscripción inválida" });

        await notifications.SubscribeAsync(userId, dto);
        return Ok(new { success = true });
    }

    [HttpDelete("subscribe")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string endpoint)
    {
        var userId = GetUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        if (string.IsNullOrWhiteSpace(endpoint))
            return BadRequest(new { success = false, message = "Endpoint requerido" });

        await notifications.UnsubscribeAsync(userId, endpoint);
        return Ok(new { success = true });
    }

    [HttpPost("notify-user")]
    public async Task<IActionResult> NotifyUser([FromBody] NotifyUserDto dto)
    {
        var callerId = GetUserId();
        if (string.IsNullOrEmpty(callerId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        if (string.IsNullOrWhiteSpace(dto.UserId) || string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { success = false, message = "userId y title son requeridos" });

        await notifications.NotifyUserAsync(dto.UserId, dto.Title, dto.Body ?? string.Empty, dto.Url);
        return Ok(new { success = true });
    }
}
