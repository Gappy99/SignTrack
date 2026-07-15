using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs;

public class UpdateUserRoleDto
{
    [Required(ErrorMessage = "El nombre del rol es requerido")]
    public string RoleName { get; set; } = string.Empty;
}