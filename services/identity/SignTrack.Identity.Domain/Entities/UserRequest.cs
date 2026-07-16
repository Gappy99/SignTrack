using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Domain.Entities;

public class UserRequest
{
    [Key]
    [MaxLength(16)]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string FromUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(16)]
    public string ToUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string Status { get; set; } = string.Empty;

    [MaxLength(16)]
    public string? GroupId { get; set; }

    [MaxLength(16)]
    public string? AppointmentId { get; set; }

    [MaxLength(500)]
    public string? Message { get; set; }

    [Required]
    public DateTime CreatedAt { get; set; }

    public DateTime? RespondedAt { get; set; }

    public User FromUser { get; set; } = null!;
    public User ToUser { get; set; } = null!;
    public TeamGroup? Group { get; set; }
    public Appointment? Appointment { get; set; }
}
