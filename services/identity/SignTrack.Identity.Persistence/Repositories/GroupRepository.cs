using SignTrack.Identity.Domain.Constants;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;
using SignTrack.Identity.Persistence.Data;
using Microsoft.EntityFrameworkCore;

namespace SignTrack.Identity.Persistence.Repositories;

public class GroupRepository(ApplicationDbContext context) : IGroupRepository
{
    public async Task<TeamGroup> CreateAsync(TeamGroup group, TeamGroupMember ownerMember)
    {
        context.TeamGroups.Add(group);
        context.TeamGroupMembers.Add(ownerMember);
        await context.SaveChangesAsync();
        return await GetByIdAsync(group.Id);
    }

    public async Task<TeamGroup> GetByIdAsync(string id)
    {
        var group = await context.TeamGroups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == id);

        return group ?? throw new InvalidOperationException($"Group with id {id} not found.");
    }

    public async Task<IReadOnlyList<TeamGroup>> GetByUserIdAsync(string userId)
    {
        return await context.TeamGroups
            .Include(g => g.Members)
                .ThenInclude(m => m.User)
            .Where(g => g.Members.Any(m => m.UserId == userId))
            .OrderByDescending(g => g.UpdatedAt)
            .ToListAsync();
    }

    public async Task<bool> IsMemberAsync(string groupId, string userId)
    {
        return await context.TeamGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId);
    }

    public async Task<bool> IsOwnerAsync(string groupId, string userId)
    {
        return await context.TeamGroupMembers
            .AnyAsync(m => m.GroupId == groupId && m.UserId == userId && m.Role == TeamGroupMemberRoles.Owner);
    }

    public async Task<TeamGroupMember?> GetMemberAsync(string groupId, string userId)
    {
        return await context.TeamGroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId);
    }

    public async Task<int> GetOwnerCountAsync(string groupId)
    {
        return await context.TeamGroupMembers
            .CountAsync(m => m.GroupId == groupId && m.Role == TeamGroupMemberRoles.Owner);
    }

    public async Task<TeamGroupMember> AddMemberAsync(TeamGroupMember member)
    {
        context.TeamGroupMembers.Add(member);
        await context.SaveChangesAsync();
        return member;
    }

    public async Task RemoveMemberAsync(string groupId, string userId)
    {
        var member = await context.TeamGroupMembers
            .FirstOrDefaultAsync(m => m.GroupId == groupId && m.UserId == userId)
            ?? throw new InvalidOperationException($"Member with userId {userId} not found in group {groupId}.");

        context.TeamGroupMembers.Remove(member);
        await context.SaveChangesAsync();
    }
}
