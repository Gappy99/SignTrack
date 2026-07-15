using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs.Requests;

public class CreateUserRequestDto
{
    [Required]
    [MaxLength(16)]
    public string ToUserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(16)]
    public string? GroupId { get; set; }

    [MaxLength(500)]
    public string? Message { get; set; }
}
