using SignTrack.Identity.Application.DTOs.Groups;
using SignTrack.Identity.Application.Exceptions;
using SignTrack.Identity.Application.Interfaces;
using SignTrack.Identity.Application.Services;
using SignTrack.Identity.Domain.Constants;
using SignTrack.Identity.Domain.Entities;
using SignTrack.Identity.Domain.Interfaces;

namespace SignTrack.Identity.Application.Services;

public class GroupService(IGroupRepository groups, IUserRepository users) : IGroupService
{
    public async Task<GroupResponseDto> CreateGroupAsync(string userId, CreateGroupDto dto)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("Invalid userId", nameof(userId));

        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new ArgumentException("Group name is required", nameof(dto));

        await users.GetByIdAsync(userId);

        var now = DateTime.UtcNow;
        var group = new TeamGroup
        {
            Id = UuidGenerator.GenerateGroupId(),
            Name = dto.Name.Trim(),
            CreatedByUserId = userId,
            CreatedAt = now,
            UpdatedAt = now
        };

        var ownerMember = new TeamGroupMember
        {
            Id = UuidGenerator.GenerateMemberId(),
            GroupId = group.Id,
            UserId = userId,
            Role = TeamGroupMemberRoles.Owner,
            JoinedAt = now
        };

        var created = await groups.CreateAsync(group, ownerMember);
        return MapToGroupResponseDto(created, includeMembers: true);
    }

    public async Task<IReadOnlyList<GroupResponseDto>> GetMyGroupsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("Invalid userId", nameof(userId));

        var userGroups = await groups.GetByUserIdAsync(userId);
        return userGroups.Select(g => MapToGroupResponseDto(g, includeMembers: false)).ToList();
    }

    public async Task<GroupResponseDto> GetGroupDetailAsync(string groupId, string userId)
    {
        if (string.IsNullOrWhiteSpace(groupId))
            throw new ArgumentException("Invalid groupId", nameof(groupId));
        if (string.IsNullOrWhiteSpace(userId))
            throw new ArgumentException("Invalid userId", nameof(userId));

        if (!await groups.IsMemberAsync(groupId, userId))
            throw new UnauthorizedAccessException("You are not a member of this group");

        var group = await groups.GetByIdAsync(groupId);
        return MapToGroupResponseDto(group, includeMembers: true);
    }

    public async Task<GroupResponseDto> AddMemberAsync(string groupId, string ownerUserId, AddGroupMemberDto dto)
    {
        if (string.IsNullOrWhiteSpace(groupId))
            throw new ArgumentException("Invalid groupId", nameof(groupId));
        if (string.IsNullOrWhiteSpace(ownerUserId))
            throw new ArgumentException("Invalid ownerUserId", nameof(ownerUserId));
        if (string.IsNullOrWhiteSpace(dto.UserId))
            throw new ArgumentException("Invalid userId", nameof(dto));

        if (!await groups.IsOwnerAsync(groupId, ownerUserId))
            throw new UnauthorizedAccessException("Only group owners can add members");

        if (await groups.IsMemberAsync(groupId, dto.UserId))
            throw new BusinessException(ErrorCodes.MEMBER_ALREADY_EXISTS, "User is already a member of this group");

        await users.GetByIdAsync(dto.UserId);

        var member = new TeamGroupMember
        {
            Id = UuidGenerator.GenerateMemberId(),
            GroupId = groupId,
            UserId = dto.UserId,
            Role = TeamGroupMemberRoles.Member,
            JoinedAt = DateTime.UtcNow
        };

        await groups.AddMemberAsync(member);
        var group = await groups.GetByIdAsync(groupId);
        return MapToGroupResponseDto(group, includeMembers: true);
    }

    public async Task RemoveMemberAsync(string groupId, string ownerUserId, string targetUserId)
    {
        if (string.IsNullOrWhiteSpace(groupId))
            throw new ArgumentException("Invalid groupId", nameof(groupId));
        if (string.IsNullOrWhiteSpace(ownerUserId))
            throw new ArgumentException("Invalid ownerUserId", nameof(ownerUserId));
        if (string.IsNullOrWhiteSpace(targetUserId))
            throw new ArgumentException("Invalid targetUserId", nameof(targetUserId));

        if (!await groups.IsOwnerAsync(groupId, ownerUserId))
            throw new UnauthorizedAccessException("Only group owners can remove members");

        var targetMember = await groups.GetMemberAsync(groupId, targetUserId)
            ?? throw new InvalidOperationException($"Member with userId {targetUserId} not found in group {groupId}.");

        if (targetMember.Role == TeamGroupMemberRoles.Owner)
        {
            var ownerCount = await groups.GetOwnerCountAsync(groupId);
            if (ownerCount <= 1)
                throw new InvalidOperationException("Cannot remove the only owner of the group");
        }

        await groups.RemoveMemberAsync(groupId, targetUserId);
    }

    private static GroupResponseDto MapToGroupResponseDto(TeamGroup group, bool includeMembers)
    {
        return new GroupResponseDto
        {
            Id = group.Id,
            Name = group.Name,
            CreatedByUserId = group.CreatedByUserId,
            CreatedAt = group.CreatedAt,
            UpdatedAt = group.UpdatedAt,
            Members = includeMembers
                ? group.Members
                    .OrderByDescending(m => m.Role == TeamGroupMemberRoles.Owner)
                    .ThenBy(m => m.JoinedAt)
                    .Select(m => new GroupMemberResponseDto
                    {
                        Id = m.Id,
                        UserId = m.UserId,
                        Username = m.User?.Username ?? string.Empty,
                        Name = m.User?.Name ?? string.Empty,
                        Surname = m.User?.Surname ?? string.Empty,
                        Role = m.Role,
                        JoinedAt = m.JoinedAt
                    })
                    .ToList()
                : []
        };
    }
}
