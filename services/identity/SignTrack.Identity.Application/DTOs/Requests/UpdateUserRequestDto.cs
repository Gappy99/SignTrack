using System.ComponentModel.DataAnnotations;

namespace SignTrack.Identity.Application.DTOs.Requests;

public class UpdateUserRequestDto
{
    [Required]
    [MaxLength(10)]
    public string Status { get; set; } = string.Empty;
}
