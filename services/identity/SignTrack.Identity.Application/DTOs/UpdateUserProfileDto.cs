using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs;

public class UpdateUserProfileDto
{
    [MaxLength(25)]
    public string? Name { get; set; }

    [MaxLength(25)]
    public string? Surname { get; set; }

    [StringLength(8, MinimumLength = 8, ErrorMessage = "El teléfono debe tener exactamente 8 dígitos")]
    [RegularExpression(@"^\d{8}$", ErrorMessage = "El teléfono solo debe contener números")]
    public string? Phone { get; set; }

    /// <summary>Ruta o clave de la imagen en Cloudinary (manejado por el servicio).</summary>
    [MaxLength(512)]
    public string? ProfilePicture { get; set; }
}
