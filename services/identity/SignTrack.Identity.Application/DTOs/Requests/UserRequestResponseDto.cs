namespace SignTrack.Identity.Application.DTOs.Requests;

public class UserRequestResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string FromUserId { get; set; } = string.Empty;
    public string FromUsername { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public string? GroupName { get; set; }
    public string? Message { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? RespondedAt { get; set; }
}
