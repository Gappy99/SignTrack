using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs;

public class LoginDto
{
    [Required(ErrorMessage = "Email o usuario es requerido")]
    [MaxLength(256)]
    public string EmailOrUsername { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida")]
    [MaxLength(256)]
    public string Password { get; set; } = string.Empty;
}