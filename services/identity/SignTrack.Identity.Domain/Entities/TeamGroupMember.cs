using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Domain.Entities;

public class TeamGroupMember
{
    [Key]
    [MaxLength(16)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string GroupId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Role { get; set; } = string.Empty;

    [Required]
    public DateTime JoinedAt { get; set; }

    public TeamGroup Group { get; set; } = null!;
    public User User { get; set; } = null!;
}
