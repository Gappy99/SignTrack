using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Domain.Entities;

public class TeamGroup
{
    [Key]
    [MaxLength(16)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string CreatedByUserId { get; set; } = string.Empty;

    [Required]
    public DateTime CreatedAt { get; set; }

    [Required]
    public DateTime UpdatedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
    public ICollection<TeamGroupMember> Members { get; set; } = [];
}
