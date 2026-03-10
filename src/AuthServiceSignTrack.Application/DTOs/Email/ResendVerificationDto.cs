using System.ComponentModel.DataAnnotations;

namespace AuthServiceSignTrack.Application.DTOs.Email;

public class ResendVerificationDto
{
    [Required(ErrorMessage = "El email es requerido")]
    [EmailAddress(ErrorMessage = "Formato de email no válido")]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}