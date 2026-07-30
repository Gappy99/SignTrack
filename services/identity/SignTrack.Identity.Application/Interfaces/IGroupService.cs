using SignTrack.Identity.Application.DTOs.Groups;
using SignTrack.Identity.Application.DTOs.Requests;

namespace SignTrack.Identity.Application.Interfaces;

public interface IGroupService
{
    Task<GroupResponseDto> CreateGroupAsync(string userId, CreateGroupDto dto);
    Task<IReadOnlyList<GroupResponseDto>> GetMyGroupsAsync(string userId);
    Task<GroupResponseDto> GetGroupDetailAsync(string groupId, string userId);
    Task<GroupResponseDto> AddMemberAsync(string groupId, string ownerUserId, AddGroupMemberDto dto);
    Task RemoveMemberAsync(string groupId, string ownerUserId, string targetUserId);
}
