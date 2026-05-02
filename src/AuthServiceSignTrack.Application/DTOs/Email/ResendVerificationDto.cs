using System.ComponentModel.DataAnnotations;

namespace AuthServiceSignTrack.Application.DTOs.Email;

public class ResendVerificationDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}