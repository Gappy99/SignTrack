using SignTrack.Identity.Application.DTOs;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Domain.Constants;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class UserManagementService(IUserRepository users, IRoleRepository roles, ICloudinaryService cloudinary) : IUserManagementService
{
    public async Task<UserResponseDto?> GetUserProfileAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return null;

        var user = await users.GetByIdAsync(userId);
        if (user == null) return null;

        return new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Surname = user.Surname,
            Username = user.Username,
            Email = user.Email,
            ProfilePicture = cloudinary.GetFullImageUrl(user.UserProfile?.ProfilePicture ?? string.Empty),
            Phone = user.UserProfile?.Phone ?? string.Empty,
            Role = user.UserRoles.FirstOrDefault()?.Role?.Name ?? string.Empty,
            Status = user.Status,
            IsEmailVerified = user.UserEmail?.EmailVerified ?? false,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<UserResponseDto> UpdateUserProfileAsync(string userId, UpdateUserProfileDto dto)
    {
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("Invalid userId", nameof(userId));

        var user = await users.GetByIdAsync(userId) ?? throw new InvalidOperationException("User not found");

        if (!string.IsNullOrWhiteSpace(dto.Name))
            user.Name = dto.Name.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Surname))
            user.Surname = dto.Surname.Trim();

        if (!string.IsNullOrWhiteSpace(dto.ProfilePicture))
            user.UserProfile.ProfilePicture = dto.ProfilePicture.Trim();

        if (!string.IsNullOrWhiteSpace(dto.Phone))
            user.UserProfile.Phone = dto.Phone.Trim();

        user.UpdatedAt = DateTime.UtcNow;

        var updated = await users.UpdateAsync(user);

        return new UserResponseDto
        {
            Id = updated.Id,
            Name = updated.Name,
            Surname = updated.Surname,
            Username = updated.Username,
            Email = updated.Email,
            ProfilePicture = cloudinary.GetFullImageUrl(updated.UserProfile?.ProfilePicture ?? string.Empty),
            Phone = updated.UserProfile?.Phone ?? string.Empty,
            Role = updated.UserRoles.FirstOrDefault()?.Role?.Name ?? string.Empty,
            Status = updated.Status,
            IsEmailVerified = updated.UserEmail?.EmailVerified ?? false,
            CreatedAt = updated.CreatedAt,
            UpdatedAt = updated.UpdatedAt
        };
    }
    public async Task<UserResponseDto> UpdateUserRoleAsync(string userId, string roleName)
    {
        // Normalize
        roleName = roleName?.Trim().ToUpperInvariant() ?? string.Empty;

        // Validate inputs
        if (string.IsNullOrWhiteSpace(userId)) throw new ArgumentException("Invalid userId", nameof(userId));
        if (!RoleConstants.AllowedRoles.Contains(roleName))
            throw new InvalidOperationException($"Role not allowed. Use {RoleConstants.ADMIN_ROLE} or {RoleConstants.USER_ROLE}");

        // Load user with roles
        var user = await users.GetByIdAsync(userId);

        // If demoting an admin, prevent removing last admin
        var isUserAdmin = user.UserRoles.Any(r => r.Role.Name == RoleConstants.ADMIN_ROLE);
        if (isUserAdmin && roleName != RoleConstants.ADMIN_ROLE)
        {
            var adminCount = await roles.CountUsersInRoleAsync(RoleConstants.ADMIN_ROLE);

            if (adminCount <= 1)
            {
                throw new InvalidOperationException("Cannot remove the last administrator");
            }
        }

        // Find role entity
        var role = await roles.GetByNameAsync(roleName)
                       ?? throw new InvalidOperationException($"Role {roleName} not found");

        // Update role using repository method
        await users.UpdateUserRoleAsync(userId, role.Id);

        // Reload user with updated roles
        user = await users.GetByIdAsync(userId);

        // Map to response
        return new UserResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Surname = user.Surname,
            Username = user.Username,
            Email = user.Email,
            ProfilePicture = cloudinary.GetFullImageUrl(user.UserProfile?.ProfilePicture ?? string.Empty),
            Phone = user.UserProfile?.Phone ?? string.Empty,
            Role = role.Name,
            Status = user.Status,
            IsEmailVerified = user.UserEmail?.EmailVerified ?? false,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<IReadOnlyList<string>> GetUserRolesAsync(string userId)
    {
        var roleNames = await roles.GetUserRoleNamesAsync(userId);
        return roleNames;
    }

    public async Task<IReadOnlyList<UserResponseDto>> GetUsersByRoleAsync(string roleName)
    {
        roleName = roleName?.Trim().ToUpperInvariant() ?? string.Empty;
        var usersInRole = await roles.GetUsersByRoleAsync(roleName);
        return usersInRole.Select(u => MapToUserResponseDto(u, roleName)).ToList();
    }

    public async Task<IReadOnlyList<UserResponseDto>> GetAllUsersAsync()
    {
        var allUsers = await users.GetAllAsync();
        return allUsers.Select(u => MapToUserResponseDto(u)).ToList();
    }

    private UserResponseDto MapToUserResponseDto(User u, string? roleOverride = null)
    {
        return new UserResponseDto
        {
            Id = u.Id,
            Name = u.Name,
            Surname = u.Surname,
            Username = u.Username,
            Email = u.Email,
            ProfilePicture = cloudinary.GetFullImageUrl(u.UserProfile?.ProfilePicture ?? string.Empty),
            Phone = u.UserProfile?.Phone ?? string.Empty,
            Role = roleOverride ?? u.UserRoles.FirstOrDefault()?.Role?.Name ?? string.Empty,
            Status = u.Status,
            IsEmailVerified = u.UserEmail?.EmailVerified ?? false,
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt
        };
    }
}
