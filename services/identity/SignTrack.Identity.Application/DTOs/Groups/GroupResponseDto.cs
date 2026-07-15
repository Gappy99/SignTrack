namespace SignTrack.Identity.Application.DTOs.Groups;

public class GroupResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CreatedByUserId { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public IReadOnlyList<GroupMemberResponseDto> Members { get; set; } = [];
}
