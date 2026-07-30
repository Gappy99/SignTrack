using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Domain.Entities;

public class Contact
{
    [Key]
    [MaxLength(16)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string ContactUserId { get; set; } = string.Empty;

    [Required]
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public User ContactUser { get; set; } = null!;
}
