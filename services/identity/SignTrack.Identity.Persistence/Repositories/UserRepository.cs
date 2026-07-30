using System.Data;
using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class UserRepository(ApplicationDbContext context) : IUserRepository
{
    public async Task<User> GetByIdAsync(string id)
    {
        var user = await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserPasswordReset)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == id);
            return user ?? throw new InvalidOperationException($"User with id {id} not found.");
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserPasswordReset)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => EF.Functions.ILike(u.Email, email));
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserPasswordReset)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => EF.Functions.ILike(u.Username, username));
    }

    public async Task<User?> GetByEmailVerificationTokenAsync(string token)
    {
        return await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserPasswordReset)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserEmail != null && 
                                    u.UserEmail.EmailVerificationToken == token &&
                                    u.UserEmail.EmailVerificationTokenExpiry > DateTime.UtcNow);
    }

    public async Task<User?> GetByPasswordResetTokenAsync(string token)
    {
        return await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserPasswordReset)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserPasswordReset != null && 
                                    u.UserPasswordReset.PasswordResetToken == token &&
                                    u.UserPasswordReset.PasswordResetTokenExpiry > DateTime.UtcNow);
    }

    public async Task<User> CreateAsync(User user)
    {
        context.Users.Add(user);
        await context.SaveChangesAsync();
        return await GetByIdAsync(user.Id);
    }

    public async Task<User> UpdateAsync(User user)
    {
        await context.SaveChangesAsync();
        return await GetByIdAsync(user.Id);
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var user = await GetByIdAsync(id);
        context.Users.Remove(user);
        await context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ExistsByEmailAsync(string email)
    {
        return await context.Users
            .AnyAsync(u => EF.Functions.ILike(u.Email, email));
    }

    public async Task<bool> ExistsByUsernameAsync(string username)
    {
        return await context.Users
            .AnyAsync(u => EF.Functions.ILike(u.Username, username));
    }

    public async Task<IReadOnlyList<User>> GetAllAsync()
    {
        return await context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Username)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<User>> SearchDirectoryAsync(string currentUserId, string? query, int limit = 50)
    {
        var q = context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => u.Id != currentUserId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            q = q.Where(u =>
                EF.Functions.ILike(u.Username, $"%{term}%") ||
                EF.Functions.ILike(u.Name, $"%{term}%") ||
                EF.Functions.ILike(u.Surname, $"%{term}%") ||
                EF.Functions.ILike(u.Email, $"%{term}%"));
        }

        return await q
            .OrderBy(u => u.Name)
            .ThenBy(u => u.Surname)
            .Take(limit)
            .ToListAsync();
    }

    public async Task UpdateUserRoleAsync(string userId, string roleId)
    {
        var existingRoles = await context.UserRoles
            .Where(ur => ur.UserId == userId)
            .ToListAsync();

        context.UserRoles.RemoveRange(existingRoles);

        var newUserRole = new UserRole
        {
            Id = UuidGenerator.GenerateUserId(),
            UserId = userId,
            RoleId = roleId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.UserRoles.Add(newUserRole);
        await context.SaveChangesAsync();
    }
}