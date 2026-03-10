using AuthServiceSignTrack.Application.DTOs;

namespace AuthServiceSignTrack.Application.Interfaces;

public interface IUserManagementService
{
    Task<UserResponseDto> UpdateUserRoleAsync(string userId, string roleName);
    Task<IReadOnlyList<string>> GetUserRolesAsync(string userId);
    Task<IReadOnlyList<UserResponseDto>> GetUsersByRoleAsync(string roleName);
    Task<UserResponseDto?> GetUserProfileAsync(string userId);
    Task<UserResponseDto> UpdateUserProfileAsync(string userId, UpdateUserProfileDto dto);
}