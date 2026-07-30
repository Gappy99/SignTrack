using SignTrack.Identity.Domain.Entities;

namespace SignTrack.Identity.Domain.Interfaces;

public interface IGroupRepository
{
    Task<TeamGroup> CreateAsync(TeamGroup group, TeamGroupMember ownerMember);
    Task<TeamGroup> GetByIdAsync(string id);
    Task<IReadOnlyList<TeamGroup>> GetByUserIdAsync(string userId);
    Task<bool> IsMemberAsync(string groupId, string userId);
    Task<bool> IsOwnerAsync(string groupId, string userId);
    Task<TeamGroupMember?> GetMemberAsync(string groupId, string userId);
    Task<int> GetOwnerCountAsync(string groupId);
    Task<TeamGroupMember> AddMemberAsync(TeamGroupMember member);
    Task RemoveMemberAsync(string groupId, string userId);
}
