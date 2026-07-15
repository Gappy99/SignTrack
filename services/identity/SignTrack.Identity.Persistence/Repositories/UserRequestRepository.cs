using SignTrack.Identity.Domain.Constants;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class UserRequestRepository(ApplicationDbContext context) : IUserRequestRepository
{
    public async Task<UserRequest> CreateAsync(UserRequest request)
    {
        context.UserRequests.Add(request);
        await context.SaveChangesAsync();
        return await GetByIdAsync(request.Id);
    }

    public async Task<UserRequest> GetByIdAsync(string id)
    {
        var request = await context.UserRequests
            .Include(r => r.FromUser)
            .Include(r => r.ToUser)
            .Include(r => r.Group)
            .FirstOrDefaultAsync(r => r.Id == id);

        return request ?? throw new InvalidOperationException($"Request with id {id} not found.");
    }

    public async Task<IReadOnlyList<UserRequest>> GetInboxAsync(string toUserId)
    {
        var recentCutoff = DateTime.UtcNow.AddDays(-30);

        return await context.UserRequests
            .Include(r => r.FromUser)
            .Include(r => r.ToUser)
            .Include(r => r.Group)
            .Where(r => r.ToUserId == toUserId &&
                        (r.Status == UserRequestStatuses.Pending ||
                         (r.RespondedAt != null && r.RespondedAt >= recentCutoff)))
            .OrderByDescending(r => r.Status == UserRequestStatuses.Pending)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<bool> ExistsPendingGroupInviteAsync(string fromUserId, string toUserId, string groupId)
    {
        return await context.UserRequests.AnyAsync(r =>
            r.FromUserId == fromUserId &&
            r.ToUserId == toUserId &&
            r.GroupId == groupId &&
            r.Type == UserRequestTypes.GroupInvite &&
            r.Status == UserRequestStatuses.Pending);
    }

    public async Task<UserRequest> UpdateAsync(UserRequest request)
    {
        await context.SaveChangesAsync();
        return await GetByIdAsync(request.Id);
    }
}
