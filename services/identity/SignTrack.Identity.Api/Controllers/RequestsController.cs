using SignTrack.Identity.Application.DTOs.Requests;
using SignTrack.Identity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace SignTrack.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/requests")]
[Authorize]
public class RequestsController(IUserRequestService requestService) : ControllerBase
{
    private string? GetCurrentUserId()
    {
        return User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
    }

    [HttpPost]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<UserRequestResponseDto>> SendRequest([FromBody] CreateUserRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var request = await requestService.SendRequestAsync(userId, dto);
        return Ok(request);
    }

    [HttpGet("inbox")]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<UserRequestResponseDto>>> GetInbox()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var inbox = await requestService.GetInboxAsync(userId);
        return Ok(inbox);
    }

    [HttpPatch("{id}")]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<UserRequestResponseDto>> RespondToRequest(string id, [FromBody] UpdateUserRequestDto dto)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var request = await requestService.RespondAsync(id, userId, dto);
        return Ok(request);
    }
}
