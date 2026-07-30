using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class ContactRepository(ApplicationDbContext context) : IContactRepository
{
    public async Task CreateBidirectionalAsync(string userIdA, string userIdB)
    {
        var existing = await context.Contacts
            .Where(c => (c.UserId == userIdA && c.ContactUserId == userIdB) ||
                        (c.UserId == userIdB && c.ContactUserId == userIdA))
            .ToListAsync();

        var now = DateTime.UtcNow;
        var added = false;

        if (!existing.Any(c => c.UserId == userIdA && c.ContactUserId == userIdB))
        {
            context.Contacts.Add(new Contact
            {
                Id = UuidGenerator.GenerateContactId(),
                UserId = userIdA,
                ContactUserId = userIdB,
                CreatedAt = now
            });
            added = true;
        }

        if (!existing.Any(c => c.UserId == userIdB && c.ContactUserId == userIdA))
        {
            context.Contacts.Add(new Contact
            {
                Id = UuidGenerator.GenerateContactId(),
                UserId = userIdB,
                ContactUserId = userIdA,
                CreatedAt = now
            });
            added = true;
        }

        if (added)
        {
            await context.SaveChangesAsync();
        }
    }

    public async Task<bool> ExistsAsync(string userIdA, string userIdB)
    {
        return await context.Contacts.AnyAsync(c =>
            (c.UserId == userIdA && c.ContactUserId == userIdB) ||
            (c.UserId == userIdB && c.ContactUserId == userIdA));
    }

    public async Task<IReadOnlyList<User>> GetContactsAsync(string userId, string? query = null)
    {
        var q = context.Users
            .Include(u => u.UserProfile)
            .Include(u => u.UserEmail)
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Where(u => context.Contacts.Any(c => c.UserId == userId && c.ContactUserId == u.Id));

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
            .ToListAsync();
    }
}
