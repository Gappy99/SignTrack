using SignTrack.Identity.Application.DTOs;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace SignTrack.Identity.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class UsersController(IUserManagementService userManagementService) : ControllerBase
{
    private async Task<bool> CurrentUserIsAdmin()
    {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (string.IsNullOrEmpty(userId)) return false;
        var roles = await userManagementService.GetUserRolesAsync(userId);
        return roles.Contains(RoleConstants.ADMIN_ROLE);
    }

    [HttpPut("{userId}/role")]
    [Authorize]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<UserResponseDto>> UpdateUserRole(string userId, [FromBody] UpdateUserRoleDto dto)
    {
        if (!await CurrentUserIsAdmin())
        {
            return StatusCode(403, new { success = false, message = "Forbidden" });
        }

        var result = await userManagementService.UpdateUserRoleAsync(userId, dto.RoleName);
        return Ok(result);
    }

    [HttpGet("{userId}/roles")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<string>>> GetUserRoles(string userId)
    {
        var roles = await userManagementService.GetUserRolesAsync(userId);
        return Ok(roles);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponseDto?>> GetMyProfile()
    {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var profile = await userManagementService.GetUserProfileAsync(userId);
        if (profile == null) return NotFound(new { success = false, message = "Perfil no encontrado" });

        return Ok(profile);
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserResponseDto>> UpdateMyProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var updated = await userManagementService.UpdateUserProfileAsync(userId, dto);
        return Ok(updated);
    }

    [HttpGet("contacts")]
    [Authorize]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<UserResponseDto>>> GetContacts([FromQuery] string? q)
    {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var contacts = await userManagementService.GetContactsAsync(userId, q);
        return Ok(contacts);
    }

    [HttpGet("directory")]
    [Authorize]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<UserResponseDto>>> GetDirectory([FromQuery] string? q)
    {
        var userId = User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { success = false, message = "Usuario no autenticado" });

        var directory = await userManagementService.GetDirectoryAsync(userId, q);
        return Ok(directory);
    }

    [HttpGet]
    [Authorize]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<UserResponseDto>>> GetAllUsers()
    {
        if (!await CurrentUserIsAdmin())
        {
            return StatusCode(403, new { success = false, message = "Forbidden" });
        }

        var users = await userManagementService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("by-role/{roleName}")]
    [Authorize]
    [EnableRateLimiting("ApiPolicy")]
    public async Task<ActionResult<IReadOnlyList<UserResponseDto>>> GetUsersByRole(string roleName)
    {
        if (!await CurrentUserIsAdmin())
        {
            return StatusCode(403, new { success = false, message = "Forbidden" });
        }
        
        var users = await userManagementService.GetUsersByRoleAsync(roleName);
        return Ok(users);
    }
}
