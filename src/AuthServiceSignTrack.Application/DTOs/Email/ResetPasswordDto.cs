using System.ComponentModel.DataAnnotations;

namespace AuthServiceSignTrack.Application.DTOs.Email;

public class ResetPasswordDto
{
    [Required(ErrorMessage = "El token de restablecimiento es requerido")]
    [MaxLength(512)]
    public string Token { get; set; } = string.Empty;

    [Required(ErrorMessage = "La nueva contraseña es requerida")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
    [MaxLength(256)]
    public string NewPassword { get; set; } = string.Empty;
}