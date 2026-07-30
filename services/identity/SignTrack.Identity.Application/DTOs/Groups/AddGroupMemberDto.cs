using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs.Groups;

public class AddGroupMemberDto
{
    [Required]
    [MaxLength(16)]
    public string UserId { get; set; } = string.Empty;
}
