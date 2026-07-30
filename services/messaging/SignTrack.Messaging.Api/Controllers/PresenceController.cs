using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignTrack.Messaging.Api.Services;

namespace SignTrack.Messaging.Api.Controllers;

[ApiController]
[Route("api/v1/presence")]
[Authorize]
public class PresenceController(PresenceService presence) : ControllerBase
{
    [HttpGet("online")]
    public async Task<ActionResult<object>> Online() =>
        Ok(new { userIds = await presence.GetOnlineUserIdsAsync() });

    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat()
    {
        var userId = User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        await presence.SetOnlineAsync(userId);
        return Ok(new { success = true });
    }
}
