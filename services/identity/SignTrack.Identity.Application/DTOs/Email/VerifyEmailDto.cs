using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs.Email;

public class VerifyEmailDto
{
    [Required(ErrorMessage = "El token de verificación es requerido")]
    [MaxLength(512)]
    public string Token { get; set; } = string.Empty;
}