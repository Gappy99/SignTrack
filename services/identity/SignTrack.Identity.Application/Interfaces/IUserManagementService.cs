using SignTrack.Identity.Application.DTOs;

namespace SignTrack.Identity.Application.Interfaces;

public interface IUserManagementService
{
    Task<UserResponseDto> UpdateUserRoleAsync(string userId, string roleName);
    Task<IReadOnlyList<string>> GetUserRolesAsync(string userId);
    Task<IReadOnlyList<UserResponseDto>> GetUsersByRoleAsync(string roleName);
    Task<IReadOnlyList<UserResponseDto>> GetAllUsersAsync();
    Task<IReadOnlyList<UserResponseDto>> GetContactsAsync(string currentUserId, string? query);
    Task<IReadOnlyList<UserResponseDto>> GetDirectoryAsync(string currentUserId, string? query);
    Task<UserResponseDto?> GetUserProfileAsync(string userId);
    Task<UserResponseDto> UpdateUserProfileAsync(string userId, UpdateUserProfileDto dto);
}