using SignTrack.Identity.Application.DTOs.Groups;
using SignTrack.Identity.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace SignTrack.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/groups")]
[Authorize]
public class GroupsController(IGroupService groupService) : ControllerBase
{
    private string? GetCurrentUserId()
    {
        return User.Claims.FirstOrDefault(c =>
            c.Type == "sub" ||
            c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
    }

    [HttpPost]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<GroupResponseDto>> CreateGroup([FromBody] CreateGroupDto dto)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var group = await groupService.CreateGroupAsync(userId, dto);
        return Ok(group);
    }

    [HttpGet]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<GroupResponseDto>>> GetMyGroups()
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var groups = await groupService.GetMyGroupsAsync(userId);
        return Ok(groups);
    }

    [HttpGet("{id}")]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<GroupResponseDto>> GetGroup(string id)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var group = await groupService.GetGroupDetailAsync(id, userId);
        return Ok(group);
    }

    [HttpPost("{id}/members")]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<GroupResponseDto>> AddMember(string id, [FromBody] AddGroupMemberDto dto)
    {
        var userId = GetCurrentUserId();
        if (string.IsNullOrEmpty(userId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var group = await groupService.AddMemberAsync(id, userId, dto);
        return Ok(group);
    }

    [HttpDelete("{id}/members/{userId}")]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<IActionResult> RemoveMember(string id, string userId)
    {
        var currentUserId = GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
            return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        await groupService.RemoveMemberAsync(id, currentUserId, userId);
        return Ok(new { success = true, message = "Member removed" });
    }
}
